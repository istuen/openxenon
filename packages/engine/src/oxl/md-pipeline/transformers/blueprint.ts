/**
 * md-pipeline/transformers/blueprint.ts — Blueprint 抽取
 *
 * v0.7 重构（PR-1）：
 * - H2 分类从 Props/Slots 改为 Use/Boundaries
 * - Use: 引用三边界（domain/workflow/stack），替代 Refs
 * - Boundaries: 编排单元，替代 Slots（带 refs + observe + deps）
 * - Props 删除（设计决定）
 */

import type { Root, Heading, Text } from 'mdast'
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
 * - observe: 可用 Probe 类型列表（OXN 验证参照；OXN 自跑）
 * - operate: 🆕 v0.7.4 stack-operation-referent — 可用 Operation 名列表（AI Agent 执行参照；AI 自跑）
 *   与 observe 正交：设计上独立，实践中常成对。operation.name 必须在 Blueprint 引用的
 *   Stack tool.operations 中可解析（inv-27 operate-subset-stack-operations）；同名歧义
 *   触发 inv-28 operation-disambiguation，要求 tool:operation 限定名。
 * - deps: 依赖的其他 Boundary 名
 */
export interface BlueprintBoundary {
  name: string
  refs: Array<{ kind: 'domain' | 'workflow' | 'stack'; ref: string }>
  observe: string[]
  operate: string[]
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

  // 🆕 v0.7: 显式扫描 `## Use` 段（不依赖 collectHeadingContexts 的 H3 要求）
  //   支持 3 种格式：
  //   A：## Use + ### name + - kind / - ref（每个 ref 一个 H3）
  //   B：## Use + - kind / - ref（list under H2，无 H3）
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i]
    if (child?.type !== 'heading') continue
    const h = child as { depth: number; children?: Array<{ type: string; value?: string }> }
    if (h.depth !== 2) continue
    const text = (h.children ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.value ?? '')
      .join('')
    if (text !== 'Use') continue
    useIdx++

    // 找 ## Use 段下的内容（直到下一个 ## 标题）
    let j = i + 1
    const sectionChildren = []
    while (j < root.children.length) {
      const next = root.children[j]
      if (next?.type === 'heading') {
        const nh = next as { depth: number }
        if (nh.depth <= 2) break
      }
      sectionChildren.push(next)
      j++
    }

    // 格式 A：## Use + ### name H3 + - kind / - ref
    const h3Items = sectionChildren.filter((c): c is Heading => c?.type === 'heading' && c.depth === 3)
    if (h3Items.length > 0) {
      // 格式 A：处理每个 H3
      for (const h3 of h3Items) {
        const h3Text =
          h3.children
            ?.filter((c): c is Text => c?.type === 'text')
            .map((c: Text) => c.value)
            .join('') ?? ''
        // 找 H3 后的 list
        const h3Idx = sectionChildren.indexOf(h3)
        let h3List = null
        for (let k = h3Idx + 1; k < sectionChildren.length; k++) {
          const c = sectionChildren[k]
          if (c && 'type' in c && c.type === 'list') {
            h3List = c
            break
          }
        }
        if (h3List) {
          const fields = collectListFields(h3List as unknown as import('mdast').List)
          extractUseEntry(h3Text, fields, use)
        }
      }
    } else {
      // 格式 B：直接处理 list
      const listNode = sectionChildren.find((c): c is import('mdast').List => c?.type === 'list')
      if (listNode) {
        const fields = collectListFields(listNode)
        extractUseEntryFromList(fields, use)
      }
    }
  }

  for (const ctx of contexts) {
    if (!ctx.h2) continue
    if (!BLUEPRINT_CATEGORIES.includes(ctx.h2 as BlueprintCategory)) continue

    if (ctx.h2 === 'Boundaries' && ctx.h3) {
      boundaryIdx++
      const fields = ctx.h3List ? collectListFields(ctx.h3List) : []
      boundaries.push(extractBoundary(ctx.h3, fields))
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
  // ref 值可能是 "name @prj/..." 形式（name + ref 合并）或单独的 "@prj/..." 形式
  // 策略：取 value 的最后一个 token 作为 ref（处理空格分隔的合并形式）
  for (const f of fields) {
    if (typeof f.value !== 'string') continue
    const ref = extractRefFromValue(f.value)
    if (f.key === 'domain') {
      use.domain.push({ name, ref })
    } else if (f.key === 'workflow') {
      use.workflow.push({ name, ref })
    } else if (f.key === 'stack') {
      use.stack.push({ name, ref })
    }
  }
}

/**
 * 🆕 v0.7: 解析 ## Use 下的 list（无 ### H3 时直接处理 list）
 * 格式 B：- domain: ref\n- workflow: ref\n- stack: ref
 * name 取 kind 名（如 domain）
 */
function extractUseEntryFromList(fields: ListField[], use: BlueprintUse): void {
  for (const f of fields) {
    if (typeof f.value !== 'string') continue
    const ref = extractRefFromValue(f.value)
    if (f.key === 'domain') {
      use.domain.push({ name: 'domain', ref })
    } else if (f.key === 'workflow') {
      use.workflow.push({ name: 'workflow', ref })
    } else if (f.key === 'stack') {
      use.stack.push({ name: 'stack', ref })
    }
  }
}

/** 从 - kind: value 提取 ref：
 *   - "@prj/blueprints/foo" → "@prj/blueprints/foo"（单独 ref 形式）
 *   - "name @prj/blueprints/foo" → "@prj/blueprints/foo"（name + ref 合并形式）
 *   - "" → ""（空 ref）
 */
function extractRefFromValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  // 检查是否以 @ 开头（这是 ref 形式）
  const lastToken = trimmed.split(/\s+/).at(-1) ?? ''
  return lastToken
}

function extractBoundary(name: string, fields: ListField[]): BlueprintBoundary {
  const refs: Array<{ kind: 'domain' | 'workflow' | 'stack'; ref: string }> = []
  const observe: string[] = []
  const operate: string[] = []
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
    } else if (f.key === 'operate') {
      // 🆕 v0.7.4 stack-operation-referent — 操作参照数组
      // 格式：- operate: [name1, name2] 或 - operate: name1
      if (Array.isArray(f.value)) {
        operate.push(...(f.value as string[]))
      } else if (typeof f.value === 'string') {
        operate.push(f.value)
      }
    } else if (f.key === 'deps') {
      if (Array.isArray(f.value)) {
        deps.push(...(f.value as string[]))
      } else if (typeof f.value === 'string') {
        deps.push(f.value)
      }
    }
  }

  return { name, refs, observe, operate, deps }
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
