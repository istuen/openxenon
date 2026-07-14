/**
 * md-pipeline/transformers/blueprint.ts — Blueprint 抽取
 *
 * v0.7 重构（PR-1）：
 * - H2 分类从 Props/Slots 改为 Use/Boundaries
 * - Use: 引用三边界（domain/workflow/stack），替代 Refs
 * - Boundaries: 编排单元，替代 Slots（带 refs + observe + deps）
 * - Props 删除（设计决定）
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Blueprint H2 分类白名单
// ========================

export const BLUEPRINT_CATEGORIES = ['Use', 'Boundaries'] as const
export type BlueprintCategory = (typeof BLUEPRINT_CATEGORIES)[number]

// ========================
// Blueprint IR 类型
// ========================

/**
 * Blueprint ## Use 段：引用三边界 Asset
 * 每个 kind 对应一个引用列表（如 domain: [{name, ref}, ...]）
 */
export interface BlueprintUse {
  domain: Array<{ name: string; ref: string }>
  workflow: Array<{ name: string; ref: string }>
  stack: Array<{ name: string; ref: string }>
}

/**
 * Blueprint ## Boundaries 段的一个编排单元
 * - refs: 引用哪些边界（domain/workflow/stack）
 * - observe: 可用 Probe 类型列表
 * - deps: 依赖的其他 Boundary 名
 */
export interface BlueprintBoundary {
  name: string
  refs: Array<{ kind: 'domain' | 'workflow' | 'stack'; ref: string }>
  observe: string[]
  deps: string[]
}

export interface BlueprintIR {
  entity: 'blueprint'
  name: string
  version: string
  description: string
  use: BlueprintUse
  boundaries: BlueprintBoundary[]
  _counters: { useIdx: number; boundaryIdx: number }
}

// ========================
// 核心抽取函数
// ========================

export function extractBlueprintIR(root: Root, frontmatter: Record<string, unknown> = {}): BlueprintIR {
  const contexts = collectHeadingContexts(root)

  const use: BlueprintUse = { domain: [], workflow: [], stack: [] }
  const boundaries: BlueprintBoundary[] = []

  let useIdx = 0
  let boundaryIdx = 0

  for (const ctx of contexts) {
    if (!ctx.h2 || !ctx.h3) continue
    if (!BLUEPRINT_CATEGORIES.includes(ctx.h2 as BlueprintCategory)) continue

    const fields = ctx.h3List ? collectListFields(ctx.h3List) : []

    switch (ctx.h2 as BlueprintCategory) {
      case 'Use':
        useIdx++
        extractUseEntry(ctx.h3, fields, use)
        break
      case 'Boundaries':
        boundaryIdx++
        boundaries.push(extractBoundary(ctx.h3, fields))
        break
    }
  }

  // description from H1 if present
  const description = extractH1Description(root)

  return {
    entity: 'blueprint',
    name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
    version: frontmatter.version !== undefined && frontmatter.version !== null ? String(frontmatter.version) : '0.1.0',
    description,
    use,
    boundaries,
    _counters: { useIdx, boundaryIdx },
  }
}

/**
 * 解析 ## Use 下的 H3 条目
 * 格式：
 *   ### <name>
 *   - domain: <name> @path/ref    ← 或 - workflow: - stack:
 */
function extractUseEntry(name: string, fields: ListField[], use: BlueprintUse): void {
  // 从 fields 找 kind → ref 的映射
  for (const f of fields) {
    if (f.key === 'domain' && typeof f.value === 'string') {
      use.domain.push({ name, ref: f.value })
    } else if (f.key === 'workflow' && typeof f.value === 'string') {
      use.workflow.push({ name, ref: f.value })
    } else if (f.key === 'stack' && typeof f.value === 'string') {
      use.stack.push({ name, ref: f.value })
    }
  }
}

function extractBoundary(name: string, fields: ListField[]): BlueprintBoundary {
  const refs: Array<{ kind: 'domain' | 'workflow' | 'stack'; ref: string }> = []
  const observe: string[] = []
  const deps: string[] = []

  for (const f of fields) {
    if (f.key === 'kind' && typeof f.value === 'string') {
      // - kind: domain@path/ref  格式（兼容 work 的 kind+ref 风格）
      const m = f.value.match(/^(\w+)@(.+)$/)
      if (m) {
        const kind = m[1] as 'domain' | 'workflow' | 'stack'
        if (['domain', 'workflow', 'stack'].includes(kind)) {
          refs.push({ kind, ref: m[2]! })
        }
      }
    } else if (f.key === 'ref' && typeof f.value === 'string') {
      // 简化格式：- ref: <kind>:<path>
      // 当前未使用，留作扩展
    } else if (f.key === 'observe') {
      if (Array.isArray(f.value)) {
        observe.push(...(f.value as string[]))
      } else if (typeof f.value === 'string') {
        observe.push(f.value)
      }
    } else if (f.key === 'deps') {
      if (Array.isArray(f.value)) {
        deps.push(...(f.value as string[]))
      } else if (typeof f.value === 'string') {
        deps.push(f.value)
      }
    }
  }

  return { name, refs, observe, deps }
}

function extractH1Description(root: Root): string {
  let foundH1 = false
  for (const child of root.children) {
    if (child.type === 'heading' && child.depth === 1) {
      const text = (child.children ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.value)
        .join('')
      // 优先 H1 文本 "Blueprint: name - description" / "Blueprint: name — description"
      // separator 必须是"空格 + -|—|: + 空格" (避免与 name 内的 - 冲突)
      const m = text.match(/^Blueprint:\s*[\w-]+\s+[-—:]\s+(.+)$/)
      if (m) return m[1]!.trim()
      foundH1 = true
    } else if (foundH1 && (child.type === 'paragraph' || child.type === 'blockquote')) {
      if (child.type === 'blockquote') {
        const para = (child.children ?? []).find((c) => c.type === 'paragraph')
        if (para) {
          const paraText = (para.children ?? [])
            .filter((c) => c.type === 'text')
            .map((c) => c.value)
            .join('')
          if (paraText) return paraText.trim()
        }
      } else {
        const paraText = (child.children ?? [])
          .filter((c) => c.type === 'text')
          .map((c) => c.value)
          .join('')
        if (paraText) return paraText.trim()
      }
      break
    }
  }
  return ''
}

// ========================
// unified plugin
// ========================

export function remarkBlueprintExtractor(): (tree: Root) => void {
  return (tree) => {
    const frontmatter = extractYamlFromTree(tree)
    tree.data ??= {}
    ;(tree.data as Record<string, unknown>).blueprint = extractBlueprintIR(tree, frontmatter)
  }
}
