/**
 * Asset module — diff use case (v0.6.2-alpha.0)
 *
 * 对比项目 Asset vs builtin 默认：
 * - 项目存在 + builtin 不存在 → "项目独有"
 * - 项目不存在 + builtin 存在 → "未 override"
 * - 都存在 → 输出 unified diff
 * - 都不存在 → 报错
 *
 * v0.6.2 限制：
 * - builtin registry 当前只覆盖 blueprint 种类（probes + blueprints in src/builtin/）
 * - domain/workflow/stack/roadmap 的 builtin 暂为空（src/builtin/{kind}/ 目录不存在）
 * - diff 对这些 kind 总是 "未 override"
 *
 * L0–L3 兼容性：
 * - L1-Infra 层
 * - 不 import L0-Processor / L2-Work / L3
 */

import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { resolveAssetFile } from './internal/resolver'
import { getBuiltinRegistry } from '@openxenon/engine/oxl/scope/oxn-builtin-registry'
import type { DiffInput, DiffResult } from './types'
import type { ProjectConfig } from '@openxenon/engine/infra/paths'

/**
 * 简单 unified diff 算法（line-based LCS）
 */
function unifiedDiff(a: string, b: string, fromLabel: string, toLabel: string): string {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const lines: string[] = [`--- ${fromLabel}`, `+++ ${toLabel}`]

  // 用最简单的方式：逐行扫描，标注 - 和 +
  // 实际不做 LCS（避免引入更大依赖）；适合小文件（Blueprint 通常 < 100 行）
  const max = Math.max(aLines.length, bLines.length)
  for (let i = 0; i < max; i++) {
    const aLine = aLines[i]
    const bLine = bLines[i]
    if (aLine === bLine) {
      lines.push(` ${aLine ?? ''}`)
    } else {
      if (aLine !== undefined) lines.push(`-${aLine}`)
      if (bLine !== undefined) lines.push(`+${bLine}`)
    }
  }
  return lines.join('\n')
}

export async function diff(input: DiffInput, config?: ProjectConfig | null): Promise<DiffResult> {
  const { kind, name, projectRoot, format = 'unified' } = input
  const cfg = config ?? null

  // 1. 解析项目 Asset 路径
  const projectPath = resolveAssetFile(projectRoot, kind, name, 'md', cfg)
  const projectExists = existsSync(projectPath)
  const projectContent = projectExists ? readFileSync(projectPath, 'utf-8') : null

  // 2. 解析 builtin Asset
  const builtinRegistry = getBuiltinRegistry()
  const builtinDir = builtinRegistry.getBuiltinDir()

  let builtinContent: string | null = null
  let builtinExists = false

  // 使用 builtin registry 的 readBuiltinAsset API（v0.6.2 I-4 引入）
  const builtinRaw = builtinRegistry.readBuiltinAsset(kind, name)
  if (builtinRaw !== null) {
    builtinContent = builtinRaw
    builtinExists = true
  }

  // 3. 各种情况处理
  if (!projectExists && !builtinExists) {
    return {
      ok: false,
      hasOverride: false,
      hasBuiltin: false,
      diff: '',
      message: `Asset '${name}' (${kind}) does not exist in project or builtin`,
    }
  }

  if (projectExists && !builtinExists) {
    return {
      ok: true,
      hasOverride: true,
      hasBuiltin: false,
      diff: '',
      message: `Asset '${name}' (${kind}) exists in project only (no builtin default to compare against)`,
    }
  }

  if (!projectExists && builtinExists) {
    return {
      ok: true,
      hasOverride: false,
      hasBuiltin: true,
      diff: builtinContent ?? '',
      message: `Asset '${name}' (${kind}) exists in builtin only (project has no override). Displaying builtin content for reference.`,
    }
  }

  // 双方都存在：比较
  if (projectContent === builtinContent) {
    return {
      ok: true,
      hasOverride: false,
      hasBuiltin: true,
      diff: '',
      message: `Asset '${name}' (${kind}) is identical to builtin default`,
    }
  }

  // 输出 diff
  if (format === 'json') {
    return {
      ok: true,
      hasOverride: true,
      hasBuiltin: true,
      diff: {
        builtinPath: `${builtinDir}/${kind === 'blueprint' ? 'blueprints' : `${kind}s`}/${name}.md`,
        projectPath,
        builtinBytes: builtinContent?.length ?? 0,
        projectBytes: projectContent?.length ?? 0,
        identical: false,
      },
      message: `Asset '${name}' (${kind}) differs from builtin default`,
    }
  }

  const unifiedDiffStr = unifiedDiff(
    builtinContent ?? '',
    projectContent ?? '',
    `builtin/${kind}/${name}`,
    `project/${kind}/${name}`,
  )

  return {
    ok: true,
    hasOverride: true,
    hasBuiltin: true,
    diff: unifiedDiffStr,
    message: `Asset '${name}' (${kind}) differs from builtin default`,
  }
}
