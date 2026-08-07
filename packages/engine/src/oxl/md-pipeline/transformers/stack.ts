/**
 * md-pipeline/transformers/stack.ts — Stack 抽取 (v0.7.4 stack-operation-followup P3)
 *
 * 替代 `parseStackTools` 轻量 regex 解析（work-context-builder.ts:314+）
 * 优势：
 *   - 支持 multiline `- desc: |`（YAML block scalar）
 *   - 支持 `## Tools: <group>` 子分组（与 Domain `## Terms: <group>` 对称）
 *   - 统一走 OXL md-pipeline 编译路径
 *
 * 与 RFC-0022 P2（Domain regex → mdast）同类改造。
 */

import type { Root } from 'mdast'
import { collectHeadingContexts, collectListFields, type ListField } from '../utils'

// ========================
// Stack H2 分类白名单
// ========================

export const STACK_CATEGORIES = ['Tools'] as const
export type StackCategory = (typeof STACK_CATEGORIES)[number]

// ========================
// Stack IR 类型
// ========================

/**
 * Stack ## Tools ### <tool> 下 `operations:` 子段的一个 operation 声明。
 */
export interface StackOperationIR {
  name: string
  command: string
  desc?: string
}

/**
 * Stack ## Tools ### <tool> 段：一个工具实体声明
 */
export interface StackToolIR {
  name: string
  version?: string
  command?: string
  config?: string
  role?: string
  desc?: string
  operations?: StackOperationIR[]
}

export interface StackIR {
  entity: 'stack'
  name: string
  version: string
  description: string
  tools: StackToolIR[]
  _counters: { toolIdx: number }
}

// ========================
// 核心抽取函数
// ========================

export function extractStackIR(root: Root, frontmatter: Record<string, unknown> = {}): StackIR {
  const contexts = collectHeadingContexts(root)

  const tools: StackToolIR[] = []
  let toolIdx = 0

  // 处理 ## Tools 段下的 H3（每个 H3 是一个 tool）
  for (const ctx of contexts) {
    if (ctx.h2 !== 'Tools') continue
    if (!ctx.h3) continue

    const tool: StackToolIR = { name: ctx.h3 }
    toolIdx++

    // 解析 H3 下的 list 字段
    if (ctx.h3List) {
      const fields = collectListFields(ctx.h3List)
      for (const f of fields) {
        applyToolField(tool, f)
      }
    }

    tools.push(tool)
  }

  // frontmatter 提取 name / version / description
  const name = String(frontmatter.name ?? '')
  const version = String(frontmatter.version ?? '0.1.0')
  const description = String(frontmatter.abstract ?? frontmatter.description ?? '')

  return {
    entity: 'stack',
    name,
    version,
    description,
    tools,
    _counters: { toolIdx },
  }
}

function applyToolField(tool: StackToolIR, f: ListField): void {
  if (f.key === 'version' && typeof f.value === 'string') tool.version = f.value
  else if (f.key === 'command' && typeof f.value === 'string') tool.command = f.value
  else if (f.key === 'config' && typeof f.value === 'string') tool.config = f.value
  else if (f.key === 'role' && typeof f.value === 'string') tool.role = f.value
  else if (f.key === 'desc' && typeof f.value === 'string') tool.desc = f.value
  else if (f.key === 'operations' && Array.isArray(f.value)) {
    // operations 是 array 形式：- operations: [test, lint]（不常见）或
    // multiline list 形式：- operations:\n  - test: ...
    // 这里 f.value 来自 collectListFields 对 nested list 的处理，结果是 string[]（嵌套项的文本）
    // 对真实 multiline operations 形式（嵌套 key: value），改用专门的解析
    const ops: StackOperationIR[] = []
    for (const item of f.value) {
      const trimmed = item.trim()
      // - test: "bun test" — 全量测试
      const opMatch = trimmed.match(/^([^:]+):\s*(.+)$/)
      if (opMatch) {
        const opName = stripWrappingQuotes(opMatch[1]!.trim())
        const rest = stripWrappingQuotes(opMatch[2]!.trim())
        const descMatch = rest.match(/^(.+?)\s*[—–-]\s+(.+)$/)
        ops.push(
          descMatch
            ? { name: opName, command: stripWrappingQuotes(descMatch[1]!.trim()), desc: descMatch[2]!.trim() }
            : { name: opName, command: rest },
        )
      } else {
        // 简单 array 形式：[test, lint] → 仅名称，command 为空（不合规但兼容）
        ops.push({ name: trimmed, command: '' })
      }
    }
    if (ops.length > 0) tool.operations = ops
  }
  // 其他 key 暂忽略
}

/**
 * 剥离字符串首尾成对的引号（"或'）。
 * 仅当首尾是相同引号字符时剥离，避免误删内层引号或 desc 中的引号。
 * 例：
 *   "bun test"        → "bun test"
 *   "bun test" — desc → "bun test" — desc （仅剥首部，尾部不在末尾不剥）
 *   'cmd'             → 'cmd'
 */
function stripWrappingQuotes(s: string): string {
  if (s.length < 2) return s
  const first = s[0]!
  const last = s[s.length - 1]!
  if ((first === '"' || first === "'") && first === last) {
    return s.slice(1, -1)
  }
  return s
}
