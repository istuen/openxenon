/**
 * md-pipeline/transformers/work.ts — v0.4 PR-C2 unified-native Work 抽取
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Work H2 分类白名单
// ========================

export const WORK_CATEGORIES = ['Context', 'Tasks'] as const
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
  parts: WorkPart[]
}

export interface WorkIR {
  entity: 'work'
  name: string
  version: string
  context: WorkContext
  tasks: WorkTaskIR[]
  proofs: string[] // v0.3 T11 grammar: work 内显式声明要跑的 Proof
  _counters: { taskIdx: number }
}

// ========================
// 核心抽取函数
// ========================

export function extractWorkIR(root: Root, frontmatter: Record<string, unknown> = {}): WorkIR {
  const contexts = collectHeadingContexts(root)

  const context: WorkContext = { goal: '', maxIterations: 3, constraints: [] }
  const tasks: WorkTaskIR[] = []
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
    } else if (ctx.h2 === 'Tasks' && ctx.h3) {
      taskIdx++
      const fields = ctx.h3List ? collectListFields(ctx.h3List) : []
      tasks.push(extractTaskFromFields(ctx.h3, fields))
    }
  }

  return {
    entity: 'work',
    name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
    version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
    context,
    tasks,
    proofs: extractProofsFromTree(root),
    _counters: { taskIdx },
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

function extractTaskFromFields(name: string, fields: ListField[]): WorkTaskIR {
  const blueprintField = fields.find((f) => f.key === 'blueprint')
  const domainField = fields.find((f) => f.key === 'domain')

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


