// =============================================================================
// stale-draft-check probe (RFC-0015 D6.2; v0.6.2 改名 + 修复)
//
// 原 stale-pool-check 验证 .openxenon/pools/**/* — 该目录已被 .openxenon/drafts/
// 替代 (v0.6.x 文档三层架构迁移), 旧实现永远返回 poolCount:0,passed:true 死代码。
//
// D6.2 修复:
//   - 改名 stale-draft-check
//   - 扫 .openxenon/drafts/**/*.md (散落 .md, 非嵌套子目录结构)
//   - 删除 void listAssetReferences 死调用 (D6.3 通用规则)
//   - 复用 Asset/internal/reference-checker.listAssetReferences 反向索引
//   - 复用 resolve-asset-file (resolveAssetFile) 解析 @prj/... ref
//
// 一等公民 verdict: draft spec 中的 stale ref 可能在 work 运行时导致
// "asset not found" 类错误 — 提前在 proof run 时检测。
//
// L1-Infra: 读 .md 用 L1 filesystem 接口
// =============================================================================

import { existsSync, readdirSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { resolveAssetFile } from '@openxenon/engine/Asset/internal/resolver'
import { resolveArchivedAssetFile } from '@openxenon/engine/Asset/internal/archived-resolver'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface StaleDraftCheckParams {
  /** 项目根（默认 process.cwd()） */
  root?: string
}

export interface StaleDraftCheckResult {
  /** exit 0 = 无 stale refs */
  passed: boolean
  /** 检查 draft 文件数 */
  draftCount: number
  /** stale refs 总数 */
  staleCount: number
  /** stale refs 详情 */
  staleRefs: Array<{
    draftFile: string
    ref: string
    reason: 'archived' | 'missing'
  }>
}

const DRAFTS_DIR = '.openxenon/drafts'

function walkDraftsMd(root: string): string[] {
  const base = join(root, DRAFTS_DIR)
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

/** 从 draft .md 提取 references[] 数组.
 *
 * Draft .md 格式兼容：references 可在 frontmatter 内 (YAML) 或外 (md native 列表)。
 *   形式 1: - references: [X, Y]                 (md list, frontmatter 内/外均可)
 *   形式 2: references = ["X", "Y"]              (legacy .oxn style)
 *   形式 3: multi-line:
 *             references:
 *               - X
 *               - Y
 *
 * 搜索整个文件, 不限定 frontmatter (因为 draft 文档 frontmatter 边界不严格)
 */
function extractDraftReferences(content: string): string[] {
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

/** 给定 draft .md 的 ref 字符串, 判定其状态 */
function classifyRef(
  ref: string,
  projectRoot: string,
): { status: 'active' | 'archived' | 'missing'; resolvedPath?: string } {
  const kinds = ['domain', 'workflow', 'stack', 'blueprint', 'roadmap'] as const
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

export async function executeStaleDraftCheck(
  params: StaleDraftCheckParams,
  context: ProbeContext,
): Promise<StaleDraftCheckResult> {
  const root = params.root ?? context.projectRoot
  const draftFiles = walkDraftsMd(root)

  const result: StaleDraftCheckResult = {
    passed: true,
    draftCount: draftFiles.length,
    staleCount: 0,
    staleRefs: [],
  }

  for (const file of draftFiles) {
    const content = readFileSync(file, 'utf-8')
    try {
      parseMarkdown(content)
    } catch {
      continue
    }

    const refs = extractDraftReferences(content)
    for (const ref of refs) {
      if (!ref) continue
      const cls = classifyRef(ref, root)
      if (cls.status === 'archived') {
        result.staleRefs.push({ draftFile: file, ref, reason: 'archived' })
      } else if (cls.status === 'missing') {
        result.staleRefs.push({ draftFile: file, ref, reason: 'missing' })
      }
    }
  }

  result.staleCount = result.staleRefs.length
  result.passed = result.staleCount === 0
  return result
}
