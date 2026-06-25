/**
 * md-pipeline/transformers/task.ts — v0.4 PR-C2 unified-native Task 抽取
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Task H2 分类白名单
// ========================

export const TASK_CATEGORIES = ['Domain', 'Blueprint', 'Parts'] as const
export type TaskCategory = (typeof TASK_CATEGORIES)[number]

// ========================
// Task IR 类型
// ========================

export interface TaskProbe {
  name: string
  scheme: string
  expect: string
}

export interface TaskPart {
  name: string
  skillContext: string
  probes: TaskProbe[]
}

export interface TaskIR {
  entity: 'task'
  name: string
  domain: string | null
  blueprint: string | null
  parts: TaskPart[]
  deps: string[]
}

// ========================
// 核心抽取函数
// ========================

export function extractTaskIR(root: Root, frontmatter: Record<string, unknown> = {}): TaskIR {
  const contexts = collectHeadingContexts(root)

  let domain: string | null = null
  let blueprint: string | null = null
  const parts: TaskPart[] = []

  for (const ctx of contexts) {
    if (!ctx.h2 || !ctx.h3) continue
    if (!TASK_CATEGORIES.includes(ctx.h2 as TaskCategory)) continue
    const fields = ctx.h3List ? collectListFields(ctx.h3List) : []

    switch (ctx.h2 as TaskCategory) {
      case 'Domain':
        domain = typeof fields[0]?.value === 'string' ? (fields[0].value as string) : null
        break
      case 'Blueprint':
        blueprint = typeof fields[0]?.value === 'string' ? (fields[0].value as string) : null
        break
      case 'Parts':
        // ## Parts 下 H3 = part name, 内部 list 包含 skill_context / probe
        parts.push(extractPartFromFields(ctx.h3, fields))
        break
    }
  }

  return {
    entity: 'task',
    name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
    domain,
    blueprint,
    parts,
    deps: extractDepsFromTree(root),
  }
}

function extractPartFromFields(name: string, fields: ListField[]): TaskPart {
  let skillContext = ''
  const probes: TaskProbe[] = []

  for (const f of fields) {
    if (f.key === 'skill_context' && typeof f.value === 'string') {
      skillContext = f.value
    } else if (f.key === 'probe' && typeof f.value === 'string') {
      probes.push({
        name: f.value,
        scheme: '',
        expect: '',
      })
    }
  }

  return { name, skillContext, probes }
}

function extractDepsFromTree(root: Root): string[] {
  // deps = [...] 在 frontmatter 或独立段
  for (const child of root.children) {
    if (child.type === 'yaml') {
      const m = (child as { value: string }).value.match(/^deps:\s*\[(.*)\]/m)
      if (m) {
        return m[1]!
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      }
    }
  }
  return []
}

// ========================
// unified plugin
// ========================

export function remarkTaskExtractor(): (tree: Root) => void {
  return (tree) => {
    const frontmatter = extractYamlFromTree(tree)
    tree.data ??= {}
    ;(tree.data as Record<string, unknown>).task = extractTaskIR(tree, frontmatter)
  }
}


