// =============================================================================
// work-blueprints-merger.ts — PR-3
//
// 把 work.md 中声明的 blueprint ref 列表 → 合并成 per-work `blueprints.json`（slim）。
//
// slim 内容：name / version / slots[{name, deps, observe}] / sourceHash
//   - 不展开 prop 列表（决策不需要）
//   - 不展开 slot 的 description（也不需要；slim 哲学）
//   - 不递归 part/probe 内容（那是 Proof 轴的事）
//
// 与 work-domains-merger 对称设计。
// =============================================================================

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join, relative } from 'path'
import { z } from 'zod'
import { parseOxnReference } from '@openxenon/engine/oxl/scope/oxn-scope'
import { BOUNDARY_DIR, WORK_BLUEPRINTS_JSON } from '@openxenon/engine/kernel'
import { resolveAssetCandidates } from '@openxenon/engine/infra/paths'
import { hashText, hashFile } from './plan-hash'

// ───────── Zod schema ─────────

export const SlotSlimSchema = z.object({
  name: z.string().min(1),
  deps: z.array(z.string()).default([]),
  observe: z.array(z.string()).default([]),
})

export const BoundaryRefSlimSchema = z.object({
  name: z.string().min(1),
  // 🆕 Phase B: kind 加 'blueprint'（nestedBlueprintRefs 使用）
  kind: z.enum(['domain', 'stack', 'workflow', 'blueprint']).default('domain'),
  ref: z.string().min(1),
  scope: z.enum(['@oxn', '@prj']).default('@prj'),
  version: z.number().int().min(1).default(1),
  // 🆕 v0.6.1-alpha.4 Phase B.5: fileHash 必填（BoundaryRefEntry 一致；parseBlueprintSlim 真实计算）
  fileHash: z.string().regex(/^[0-9a-f]{64}$/),
})

export const PerWorkBlueprintEntrySchema = z.object({
  name: z.string().min(1),
  scope: z.enum(['@oxn', '@prj']),
  file: z.string().min(1),
  status: z.enum(['ok', 'invalid']),
  version: z.number().int().min(1).default(1),
  slots: z.array(SlotSlimSchema).default([]),
  errors: z.array(z.string()).default([]),
  ref: z.string().min(1),
  // 🆕 v0.6.1-alpha.3 Phase 1: Blueprint 组合的 3 边界 slim refs
  domainRefs: z.array(BoundaryRefSlimSchema).default([]),
  workflowRefs: z.array(BoundaryRefSlimSchema).default([]),
  stackRefs: z.array(BoundaryRefSlimSchema).default([]),
  // 🆕 嵌套 Blueprint ref（可组合）
  nestedBlueprintRefs: z.array(BoundaryRefSlimSchema).default([]),
})

export const PerWorkBlueprintsIndexSchema = z.object({
  schemaVersion: z.literal(1),
  workName: z.string().min(1),
  generatedAt: z.string().min(1),
  projectRoot: z.string().min(1),
  sourceHash: z.string().regex(/^[0-9a-f]{64}$/),
  declaredRefs: z.array(z.string()),
  blueprintCount: z.number().int().min(0),
  invalidCount: z.number().int().min(0),
  blueprints: z.array(PerWorkBlueprintEntrySchema),
})

export type SlotSlim = z.infer<typeof SlotSlimSchema>
export type PerWorkBlueprintEntry = z.infer<typeof PerWorkBlueprintEntrySchema>
export type PerWorkBlueprintsIndex = z.infer<typeof PerWorkBlueprintsIndexSchema>

// ───────── ref 提取（与 domains merger 对称）─────────

export interface DeclaredBlueprintRef {
  name: string
  ref: string | null
}

export function extractBlueprintRefs(workOxnContent: string): DeclaredBlueprintRef[] {
  const out: DeclaredBlueprintRef[] = []
  // 不要求行首（允许 `work "x" { blueprint "Y" ref "Z"; }` 内联）
  // 用 `;` 终止符做 disambiguate：task 内的 `blueprint "Z"` 无 `;` 不会误匹配
  const re = /blueprint\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g
  for (const m of workOxnContent.matchAll(re)) {
    out.push({ name: m[1]!, ref: m[2] ?? null })
  }
  return out
}

// ───────── ref → file 解析 ─────────

export function resolveBlueprintFile(
  ref: string | null,
  name: string,
  projectRoot: string,
): { scope: '@oxn' | '@prj'; filePath: string } | null {
  // v0.6.1-alpha.3: Phase 1 — Work 的 "blueprint" 引用实际指 Workflow 目录（slots/deps/observe 模板）。
  // 同时保留 v0.6.1-alpha.2 前的 blueprints/ 目录 fallback（兼容历史 work.md）。
  const { primary: wfPrimary, fallback: wfFallback } = resolveAssetCandidates(projectRoot, 'workflow')
  const { primary: bpPrimary, fallback: bpFallback } = resolveAssetCandidates(projectRoot, 'blueprint')
  const candidates = (n: string): string[] => {
    const kebab = toKebab(n)
    return [
      // 优先 workflow 目录（Phase 1 后的标准位置）
      join(wfPrimary, `${n}.md`),
      join(wfPrimary, `${kebab}.md`),
      join(wfFallback, `${n}.md`),
      join(wfFallback, `${kebab}.md`),
      // blueprints 目录 fallback（兼容历史 work.md + 未来组合模板）
      join(bpPrimary, `${n}.md`),
      join(bpPrimary, `${kebab}.md`),
      join(bpFallback, `${n}.md`),
      join(bpFallback, `${kebab}.md`),
    ]
  }

  if (ref) {
    const parsed = parseOxnReference(ref)
    if (parsed) {
      if (parsed.scope === 'oxn') return null
      for (const fp of candidates(parsed.name)) {
        if (existsSync(fp)) return { scope: '@prj', filePath: fp }
      }
      return null
    }
  }
  for (const fp of candidates(name)) {
    if (existsSync(fp)) return { scope: '@prj', filePath: fp }
  }
  return null
}

/**
 * 🆕 v0.6.1-alpha.4 Phase B.5: 解析 Boundary 类型资产文件路径（domain/workflow/stack/blueprint）
 * 用于 parseBlueprintSlim 输出的 3 边界 ref 计算真实 fileHash。
 * 不抛错；文件不存在返回 null（fileHash 留空）。
 */
function resolveBoundaryAssetFile(
  projectRoot: string,
  kind: 'domain' | 'workflow' | 'stack' | 'blueprint',
  name: string,
): string | null {
  // 🆕 Phase B: 检查 primary + fallback 两个路径（v0.6.1-alpha.2 兼容旧布局）
  const { primary, fallback } = resolveAssetCandidates(projectRoot, kind, null)
  const kebab = toKebab(name)
  for (const dir of [primary, fallback]) {
    for (const f of [`${name}.md`, `${kebab}.md`]) {
      const fp = join(dir, f)
      if (existsSync(fp)) return fp
    }
  }
  return null
}

function toKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

// ───────── blueprint.md → slim 解析（regex-only）─────────

export interface ParsedBlueprintSlim {
  name: string | null
  version: number
  slots: SlotSlim[]
  errors: string[]
  // 🆕 v0.6.1-alpha.3 Phase 1: Blueprint 组合的 3 边界 refs + 嵌套 blueprint ref
  domainRefs: Array<{ name: string; ref: string | null }>
  workflowRefs: Array<{ name: string; ref: string | null }>
  stackRefs: Array<{ name: string; ref: string | null }>
  nestedBlueprintRefs: Array<{ name: string; ref: string | null }>
}

/**
 * 从 blueprint.md 内容提取 slim 字段。
 * 永远不抛错；错误累积在 result.errors。
 *
 * 🆕 v0.6.1-alpha.3 Phase 1: 同时提取 Blueprint body 内的 4 种 ref decl：
 *   - domain "X" ref "..."    → domainRefs[]
 *   - workflow "Y" ref "..."  → workflowRefs[]
 *   - stack "Z" ref "..."     → stackRefs[]
 *   - blueprint "W" ref "..." → nestedBlueprintRefs[]
 */
export function parseBlueprintSlim(content: string): ParsedBlueprintSlim {
  const errors: string[] = []

  const nameMatch = content.match(/^\s*blueprint\s+"([^"]+)"\s*\{/m)
  const name = nameMatch?.[1] ?? null

  // version = N（默认 1）
  let version = 1
  const verMatch = content.match(/^\s*version\s*=\s*(\d+)\s*;?/m)
  if (verMatch) {
    const n = Number.parseInt(verMatch[1]!, 10)
    if (Number.isFinite(n) && n >= 1) version = n
    else errors.push(`invalid version: ${verMatch[1]}`)
  }

  // slots[] —— 块状或内联
  const slots: SlotSlim[] = []
  for (const blockMatch of content.matchAll(/slot\s+"([^"]+)"\s*\{([^}]*)\}/g)) {
    const slotName = blockMatch[1]!
    const body = blockMatch[2]!
    const slots_ = parseSlotSlim(slotName, body, errors)
    slots.push(slots_)
  }

  // 🆕 Phase 1: 提取 Blueprint body 内的 4 种 ref decl
  const extractRefs = (kind: 'domain' | 'workflow' | 'stack' | 'blueprint') => {
    const re = new RegExp(`^\\s*${kind}\\s+"([^"]+)"(?:\\s+ref\\s+"([^"]+)")?\\s*;`, 'gm')
    const out: Array<{ name: string; ref: string | null }> = []
    for (const m of content.matchAll(re)) {
      out.push({ name: m[1]!, ref: m[2] ?? null })
    }
    return out
  }
  const domainRefs = extractRefs('domain')
  const workflowRefs = extractRefs('workflow')
  const stackRefs = extractRefs('stack')
  const nestedBlueprintRefs = extractRefs('blueprint').filter((r) => r.name !== name) // 排除自引用

  // 🆕 v0.6.1-alpha.4 Phase B.6: 强制约束 — MD-native blueprint 必须引用 1 Domain + 1 Workflow + 1 Stack
  // 注意：.oxn 格式的 blueprint 已废弃（v0.7.0），仅 .md 格式支持 domain/workflow/stack refs。
  // 所以此约束仅对含 `domain "X"` 或 `## Refs` 的内容生效。
  const hasBoundaryRefs = domainRefs.length > 0 || workflowRefs.length > 0 || stackRefs.length > 0
  if (errors.length === 0 && hasBoundaryRefs) {
    if (domainRefs.length < 1) {
      errors.push('E_MD_BLUEPRINT_MISSING_DOMAIN: Blueprint must reference at least 1 Domain')
    }
    if (workflowRefs.length < 1) {
      errors.push('E_MD_BLUEPRINT_MISSING_WORKFLOW: Blueprint must reference at least 1 Workflow')
    }
    if (stackRefs.length < 1) {
      errors.push('E_MD_BLUEPRINT_MISSING_STACK: Blueprint must reference at least 1 Stack')
    }
  }

  if (!name) {
    errors.push('no `blueprint "X" { ... }` declaration found')
  }

  return {
    name,
    version,
    slots,
    errors,
    domainRefs,
    workflowRefs,
    stackRefs,
    nestedBlueprintRefs,
  }
}

function parseSlotSlim(name: string, body: string, _errors: string[]): SlotSlim {
  // deps = ["a", "b"]  (数组形式)
  // 不锚定 ^ —— slot body 内可能有 `deps = []; observe = [...]` 同行的多字段
  // slot body 由 slot { ... } 包裹，边界已隔离；多个 deps/observe 块取最后匹配的
  const deps: string[] = []
  const depsMatch = body.match(/deps\s*=\s*\[([^\]]*)\]/)
  if (depsMatch) {
    for (const m of depsMatch[1]!.matchAll(/"([^"]+)"/g)) {
      deps.push(m[1]!)
    }
  }
  // observe = ["fs-match"]
  const observe: string[] = []
  const obsMatch = body.match(/observe\s*=\s*\[([^\]]*)\]/)
  if (obsMatch) {
    for (const m of obsMatch[1]!.matchAll(/"([^"]+)"/g)) {
      observe.push(m[1]!)
    }
  }
  return { name, deps, observe }
}

// ───────── 顶层：构建 per-work blueprints index ─────────

export interface BuildPerWorkBlueprintsOptions {
  projectRoot: string
  workName: string
  workMdPath: string
  /** 覆盖 generatedAt（测试用） */
  generatedAt?: string
}

export function buildPerWorkBlueprintsIndex(options: BuildPerWorkBlueprintsOptions): PerWorkBlueprintsIndex {
  const { projectRoot, workName, workMdPath } = options
  const generatedAt = options.generatedAt ?? new Date().toISOString()

  if (!existsSync(workMdPath)) {
    throw new Error(`work.md not found at ${workMdPath}`)
  }
  const content = readFileSync(workMdPath, 'utf-8')
  const sourceHash = hashText(content)
  const declared = extractBlueprintRefs(content)

  const seen = new Set<string>()
  const uniqueRefs: string[] = []
  const uniqueDeclared: DeclaredBlueprintRef[] = []
  for (const d of declared) {
    if (seen.has(d.name)) continue
    seen.add(d.name)
    // v0.6.1-alpha.3: Phase 1 — 默认 ref 指向 workflows/（不是 blueprints/）
    uniqueRefs.push(d.ref ?? `@prj/workflows/${d.name}`)
    uniqueDeclared.push(d)
  }

  const blueprints: PerWorkBlueprintEntry[] = []
  for (const decl of uniqueDeclared) {
    const resolved = resolveBlueprintFile(decl.ref, decl.name, projectRoot)
    const refStr = decl.ref ?? `@prj/workflows/${decl.name}`

    if (!resolved) {
      const errors: string[] = []
      if (decl.ref?.startsWith('@oxn/')) {
        errors.push('@oxn/ scope has no builtin blueprint registry (V1)')
      } else {
        errors.push(`blueprint file not found for ref "${refStr}"`)
      }
      blueprints.push({
        name: decl.name,
        scope: decl.ref?.startsWith('@oxn/') ? '@oxn' : '@prj',
        file: '(unresolved)',
        status: 'invalid',
        version: 1,
        slots: [],
        errors,
        ref: refStr,
        domainRefs: [],
        workflowRefs: [],
        stackRefs: [],
        nestedBlueprintRefs: [],
      })
      continue
    }

    let bpContent: string
    try {
      bpContent = readFileSync(resolved.filePath, 'utf-8')
    } catch (err) {
      blueprints.push({
        name: decl.name,
        scope: resolved.scope,
        file: relative(projectRoot, resolved.filePath),
        status: 'invalid',
        version: 1,
        slots: [],
        errors: [`read failed: ${err instanceof Error ? err.message : String(err)}`],
        ref: refStr,
        domainRefs: [],
        workflowRefs: [],
        stackRefs: [],
        nestedBlueprintRefs: [],
      })
      continue
    }

    const slim = parseBlueprintSlim(bpContent)
    // 🆕 Phase 1 + B: 把 Blueprint ## Refs 中的 3 边界 + 嵌套 Blueprint 转为 slim refs
    // Phase B.5: 真实计算 fileHash（resolve 每个 ref 对应文件 + hash）
    const toSlim = (rs: Array<{ name: string; ref: string | null }>, kind: 'domain' | 'workflow' | 'stack') =>
      rs.map((r) => {
        const refStr =
          r.ref ?? `@prj/${kind === 'workflow' ? 'workflows' : kind === 'domain' ? 'domains' : 'stack'}/${r.name}`
        // 🆕 Phase B.5: 真实计算 ref 文件的 fileHash
        const refFile = resolveBoundaryAssetFile(projectRoot, kind, r.name)
        const fileHash = refFile ? hashFile(refFile) : null
        return {
          name: r.name,
          kind,
          ref: refStr,
          scope: (r.ref?.startsWith('@oxn/') ? '@oxn' : '@prj') as '@oxn' | '@prj',
          version: 1,
          fileHash: fileHash ?? '', // 🆕 Phase B.5: fileHash 必填；ref 文件不存在则空字符串（drift 检测会捕获）
        }
      })
    const toBlueprintSlim = (rs: Array<{ name: string; ref: string | null }>) =>
      rs.map((r) => {
        const refStr = r.ref ?? `@prj/blueprints/${r.name}`
        const refFile = resolveBoundaryAssetFile(projectRoot, 'blueprint', r.name)
        const fileHash = refFile ? hashFile(refFile) : null
        return {
          name: r.name,
          kind: 'blueprint' as const,
          ref: refStr,
          scope: (r.ref?.startsWith('@oxn/') ? '@oxn' : '@prj') as '@oxn' | '@prj',
          version: 1,
          fileHash: fileHash ?? '',
        }
      })
    blueprints.push({
      name: decl.name,
      scope: resolved.scope,
      file: relative(projectRoot, resolved.filePath),
      status: slim.errors.length > 0 ? 'invalid' : 'ok',
      version: slim.version,
      slots: slim.slots,
      errors: slim.errors,
      ref: refStr,
      domainRefs: toSlim(slim.domainRefs, 'domain'),
      workflowRefs: toSlim(slim.workflowRefs, 'workflow'),
      stackRefs: toSlim(slim.stackRefs, 'stack'),
      nestedBlueprintRefs: toBlueprintSlim(slim.nestedBlueprintRefs),
    })
  }

  const invalidCount = blueprints.filter((b) => b.status === 'invalid').length
  return {
    schemaVersion: 1,
    workName,
    generatedAt,
    projectRoot,
    sourceHash,
    declaredRefs: uniqueRefs,
    blueprintCount: blueprints.length,
    invalidCount,
    blueprints,
  }
}

// ───────── 落盘 ─────────

export interface WritePerWorkBlueprintsOptions extends BuildPerWorkBlueprintsOptions {
  outPath: string
}

export function writePerWorkBlueprintsIndex(options: WritePerWorkBlueprintsOptions): PerWorkBlueprintsIndex {
  const idx = buildPerWorkBlueprintsIndex(options)
  const { outPath } = options
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmpPath = `${outPath}.tmp`
  writeFileSync(tmpPath, JSON.stringify(idx, null, 2), 'utf-8')
  renameSync(tmpPath, outPath)
  return idx
}

export function loadPerWorkBlueprintsIndex(filePath: string): PerWorkBlueprintsIndex | null {
  if (!existsSync(filePath)) return null
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
    const result = PerWorkBlueprintsIndexSchema.safeParse(parsed)
    if (!result.success) return null
    return result.data
  } catch {
    return null
  }
}

// ───────── 路径工具 ─────────

export function getPerWorkBlueprintsJsonPath(projectRoot: string, workName: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works', workName, WORK_BLUEPRINTS_JSON)
}
