/**
 * md-pipeline/transformers/work.ts — v0.4 PR-C2 unified-native Work 抽取
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, getArray, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Work H2 分类白名单
// ========================

export const WORK_CATEGORIES = ['Context', 'LoopPolicy', 'Refs', 'Tasks'] as const
export type WorkCategory = (typeof WORK_CATEGORIES)[number]

// ========================
// Work IR 类型
// ========================

export interface WorkContext {
  goal: string
  maxIterations: number
  constraints: string[]
}

export interface WorkPart {
  name: string
  skillContext: string
  probes: Array<{ name: string; scheme: string; expect: string }>
}

export interface WorkTaskIR {
  name: string
  blueprint: string | null
  domain: string | null
  /** 🆕 v0.7.3 P4 (ADR-0061 §D3): Task 对齐的 Blueprint slot 名（boundary = slot name） */
  boundary: string | null
  /** 🆕 v0.7.3 P5 (ADR-0061 §D4): Task 依赖的其他 Task 名或 Blueprint slot 名 */
  deps: string[]
  parts: WorkPart[]
}

/** v0.4 Phase 2: work-level domain/blueprint ref (H3 under ## Refs)
 *  v0.6.4: 扩展 kind 联合类型，加 'stack'（Work 级声明，不进 Task）
 */
export interface WorkRef {
  /** domain | blueprint | stack */
  kind: 'domain' | 'blueprint' | 'stack'
  /** ref 逻辑名 (= H3 文本) */
  name: string
  /** 完整 URI 引用 (如 @prj/domains/X) */
  ref: string
  /** 可选别名 */
  alias: string | null
}

export interface WorkIR {
  entity: 'work'
  name: string
  version: string
  context: WorkContext
  refs: WorkRef[]
  tasks: WorkTaskIR[]
  proofs: string[] // v0.3 T11 grammar: work 内显式声明要跑的 Proof
  _counters: { refIdx: number; taskIdx: number }
}

// ========================
// 核心抽取函数
// ========================

export function extractWorkIR(root: Root, frontmatter: Record<string, unknown> = {}): WorkIR {
  const contexts = collectHeadingContexts(root)

  const context: WorkContext = { goal: '', maxIterations: 3, constraints: [] }
  const refs: WorkRef[] = []
  const tasks: WorkTaskIR[] = []
  let refIdx = 0
  let taskIdx = 0

  for (const ctx of contexts) {
    if (!ctx.h2) continue
    if (!WORK_CATEGORIES.includes(ctx.h2 as WorkCategory)) continue

    if (ctx.h2 === 'Context') {
      // 单个 primary 子节点
      if (ctx.h3 === 'primary' && ctx.h3List) {
        const fields = collectListFields(ctx.h3List)
        populateContextFromFields(context, fields)
      }
    } else if (ctx.h2 === 'LoopPolicy') {
      // v0.4.1: LoopPolicy 移出 WorkContext, 独立 H2
      if (ctx.h3 === 'primary' && ctx.h3List) {
        const fields = collectListFields(ctx.h3List)
        const maxIterField = fields.find((f) => f.key === 'max_iterations')
        if (typeof maxIterField?.value === 'string') {
          context.maxIterations = Number(maxIterField.value) || 3
        }
      }
    } else if (ctx.h2 === 'Refs' && ctx.h3) {
      // H3 = ref 名 (如 IntentAlignContext), list 字段 = ref 属性
      const fields = ctx.h3List ? collectListFields(ctx.h3List) : []
      const ref = extractRefFromFields(ctx.h3, fields)
      if (ref) {
        refIdx++
        refs.push(ref)
      }
    } else if (ctx.h2 === 'Tasks' && ctx.h3) {
      taskIdx++
      const fields = ctx.h3List ? collectListFields(ctx.h3List) : []
      tasks.push(extractTaskFromFields(ctx.h3, fields))
    }
  }

  return {
    entity: 'work',
    name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
    version: frontmatter.version !== undefined && frontmatter.version !== null ? String(frontmatter.version) : '0.3.0',
    context,
    refs,
    tasks,
    proofs: extractProofsFromTree(root),
    _counters: { refIdx, taskIdx },
  }
}

function populateContextFromFields(context: WorkContext, fields: ListField[]): void {
  for (const f of fields) {
    if (f.key === 'goal' && typeof f.value === 'string') context.goal = f.value
    else if (f.key === 'max_iterations' && typeof f.value === 'string') {
      context.maxIterations = Number(f.value) || 3
    } else if (f.key === 'constraints' && Array.isArray(f.value)) {
      context.constraints = f.value as string[]
    }
  }
}

/**
 * 从 H3 list 字段抽取 ref (kind / ref URI / alias)
 * 例:
 *   ### IntentAlignContext
 *   - kind: domain
 *   - ref: @prj/domains/intent-align-context
 */
function extractRefFromFields(name: string, fields: ListField[]): WorkRef | null {
  const kindField = fields.find((f) => f.key === 'kind' && typeof f.value === 'string')
  const refField = fields.find((f) => f.key === 'ref' && typeof f.value === 'string')
  const aliasField = fields.find((f) => f.key === 'alias' && typeof f.value === 'string')

  const kind = kindField?.value
  const refUri = refField?.value
  // v0.6.4: 扩展为支持 stack（在 Work 级的 ## Refs 可声明 kind: stack）
  if (kind !== 'domain' && kind !== 'blueprint' && kind !== 'stack') return null
  if (typeof refUri !== 'string') return null

  const alias = typeof aliasField?.value === 'string' ? aliasField.value : null
  return {
    kind,
    name,
    ref: refUri,
    alias,
  }
}

function extractTaskFromFields(name: string, fields: ListField[]): WorkTaskIR {
  const blueprintField = fields.find((f) => f.key === 'blueprint')
  const domainField = fields.find((f) => f.key === 'domain')
  const boundaryField = fields.find((f) => f.key === 'boundary')

  const parts: WorkPart[] = []
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]!
    if (f.key !== 'part') continue

    // part name: 优先 value (string), fallback raw (当 value 是 array 时)
    let partName: string
    if (typeof f.value === 'string') {
      partName = f.value
    } else if (Array.isArray(f.value)) {
      const m = f.raw.match(/^part:\s*(.*)$/)
      partName = m ? m[1]!.trim() : ''
    } else {
      continue
    }

    let skillContext = ''
    const probes: Array<{ name: string; scheme: string; expect: string }> = []

    // 1. part value 是 array (嵌套 list 形式): 在 array 内找 skill_context / probe
    if (Array.isArray(f.value)) {
      for (const raw of f.value) {
        if (typeof raw !== 'string') continue
        const sm = raw.match(/^skill_context:\s*(.*)$/)
        if (sm) skillContext = sm[1]!.trim()
        const pm = raw.match(/^probe:\s*(.*)$/)
        if (pm) probes.push({ name: pm[1]!.trim(), scheme: '', expect: '' })
      }
    }

    // 2. 找接下来的 sibling field (key=skill_context/probe) 直到下一个 part
    for (let j = i + 1; j < fields.length; j++) {
      const nf = fields[j]!
      if (nf.key === 'part') break
      if (Array.isArray(nf.value)) {
        for (const raw of nf.value) {
          if (typeof raw !== 'string') continue
          const sm = raw.match(/^skill_context:\s*(.*)$/)
          if (sm) skillContext = sm[1]!.trim()
          const pm = raw.match(/^probe:\s*(.*)$/)
          if (pm) probes.push({ name: pm[1]!.trim(), scheme: '', expect: '' })
        }
      } else if (nf.key === 'skill_context' && typeof nf.value === 'string') {
        skillContext = nf.value
      } else if (nf.key === 'probe' && typeof nf.value === 'string') {
        probes.push({ name: nf.value, scheme: '', expect: '' })
      }
    }

    parts.push({ name: partName, skillContext, probes })
  }

  return {
    name,
    blueprint: typeof blueprintField?.value === 'string' ? blueprintField.value : null,
    domain: typeof domainField?.value === 'string' ? domainField.value : null,
    boundary: typeof boundaryField?.value === 'string' ? boundaryField.value : null,
    deps: getArray(fields, 'deps') ?? [],
    parts,
  }
}

/**
 * v0.3 T11 grammar: work.oxn 含 `proofs ["..."]` 列表, 显式声明要跑的 proof
 * MD canonical 中, 写在 work ## Context 后或独立 ## Proofs 段
 */
function extractProofsFromTree(root: Root): string[] {
  const proofs: string[] = []
  // 简单扫 yaml frontmatter
  for (const child of root.children) {
    if (child.type === 'yaml') {
      const m = (child as { value: string }).value.match(/^proofs:\s*\[(.*)\]/m)
      if (m) {
        proofs.push(
          ...m[1]!
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean),
        )
      }
    }
  }
  return proofs
}

// ========================
// unified plugin
// ========================

export function remarkWorkExtractor(): (tree: Root) => void {
  return (tree) => {
    const frontmatter = extractYamlFromTree(tree)
    tree.data ??= {}
    ;(tree.data as Record<string, unknown>).work = extractWorkIR(tree, frontmatter)
  }
}
