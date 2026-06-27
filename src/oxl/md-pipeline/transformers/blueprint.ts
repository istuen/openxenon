/**
 * md-pipeline/transformers/blueprint.ts — v0.4 PR-C2 unified-native Blueprint 抽取
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

// ========================
// Blueprint H2 分类白名单
// ========================

export const BLUEPRINT_CATEGORIES = ['Props', 'Slots'] as const
export type BlueprintCategory = (typeof BLUEPRINT_CATEGORIES)[number]

// ========================
// Blueprint IR 类型
// ========================

export interface BlueprintProp {
  name: string
  type: string
  values: string[]
  required: boolean
  default: string | null
}

export interface BlueprintSlot {
  name: string
  deps: string[]
  observe: string[]
}

export interface BlueprintIR {
  entity: 'blueprint'
  name: string
  version: string
  description: string
  props: BlueprintProp[]
  slots: BlueprintSlot[]
  _counters: { propIdx: number; slotIdx: number }
}

// ========================
// 核心抽取函数
// ========================

export function extractBlueprintIR(root: Root, frontmatter: Record<string, unknown> = {}): BlueprintIR {
  const contexts = collectHeadingContexts(root)

  const props: BlueprintProp[] = []
  const slots: BlueprintSlot[] = []

  let propIdx = 0
  let slotIdx = 0

  for (const ctx of contexts) {
    if (!ctx.h2 || !ctx.h3) continue
    if (!BLUEPRINT_CATEGORIES.includes(ctx.h2 as BlueprintCategory)) continue

    const fields = ctx.h3List ? collectListFields(ctx.h3List) : []

    switch (ctx.h2 as BlueprintCategory) {
      case 'Props':
        propIdx++
        props.push(extractProp(ctx.h3, fields))
        break
      case 'Slots':
        slotIdx++
        slots.push(extractSlot(ctx.h3, fields))
        break
    }
  }

  // description from H1 if present
  const description = extractH1Description(root)

  return {
    entity: 'blueprint',
    name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
    // v0.4.1: version 可能为 number (来自 frontmatter 解析) 或 string
    version: frontmatter.version !== undefined && frontmatter.version !== null ? String(frontmatter.version) : '0.1.0',
    description,
    props,
    slots,
    _counters: { propIdx, slotIdx },
  }
}

function extractProp(name: string, fields: ListField[]): BlueprintProp {
  const typeField = fields.find((f) => f.key === 'type')
  const valuesField = fields.find((f) => f.key === 'values')
  const requiredField = fields.find((f) => f.key === 'required')
  const defaultField = fields.find((f) => f.key === 'default')

  return {
    name,
    type: typeof typeField?.value === 'string' ? typeField.value : 'string',
    values: Array.isArray(valuesField?.value) ? (valuesField.value as string[]) : [],
    required: requiredField?.value === 'true' || requiredField?.value === '1',
    default: typeof defaultField?.value === 'string' ? defaultField.value : null,
  }
}

function extractSlot(name: string, fields: ListField[]): BlueprintSlot {
  const depsField = fields.find((f) => f.key === 'deps')
  const observeField = fields.find((f) => f.key === 'observe')

  return {
    name,
    deps: Array.isArray(depsField?.value) ? (depsField.value as string[]) : [],
    observe: Array.isArray(observeField?.value) ? (observeField.value as string[]) : [],
  }
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
