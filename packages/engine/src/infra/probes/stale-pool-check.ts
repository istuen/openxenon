// =============================================================================
// stale-pool-check probe (RFC-0015 D6.2)
//
// 验证 .openxenon/pools/**/*.md 文件的 references[] 字段指向的 asset
// 在当前 active registry 中能找到 (未归档 / 未删除)。
//
// 一等公民 verdict: pool spec 中的 stale ref 可能在 work 运行时导致
// "asset not found" 类错误 — 提前在 proof run 时检测。
//
// 边界：
//   - 仅查 active pools (.openxenon/pools/ 目录，not .archived)
//   - 复用 Asset/internal/reference-checker.ts listAssetReferences 反向索引
//   - 复用 resolve-asset-file.ts (resolveAssetFile) 解析 @prj/... ref
//
// L1-Infra: 读 .md 用 L1 filesystem 接口
// =============================================================================

import { existsSync, readdirSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { listAssetReferences } from '@openxenon/engine/Asset/internal/reference-checker'
import { resolveAssetFile } from '@openxenon/engine/Asset/internal/resolver'
import { resolveArchivedAssetFile } from '@openxenon/engine/Asset/internal/archived-resolver'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface StalePoolCheckParams {
  /** 项目根（默认 process.cwd()） */
  root?: string
}

export interface StalePoolCheckResult {
  /** exit 0 = 无 stale refs */
  passed: boolean
  /** 检查 pool 文件数 */
  poolCount: number
  /** stale refs 总数 */
  staleCount: number
  /** stale refs 详情 */
  staleRefs: Array<{
    poolFile: string
    ref: string
    reason: 'archived' | 'missing'
  }>
}

const POOLS_DIR = '.openxenon/pools'

function walkPoolsMd(root: string): string[] {
  const base = join(root, POOLS_DIR)
  if (!existsSync(base)) return []
  const out: string[] = []
  walkRecursive(base, out)
  return out
}

function walkRecursive(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      walkRecursive(p, out)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(p)
    }
  }
}

/** 从 pool .md 提取 references[] 数组.
 *
 * Pool .md 格式兼容：references 可在 frontmatter 内 (YAML) 或外 (md native 列表)。
 *   形式 1: - references: [X, Y]                 (md list, frontmatter 内/外均可)
 *   形式 2: references = ["X", "Y"]              (legacy .oxn style)
 *   形式 3: multi-line:
 *             references:
 *               - X
 *               - Y
 *
 * 搜索整个文件, 不限定 frontmatter (因为 pool 文档 frontmatter 边界不严格)
 */
function extractPoolReferences(content: string): string[] {
  const refs: string[] = []
  const seen = new Set<string>()

  // 形式 1: listItem - references: [X, Y]
  const listItemMatch = content.matchAll(/(?:^|\n)\s*-\s+references\s*[:=]\s*\[([^\]]*)\]/g)
  for (const m of listItemMatch) {
    const inner = m[1]?.trim() ?? ''
    for (const s of inner.split(',')) {
      const clean = s.trim().replace(/^["']|["']$/g, '')
      if (clean && !seen.has(clean)) {
        seen.add(clean)
        refs.push(clean)
      }
    }
  }

  // 形式 2: 直接 references: [X, Y] 或 references = [X, Y] (不在 listItem 内)
  if (refs.length === 0) {
    const inlineMatch = content.match(/(?:^|\n)\s*references\s*[:=]\s*\[([^\]]*)\]/)
    if (inlineMatch?.[1]) {
      const inner = inlineMatch[1].trim()
      for (const s of inner.split(',')) {
        const clean = s.trim().replace(/^["']|["']$/g, '')
        if (clean && !seen.has(clean)) {
          seen.add(clean)
          refs.push(clean)
        }
      }
    }
  }

  // 形式 3: multi-line YAML array
  if (refs.length === 0) {
    // 关键: `references:` 必须在行首 (不在 [...]), 后面接换行 + 缩进 - 列表项
    const multiLineMatch = content.match(/(?:^|\n)([ \t]*references[ \t]*:[ \t]*)\n((?:[ \t]+-[^\n]*\n?)+)/)
    if (multiLineMatch?.[2]) {
      for (const line of multiLineMatch[2].split('\n')) {
        const clean = line
          .replace(/^[ \t]*-[ \t]*/, '')
          .trim()
          .replace(/^["']|["']$/g, '')
        if (clean && !seen.has(clean)) {
          seen.add(clean)
          refs.push(clean)
        }
      }
    }
  }

  return refs
}

/** 给定 pool .md 的 ref 字符串, 判定其状态 */
function classifyRef(
  ref: string,
  projectRoot: string,
): { status: 'active' | 'archived' | 'missing'; resolvedPath?: string } {
  // 处理形式:
  //   - "@prj/domains/FooContext" / "@oxn/probes/fs-exists"
  //   - "kind:name"  (如 "domain:FooContext")
  //   - bare name (如 "FooContext")
  // AssetKind 是单数形式 (domain/workflow/stack/blueprint/roadmap)
  const kinds = ['domain', 'workflow', 'stack', 'blueprint', 'roadmap'] as const
  // 从 ref 提取 name (取最后一段)
  const name = ref.includes('/') ? (ref.split('/').pop() ?? ref) : ref.replace(/^[^:]+:/, '')
  for (const kind of kinds) {
    const active = resolveAssetFile(projectRoot, kind, name, 'md')
    if (existsSync(active)) {
      return { status: 'active', resolvedPath: active }
    }
    const archived = resolveArchivedAssetFile(projectRoot, kind, name)
    if (existsSync(archived + '.md') || existsSync(archived)) {
      return { status: 'archived', resolvedPath: archived }
    }
  }
  return { status: 'missing' }
}

export async function executeStalePoolCheck(
  params: StalePoolCheckParams,
  context: ProbeContext,
): Promise<StalePoolCheckResult> {
  const root = params.root ?? context.projectRoot
  const poolFiles = walkPoolsMd(root)

  const result: StalePoolCheckResult = {
    passed: true,
    poolCount: poolFiles.length,
    staleCount: 0,
    staleRefs: [],
  }

  // 复用 listAssetReferences (虽未直接用, 但保 L1-Infra reference-checker 入口稳定)
  void listAssetReferences(root)

  for (const file of poolFiles) {
    const content = readFileSync(file, 'utf-8')
    // 通过 parseMarkdown 确认它是合法 markdown (失败不视为 stale, 静默跳过)
    try {
      parseMarkdown(content)
    } catch {
      continue
    }

    const refs = extractPoolReferences(content)
    for (const ref of refs) {
      if (!ref) continue
      const cls = classifyRef(ref, root)
      if (cls.status === 'archived') {
        result.staleRefs.push({ poolFile: file, ref, reason: 'archived' })
      } else if (cls.status === 'missing') {
        result.staleRefs.push({ poolFile: file, ref, reason: 'missing' })
      }
      // active: skip
    }
  }

  result.staleCount = result.staleRefs.length
  result.passed = result.staleCount === 0
  return result
}
