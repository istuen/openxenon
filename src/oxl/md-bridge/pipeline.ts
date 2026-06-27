/**
 * md-bridge/pipeline.ts — unified pipeline 编排
 *
 * v0.3 阶段 1 T2 任务（路线 C v3 + Intent 边界）
 *
 * 角色：
 * - 把 .md 文件送入 unified pipeline（remark-parse + remark-directive + remark-frontmatter）
 * - 提取 frontmatter
 * - 计算 SHA-256 contentHash
 * - 提取 `:::intent` 容器指令为 IntentBlock 列表
 * - 返回 PipelineOutput（mdast + frontmatter + hash + 解析耗时）
 *
 * 关键不变量：
 * - 不感知 fs（只接收 content 字符串）
 * - 不感知 OpenXenon Kernel（只输出 mdast AST）
 * - 失败抛 E_MD_INVALID_SYNTAX 错误
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 * - 不 import L0-Processor / L1-Infra（除 hashPort）
 * - 不 import L2-Work / L3
 */

import { createHash } from 'node:crypto'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import type { Root, RootContent } from 'mdast'

// ========================
// 类型
// ========================

/** Intent 5 类资产类型 */
export type IntentEntityType = 'domain' | 'blueprint' | 'work' | 'task' | 'proof'

/** Pipeline 输入 */
export interface PipelineInput {
  /** .md 内容（不含 fs 操作）*/
  content: string
  /** 资产类型（影响后续 mdast-to-kernel 转换）*/
  entity?: IntentEntityType
  /** 文件路径（用于错误信息）*/
  filePath?: string
}

/** Frontmatter 字段（YAML 解析）*/
export interface Frontmatter {
  /** 资产类型（domain/blueprint/work/task/proof）*/
  entity?: IntentEntityType
  /** 版本号（v0.X.Y）*/
  version?: string
  /** 状态（active/archived/draft）*/
  status?: string
  /** 标记 Intent SSOT（默认 true）*/
  intent?: boolean
  /** 其他扩展字段 */
  [key: string]: unknown
}

/** Intent 容器指令（从 mdast 提取）*/
export interface IntentBlock {
  /** 指令类型（通常是 'intent'）*/
  name: string
  /** 指令属性（{id, type, scope}）*/
  attributes: Record<string, string>
  /** 指令文本内容（每行一个 list item）*/
  content: string[]
  /** mdast 源节点引用 */
  node: RootContent
  /** 源码位置 */
  position?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
}

/** Pipeline 输出 */
export interface PipelineOutput {
  /** 解析后的 mdast AST（root 节点）*/
  mdast: Root
  /** frontmatter 内容（YAML 解析后）*/
  frontmatter: Frontmatter
  /** `:::intent` 容器指令列表 */
  intents: IntentBlock[]
  /** 实体类型（从 frontmatter.entity 或 input.entity 推断）*/
  entityType: IntentEntityType | null
  /** 文件路径（透传）*/
  filePath?: string
  /** 一级标题文本（# Title）*/
  title: string
  /** 内容 SHA-256 */
  contentHash: string
  /** 解析耗时（ms）*/
  parseTime: number
  /** 是否解析成功（无 syntax error）*/
  success: boolean
  /** 解析错误（如果有）*/
  errors: PipelineError[]
}

export interface PipelineError {
  message: string
  line?: number
  column?: number
  rule?: string
}

// ========================
// Pipeline 实现
// ========================

/**
 * 同步执行 md pipeline（unified processor）
 *
 * @example
 * ```ts
 * const result = runMdPipeline({
 *   content: '# Domain: OrderContext\n\n:::intent{#inv-1 type="invariant"}\n- rule 1\n:::',
 *   entity: 'domain',
 * })
 * // result.mdast.children[0].type === 'heading'
 * // result.intents[0].name === 'intent'
 * // result.intents[0].attributes.id === 'inv-1'
 * ```
 */
export function runMdPipeline(input: PipelineInput): PipelineOutput {
  const startTime = Date.now()
  const errors: PipelineError[] = []
  const contentHash = createHash('sha256').update(input.content).digest('hex')

  // 1. 构造 unified 链
  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml'])

  // 2. 解析 .md
  let mdast: Root
  try {
    mdast = processor.parse(input.content)
  } catch (err) {
    errors.push({
      message: err instanceof Error ? err.message : String(err),
      rule: 'E_MD_INVALID_SYNTAX',
    })
    return {
      mdast: { type: 'root', children: [] },
      frontmatter: {},
      intents: [],
      entityType: null,
      filePath: input.filePath,
      title: '',
      contentHash,
      parseTime: Date.now() - startTime,
      success: false,
      errors,
    }
  }

  // 3. 提取 frontmatter
  const frontmatter = extractFrontmatter(mdast)

  // 4. 提取 `:::intent` 容器指令
  const intents = extractIntents(mdast, input.content)

  // 5. 推断 entity type（frontmatter.entity > input.entity > null）
  const entityType = (frontmatter.entity ?? input.entity ?? null) as IntentEntityType | null

  // 6. 提取一级标题
  const title = extractTitle(mdast)

  return {
    mdast,
    frontmatter,
    intents,
    entityType,
    filePath: input.filePath,
    title,
    contentHash,
    parseTime: Date.now() - startTime,
    success: errors.length === 0,
    errors,
  }
}

// ========================
// 辅助函数
// ========================

/** 提取一级标题文本 */
function extractTitle(mdast: Root): string {
  const h1 = mdast.children.find((n): n is import('mdast').Heading => n.type === 'heading' && n.depth === 1)
  if (!h1) return ''
  return collectHeadingText(h1)
}

/** 收集 heading 内的纯文本 */
function collectHeadingText(heading: import('mdast').Heading): string {
  return heading.children
    .map((child) => {
      if ('value' in child && typeof child.value === 'string') {
        return child.value
      }
      if ('children' in child) {
        return child.children
          .map((c) => {
            if ('value' in c && typeof c.value === 'string') return c.value
            return ''
          })
          .join('')
      }
      return ''
    })
    .join('')
    .trim()
}

/**
 * 提取 frontmatter（YAML 解析后）
 *
 * 简化版：把第一个 `yaml` 节点的 value 解析为 Record
 * 实际 YAML 解析留到 v0.3 阶段 1 T3（lazy import yaml 包避免循环依赖）
 */
function extractFrontmatter(mdast: Root): Frontmatter {
  const fmNode = mdast.children.find((n): n is RootContent & { type: 'yaml'; value: string } => n.type === 'yaml')

  if (!fmNode) return {}

  try {
    // 动态 import yaml（避免顶层依赖 + lazy load）
    // 简化版：用正则解析 key: value 对
    return parseSimpleYaml(fmNode.value) as Frontmatter
  } catch {
    return {}
  }
}

/**
 * 简化版 YAML 解析（仅支持 v0.3 frontmatter 用到的子集）
 *
 * 支持：
 * - `key: value`
 * - `key: "string"`
 * - `key: true/false`
 * - `key:` （空值）
 *
 * 不支持：
 * - 嵌套对象
 * - 列表
 * - 多行字符串
 *
 * 完整 YAML 解析：v0.3 阶段 1 T3 引入 `yaml` 包做 lazy import
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const key = trimmed.slice(0, colonIdx).trim()
    const rawValue = trimmed.slice(colonIdx + 1).trim()

    if (rawValue === '') {
      result[key] = null
    } else if (rawValue === 'true') {
      result[key] = true
    } else if (rawValue === 'false') {
      result[key] = false
    } else if (/^["'].*["']$/.test(rawValue)) {
      result[key] = rawValue.slice(1, -1)
    } else {
      result[key] = rawValue
    }
  }

  return result
}

/**
 * 检测旧 `:::intent{...}` 容器指令
 *
 * v0.3 PR-B 改革：此格式已废弃，检测到立即抛 E_MD_DEPRECATED_SYNTAX
 *
 * 注：v0.3 PR-B 已移除 remark-directive plugin，AST 不再解析 :::
 * 容器指令；本函数改为基于原始 content 字符串扫描 :::intent{ 出现位置。
 *
 * @throws Error 抛 [E_MD_DEPRECATED_SYNTAX] 错误（如果检测到 :::intent 块）
 */
function extractIntents(_mdast: Root, rawContent?: string): IntentBlock[] {
  if (!rawContent) return []

  const lines = rawContent.split('\n')
  const detected: Array<{ line: number; name: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    // 检测 :::intent{ 或 :::intent (无 attributes)
    if (/^:::intent(\{|$)/.test(line.trim())) {
      detected.push({ line: i + 1, name: 'intent' })
    }
  }

  if (detected.length > 0) {
    throw new Error(
      `[E_MD_DEPRECATED_SYNTAX] Syntax deprecated in v0.3.0. ` +
        `${detected.length} legacy :::intent block(s) found ` +
        `(first at line ${detected[0]?.line ?? '?'}). ` +
        `Please use \`oxn domain compile\` to generate fresh .md from your .oxn files.`,
    )
  }

  return []
}

/** 遍历 mdast 树（保留为兼容工具，PR-B 暂未使用）*/
// biome-ignore lint/correctness/noUnusedVariables: PR-B 保留供未来扩展使用
function _walk(node: Root | RootContent, visit: (n: RootContent) => void): void {
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child)
      if ('children' in child && Array.isArray(child.children)) {
        _walk(child as Root | RootContent, visit)
      }
    }
  }
}
void _walk // 防止 unused 警告

/** 类型守卫：是否为 containerDirective（保留为兼容工具）*/
// biome-ignore lint/correctness/noUnusedVariables: PR-B 保留供未来扩展使用
function _isContainerDirective(node: unknown): node is RootContent & {
  type: 'containerDirective'
  name: string
  attributes?: Record<string, unknown>
  children: RootContent[]
  position?: { start: { line: number; column: number }; end: { line: number; column: number } }
} {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'containerDirective'
  )
}
void _isContainerDirective // 防止 unused 警告

/** 递归收集节点内所有文本（保留为兼容工具）*/
// biome-ignore lint/correctness/noUnusedVariables: PR-B 保留供未来扩展使用
function _collectText(node: unknown): string {
  if (typeof node === 'string') return node
  if (typeof node !== 'object' || node === null) return ''

  if ('value' in node && typeof (node as { value: unknown }).value === 'string') {
    return (node as { value: string }).value
  }

  if ('children' in node && Array.isArray((node as { children: unknown[] }).children)) {
    return (node as { children: unknown[] }).children.map(_collectText).join('')
  }

  return ''
}
void _collectText // 防止 unused 警告
