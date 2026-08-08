// =============================================================================
// work-blueprints-merger.ts — PR-3
//
// 把 work.md 中声明的 blueprint ref 列表 → 合并成 per-work `blueprints.json`（slim）。
//
// slim 内容：name / version / slots[{name, deps, observe, operate}] / sourceHash
//   - 不展开 prop 列表（决策不需要）
//   - 不展开 slot 的 description（也不需要；slim 哲学）
//   - 不递归 part/probe 内容（那是 Proof 轴的事）
//
// 🆕 v0.7: 同时支持 .oxn 和 .md 格式（.oxn 兼容 + .md canonical）
//   - .oxn: `blueprint "X" ref "Y";` 在 work body 内
//   - .md:  `## Use` 段下 `### name` + `- kind: blueprint` + `- ref: @prj/...`
//
// 🆕 v0.7.4 (Asset 结构 v2 收编)：Blueprint 特例识别以下结构变体：
//   - ## Use (legacy): 单 H2 段，### H3 列引用；或 - kind / - ref 平铺 list
//   - ## Use <kind> (v2): 按 Asset Type 分组的 ## Use workflow / ## Use domain / ## Use stack
//   - ## Boundaries (legacy): 单 H2 段，### H3 列 slot（含 deps/observe/operate 字段负载）
//   - ## Slot (v2): 收编后的 ## Boundaries 等价段
//   - ## Scope / ## Context Template: Blueprint 顶层字段（v2 与 legacy H2 形式均支持）
//
// 详见 docs/dev/zh-cn/asset-structure-v2.md 与 RFC-0014。
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
  // 🆕 v0.7.4 stack-operation-referent — 执行参照（AI Agent 自跑）；与 observe 正交
  // .optional() 保留向后兼容：老 mock / 老 data 无 operate 字段时 TS 不报错
  operate: z.array(z.string()).optional(),
})

// 🆕 v0.7+ Blueprint Context Template: ## Scope 段 schema
export const ScopeSlimSchema = z.object({
  allow: z.array(z.string()).default([]),
  forbid: z.array(z.string()).default([]),
  desc: z.string().default(''),
})
export type ScopeSlim = z.infer<typeof ScopeSlimSchema>

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
  // 🆕 v0.7+ Blueprint Context Template: ## Scope 段（默认 allow=[] 允许任意）
  fileScope: ScopeSlimSchema.default({ allow: [], forbid: [], desc: '' }),
  // 🆕 v0.7+ Blueprint Context Template: ## Context Template 段（可选）
  contextTemplate: z.string().nullable().default(null),
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

/**
 * 🆕 v0.7: 同时支持 .oxn 和 .md 格式
 *   - .oxn: `blueprint "X" ref "Y";` 在 work body 内（向后兼容）
 *   - .md:  `## Use` 段下 `### name` + `- kind: blueprint` + `- ref: @prj/...`（canonical）
 *
 * 优先匹配 .oxn（如匹配到 ref，fall-through 到 .md 避免重复）；
 * 仅 .oxn 没匹配到 ref 时尝试 .md（避免 .oxn 段被误识别为 .md）。
 */
export function extractBlueprintRefs(workContent: string): DeclaredBlueprintRef[] {
  // 1️⃣ 优先 .oxn 格式：blueprint "X" ref "Y";
  const out: DeclaredBlueprintRef[] = []
  const oxnRe = /blueprint\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g
  for (const m of workContent.matchAll(oxnRe)) {
    out.push({ name: m[1]!, ref: m[2] ?? null })
  }
  if (out.length > 0) return out

  // 2️⃣ .md 格式：## Use 段下 ### name + - kind: blueprint + - ref: @prj/...
  const useMatch = workContent.match(/## Use\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (!useMatch) return out
  const useBody = useMatch[1] ?? ''
  // 按 ### 切分 H3 块
  for (const block of useBody.split(/\n(?=### )/)) {
    if (!block.startsWith('### ')) continue
    // H3 名称 = ### 后到第一个换行符之前的内容
    const name = block.split('\n', 1)[0]?.replace(/^### /, '').trim() ?? ''
    if (!name) continue
    let kind = block.match(/- kind:\s*(\S+)/)?.[1]
    let refValue = ''
    if (kind === 'blueprint') {
      // 旧格式：- ref: 行必须存在（哪怕 value 为空 → ref=null）
      const refLineMatch = block.match(/- ref:\s*([^\n]*)/)
      if (refLineMatch) {
        refValue = refLineMatch[1]!.trim()
      } else {
        continue
      }
    } else {
      // 🆕 v0.7 fallback: 新格式 - blueprint: @md/blueprints/<name>（H3 名 + 单字段）
      const singleField = block.match(/- blueprint:\s*(\S+)/)
      if (singleField) {
        kind = 'blueprint'
        refValue = singleField[1]!.replace(/^["']|["']$/g, '')
      } else {
        continue
      }
    }
    // 去可选引号 + 取最后一个 token（处理 "name @prj/..." 合并形式）
    const refClean = refValue.replace(/^["']|["']$/g, '')
    const refLast = refClean.split(/\s+/).at(-1) ?? ''
    out.push({ name, ref: refLast || null })
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
  // 🆕 v0.7+ Blueprint Context Template：## Scope 段（允许/禁止文件 glob）
  // 缺省值：allow=[] (允许任意), forbid=[] (无限制)
  fileScope: { allow: string[]; forbid: string[]; desc: string }
  // 🆕 v0.7+ Blueprint Context Template：## Context Template 段（可选）
  contextTemplate: string | null
}

/**
 * 从 blueprint.md 内容提取 slim 字段。
 * 永远不抛错；错误累积在 result.errors。
 *
 * 🆕 v0.7: 同时支持 .oxn 和 .md 格式
 *   - .oxn: `blueprint "X" { ... }` body（向后兼容）
 *   - .md:  `## Use` + `## Boundaries`（canonical）
 *
 * 优先识别 .oxn（向后兼容）；若 .oxn 解析失败或不存在，fallback 到 .md 解析。
 */
export function parseBlueprintSlim(content: string): ParsedBlueprintSlim {
  // 🆕 v0.7: 优先尝试 .md 格式（canonical）；.oxn 解析作为 fallback
  // 判断依据：frontmatter `---` 开头 或 包含 `## Use`/`## Boundaries`/`## Slot` 段
  const isMdFormat = /^---\n/m.test(content) || /## (Use|Boundaries|Slot)\b/m.test(content)
  if (isMdFormat) {
    return parseBlueprintSlimFromMd(content)
  }
  return parseBlueprintSlimFromOxn(content)
}

/**
 * 🆕 v0.7: 解析 .md 格式 Blueprint
 *   - `## Use` 段：### name + - kind: domain/workflow/stack/blueprint + - ref: @prj/...
 *   - `## Boundaries` 段：### name + - refs / - observe / - deps
 *
 * 为了与 .oxn 解析结果兼容：
 *   - slots[] ← boundaries[]（每个 boundary 当作一个 slot，name 沿用）
 *   - domainRefs / workflowRefs / stackRefs / nestedBlueprintRefs ← from `## Use`
 */
function parseBlueprintSlimFromMd(content: string): ParsedBlueprintSlim {
  const errors: string[] = []

  // 1️⃣ name + version（frontmatter）
  const name = content.match(/^---\n[\s\S]*?name:\s*([^\n]+)/m)?.[1]?.trim() ?? null
  const versionStr = content.match(/^---\n[\s\S]*?version:\s*([^\n]+)/m)?.[1]?.trim()
  let version = 1
  if (versionStr) {
    // 🆕 v0.7: .md 格式 version 是 semver（如 "0.7.0"），提取主版本号；schema 要求 min 1
    const major = Number.parseInt(versionStr.split('.')[0] ?? '', 10)
    if (Number.isFinite(major) && major >= 1) version = major
    else if (Number.isFinite(major) && major === 0) version = 1 // 0.x 归 1
    // invalid version 不再报错（.md 格式支持 semver）
  }

  // 2️⃣ 提取 `## Use` 段 → domainRefs / workflowRefs / stackRefs / nestedBlueprintRefs
  // 🆕 v0.7: 兼容三种格式
  //   A：## Use + ### name H3 + - kind / - ref（每个 ref 一个 H3）
  //   B：## Use + - kind / - ref（list under H2，无 H3）
  //   C：## Use <kind> + ### name H3 + - kind: <kind> / - ref: @prj/...
  //      v0.7.4 (Asset 结构 v2)：per-type Use 段，按 ## Use <Asset Type> 分组
  const domainRefs: Array<{ name: string; ref: string | null }> = []
  const workflowRefs: Array<{ name: string; ref: string | null }> = []
  const stackRefs: Array<{ name: string; ref: string | null }> = []
  const nestedBlueprintRefs: Array<{ name: string; ref: string | null }> = []
  // 收集所有 ## Use 或 ## Use <kind> 段
  const useSectionMatches: Array<{ kind: string | null; body: string }> = []
  // 格式 A/B：## Use\n
  const useMatchAB = content.match(/## Use\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (useMatchAB) {
    useSectionMatches.push({ kind: null, body: useMatchAB[1] ?? '' })
  }
  // 格式 C：## Use <kind>\n
  const useKindRe = /## Use\s+(domain|workflow|stack|blueprint)\n([\s\S]*?)(?=\n## |\n# |$)/g
  for (const m of content.matchAll(useKindRe)) {
    useSectionMatches.push({ kind: m[1]!, body: m[2] ?? '' })
  }
  for (const { kind: sectionKind, body: useBody } of useSectionMatches) {
    // 检测是否有 ### H3
    const hasH3 = /^### /m.test(useBody)
    if (hasH3) {
      // 格式 A/C：每个 ### H3 是一个 ref
      for (const block of useBody.split(/\n(?=### )/)) {
        if (!block.startsWith('### ')) continue
        const n = block.split('\n', 1)[0]?.replace(/^### /, '').trim() ?? ''
        if (!n) continue
        let kind = sectionKind ?? block.match(/- kind:\s*(\S+)/)?.[1]
        let ref: string | null = null
        const refLineMatch = block.match(/- ref:\s*([^\n]+)/)
        if (refLineMatch) {
          const refValue = refLineMatch[1]!.trim()
          const refClean = refValue.replace(/^["']|["']$/g, '')
          ref = (refClean.split(/\s+/).at(-1) ?? '') || null
        }
        if (!kind || !ref) {
          const singleField = block.match(/- (domain|workflow|stack|blueprint):\s*(\S+)/)
          if (singleField) {
            kind = singleField[1]
            ref = singleField[2]!.replace(/^["']|["']$/g, '')
          }
        }
        if (kind === 'domain') domainRefs.push({ name: n, ref })
        else if (kind === 'workflow') workflowRefs.push({ name: n, ref })
        else if (kind === 'stack') stackRefs.push({ name: n, ref })
        else if (kind === 'blueprint' && n !== name) nestedBlueprintRefs.push({ name: n, ref })
      }
    } else {
      // 格式 B：直接解析 list
      // 按换行分割，每行 `- kind: ref`
      for (const line of useBody.split('\n')) {
        const m = line.match(/^-\s*(\w+):\s*(.+)$/)
        if (!m) continue
        const kind = m[1]!
        const refValue = m[2]!.trim()
        const refClean = refValue.replace(/^["']|["']$/g, '')
        const refLast = refClean.split(/\s+/).at(-1) ?? ''
        const ref = refLast || null
        if (kind === 'domain') domainRefs.push({ name: kind, ref })
        else if (kind === 'workflow') workflowRefs.push({ name: kind, ref })
        else if (kind === 'stack') stackRefs.push({ name: kind, ref })
        else if (kind === 'blueprint' && kind !== name) nestedBlueprintRefs.push({ name: kind, ref })
      }
    }
  }

  // 3️⃣ 提取 `## Boundaries` 或 `## Slot` 段 → slots[]（每个 boundary 当作一个 slot）
  // 🆕 v0.7.4 (Asset 结构 v2)：Blueprint 特例把 Boundaries 收编为 ## Slot
  const slots: SlotSlim[] = []
  const slotMatch = content.match(/## (Boundaries|Slot)\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (slotMatch) {
    for (const block of (slotMatch[2] ?? '').split(/\n(?=### )/)) {
      if (!block.startsWith('### ')) continue
      // H3 名称 = ### 后到第一个换行符之前的内容
      const name_ = block.split('\n', 1)[0]?.replace(/^### /, '').trim() ?? ''
      if (!name_) continue
      // 解析 deps / observe 列表（多行或数组形式）
      // 列表项格式：- item 或 - "item"（引号可选）
      // 关键：列表项必须以"  -"或"- "开头，且不能有":"（避免捕获下一个字段如"deps: []"）
      function parseListField(fieldName: string): string[] {
        // 多行列表：- deps:\n  - a\n  - b
        const multilineMatch = block.match(new RegExp(`- ${fieldName}:\\s*\\n((?:\\s+-\\s+[^:\\n]+\\n?)+)`))
        if (multilineMatch) {
          const items: string[] = []
          for (const m of multilineMatch[1]!.matchAll(/\s+-\s+"?([^"\n]+)"?/g)) {
            items.push(m[1]!.trim())
          }
          return items
        }
        // 数组形式：- deps: ["a", "b"] 或 - deps: []
        const arrayMatch = block.match(new RegExp(`- ${fieldName}:\\s*\\[([^\\]]*)\\]`))
        if (arrayMatch) {
          const items: string[] = []
          for (const m of arrayMatch[1]!.matchAll(/"([^"]+)"/g)) {
            items.push(m[1]!)
          }
          return items
        }
        return []
      }
      slots.push({
        name: name_,
        deps: parseListField('deps'),
        observe: parseListField('observe'),
        // 🆕 v0.7.4 stack-operation-referent — 解析 operate 列表
        operate: parseListField('operate'),
      })
    }
  }

  // 4️⃣ 强制约束：MD-native blueprint 必须引用 1 Domain + 1 Workflow + 1 Stack
  if (errors.length === 0) {
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
    errors.push('no `entity: blueprint` declaration with name found in frontmatter')
  }

  // 5️⃣ 🆕 v0.7+ Blueprint Context Template: 提取 ## Scope 段（允许/禁止文件 glob）
  const scope: { allow: string[]; forbid: string[]; desc: string } = {
    allow: [],
    forbid: [],
    desc: '',
  }
  const scopeMatch = content.match(/## Scope\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (scopeMatch) {
    const scopeBody = scopeMatch[1] ?? ''
    const allowMatch = scopeBody.match(/- allow:\s*\n((?:\s+-\s+[^\n]+\n?)+)/)
    if (allowMatch) {
      for (const m of allowMatch[1]!.matchAll(/\s+-\s+"?([^"\n]+)"?/g)) {
        scope.allow.push(m[1]!.trim())
      }
    }
    const forbidMatch = scopeBody.match(/- forbid:\s*\n((?:\s+-\s+[^\n]+\n?)+)/)
    if (forbidMatch) {
      for (const m of forbidMatch[1]!.matchAll(/\s+-\s+"?([^"\n]+)"?/g)) {
        scope.forbid.push(m[1]!.trim())
      }
    }
    const descMatch = scopeBody.match(/- desc:\s*"?([^"\n]+)"?/)
    if (descMatch) scope.desc = descMatch[1]!.trim()
  }

  // 6️⃣ 🆕 v0.7+ Blueprint Context Template: 提取 ## Context Template 段
  let contextTemplate: string | null = null
  const ctMatch = content.match(/## Context Template\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (ctMatch) {
    contextTemplate = (ctMatch[1] ?? '').trim()
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
    fileScope: scope,
    contextTemplate,
  }
}

/**
 * 解析 .oxn 格式 Blueprint（向后兼容）
 */
function parseBlueprintSlimFromOxn(content: string): ParsedBlueprintSlim {
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

  // 提取 Blueprint body 内的 4 种 ref decl
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
  const nestedBlueprintRefs = extractRefs('blueprint').filter((r) => r.name !== name)

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
    // 🆕 v0.7+ Blueprint Context Template: .oxn 格式暂不支持 Scope（向后兼容给默认值）
    fileScope: { allow: [], forbid: [], desc: '' },
    contextTemplate: null,
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
  // 🆕 v0.7.4 stack-operation-referent — operate = ["test", "lint"]
  const operate: string[] = []
  const opMatch = body.match(/operate\s*=\s*\[([^\]]*)\]/)
  if (opMatch) {
    for (const m of opMatch[1]!.matchAll(/"([^"]+)"/g)) {
      operate.push(m[1]!)
    }
  }
  return { name, deps, observe, operate }
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
    // v0.7: 默认 ref 指向 blueprints/（Work 引用 Blueprint）
    uniqueRefs.push(d.ref ?? `@prj/blueprints/${d.name}`)
    uniqueDeclared.push(d)
  }

  const blueprints: PerWorkBlueprintEntry[] = []
  for (const decl of uniqueDeclared) {
    const resolved = resolveBlueprintFile(decl.ref, decl.name, projectRoot)
    const refStr = decl.ref ?? `@prj/blueprints/${decl.name}`

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
        // 🆕 v0.7+ Blueprint Context Template
        fileScope: { allow: [], forbid: [], desc: '' },
        contextTemplate: null,
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
        // 🆕 v0.7+ Blueprint Context Template
        fileScope: { allow: [], forbid: [], desc: '' },
        contextTemplate: null,
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
      // 🆕 v0.7+ Blueprint Context Template
      fileScope: slim.fileScope,
      contextTemplate: slim.contextTemplate,
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
