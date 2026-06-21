/**
 * md-bridge/oxl-md-decompiler.ts — .oxn → .md 反向编译器
 *
 * v0.3 阶段 2 后续工作（v0.4 推迟项提前实施）
 *
 * 角色：
 * - 把 .oxn 文本反编译为 .md 文本
 * - 与 oxl-md-compiler.ts 对偶（mdast → .oxn 的反向）
 * - 复用 Langium driver 解析 .oxn
 * - 主要服务场景：`oxn <asset> md-create --from-oxn <file>`（v0.4 推迟项）
 *
 * 关键不变量：
 * - .md 优先（v0.3 §11.2 锁定）：本函数生成的 .md 是 canonical human-readable
 * - 生成的 .md 可被 compileMdToOxn() 反向编译回等价 .oxn
 * - 保留 source_hash 注释（用于 .oxn 的 hash 防漂移）
 * - 5 类实体均支持（domain/blueprint/work/task/proof）
 *
 * L0–L3 兼容性：
 * - L1-OXL 层
 * - 依赖 L0-Processor（Langium driver 已在 L1-OXL 内聚）
 * - 不依赖 L0-Schema（不生成 FrozenBlueprint）
 * - 不依赖 L2-Work / L3
 */

import { URI } from 'langium'
import { createOxnParser, type OxnParseResult } from '../langium-driver/oxn-services.js'
import type {
  DomainDeclaration,
  TermDecl,
  TermBlock,
  BanBlock,
  InvariantBlock,
  InvariantDecl,
  BlueprintDeclaration,
  PartSlotDeclaration,
  PropDeclaration,
  WorkDeclaration,
  WorkContext,
  TaskDeclaration,
} from '../langium-driver/generated/ast.js'
import { computeContentHash } from './oxl-md-source-hash.js'

// ========================
// 类型
// ========================

export type IntentEntityType = 'domain' | 'blueprint' | 'work' | 'task' | 'proof'

export interface DecompileOptions {
  /** 资产类型（影响 serializer 选择）*/
  entity?: IntentEntityType
  /** 缩进风格（默认 2 空格）*/
  indent?: string
  /** 是否生成 frontmatter（默认 true）*/
  frontmatter?: boolean
  /** md 版本（默认 0.3.0）*/
  version?: string
}

export interface DecompileResult {
  /** 编译后的 .md 文本 */
  md: string
  /** 实体名（PascalCase / kebab-case）*/
  name: string
  /** contentHash（SHA-256 of md content）*/
  contentHash: string
  /** 实体类型（探测或显式）*/
  entity: IntentEntityType
}

// ========================
// 主入口
// ========================

/**
 * .oxn → .md 反向编译器入口
 *
 * @example
 * ```ts
 * const result = await compileOxnToMd(oxnContent, { entity: 'domain' })
 * console.log(result.md)        // .md 文本
 * console.log(result.name)      // 'OrderContext'
 * console.log(result.contentHash)
 * ```
 */
export async function compileOxnToMd(oxnContent: string, options: DecompileOptions = {}): Promise<DecompileResult> {
  // 1. 解析 .oxn
  const parser = createOxnParser()
  const uri = URI.parse(`file:///oxn-input-${Date.now()}.oxn`)
  const parseResult: OxnParseResult = await parser.parse(oxnContent, uri)

  if (parseResult.parseErrors.length > 0 || parseResult.lexerErrors.length > 0) {
    throw new DecompilerParseError(
      `Failed to parse .oxn: ${parseResult.parseErrors.join('; ')}`,
      parseResult.parseErrors,
    )
  }

  const ast = parseResult.ast as OXNDocumentAST

  // 2. 检测首个 top-level entity
  if (!ast.entities || ast.entities.length === 0) {
    throw new DecompilerParseError('No top-level entity found in .oxn', [])
  }

  const firstEntity = ast.entities[0]
  if (!firstEntity) {
    throw new DecompilerParseError('Empty entity list in .oxn', [])
  }
  const entityType: IntentEntityType = options.entity ?? detectEntityType(firstEntity)

  // 3. 调用对应 serializer
  let md: string
  let name: string

  switch (entityType) {
    case 'domain':
      if (firstEntity.$type !== 'DomainDeclaration') {
        throw new DecompilerParseError(`Expected DomainDeclaration, got ${firstEntity.$type}`, [])
      }
      ;({ md, name } = decompileDomain(firstEntity as DomainDeclaration, options))
      break
    case 'blueprint':
      if (firstEntity.$type !== 'BlueprintDeclaration') {
        throw new DecompilerParseError(`Expected BlueprintDeclaration, got ${firstEntity.$type}`, [])
      }
      ;({ md, name } = decompileBlueprint(firstEntity as BlueprintDeclaration, options))
      break
    case 'work':
      if (firstEntity.$type !== 'WorkDeclaration') {
        throw new DecompilerParseError(`Expected WorkDeclaration, got ${firstEntity.$type}`, [])
      }
      ;({ md, name } = decompileWork(firstEntity as WorkDeclaration, options))
      break
    case 'task':
      // v0.3 follow-up: task.oxn 文件支持
      if (firstEntity.$type !== 'TaskDeclaration') {
        throw new DecompilerParseError(`Expected TaskDeclaration, got ${firstEntity.$type}`, [])
      }
      ;({ md, name } = decompileTask(firstEntity as TaskDeclaration, options))
      break
    default:
      throw new DecompilerParseError(`Entity type ${entityType} decompiler not yet implemented`, [])
  }

  // 4. contentHash
  const contentHash = computeContentHash(md)

  return {
    md,
    name,
    contentHash,
    entity: entityType,
  }
}

// ========================
// Entity Type Detection
// ========================

interface OXNDocumentAST {
  entities: Array<{ $type: string }>
}

function detectEntityType(entity: { $type: string }): IntentEntityType {
  switch (entity.$type) {
    case 'DomainDeclaration':
      return 'domain'
    case 'BlueprintDeclaration':
      return 'blueprint'
    case 'WorkDeclaration':
      return 'work'
    case 'TaskDeclaration':
      return 'task'
    case 'ProofDeclaration':
      return 'proof'
    default:
      throw new DecompilerParseError(`Unknown entity type: ${entity.$type}`, [])
  }
}

// ========================
// Domain Decompiler
// ========================

interface DecompileInternalResult {
  md: string
  name: string
}

function decompileDomain(domain: DomainDeclaration, options: DecompileOptions): DecompileInternalResult {
  const version = options.version ?? '0.3.0'
  const useFrontmatter = options.frontmatter ?? true

  const sections: string[] = []

  // 1. frontmatter
  if (useFrontmatter) {
    sections.push(
      serializeFrontmatter({
        entity: 'domain',
        name: domain.name,
        version,
        source_hash: extractSourceHash(domain.$container),
      }),
    )
  }

  // 2. # Domain: <name>
  sections.push(`# Domain: ${domain.name}`)
  sections.push('')

  // 3. Description (blockquote)
  if (domain.descriptions.length > 0) {
    const desc = domain.descriptions.map((d) => unwrapString(d.value)).join(' ')
    sections.push(`> ${desc}`)
    sections.push('')
  }

  // 4-6. Body blocks: term / ban / invariant 在 body[] 内任意顺序（v0.3 follow-up）
  const bodyElements: Array<{ $type: string }> = (domain.body ?? []) as Array<{ $type: string }>
  const termBlocks = bodyElements.filter((el): el is TermBlock => el.$type === 'TermBlock') as unknown as TermBlock[]
  const banBlock = bodyElements.find((el): el is BanBlock => el.$type === 'BanBlock') as unknown as BanBlock | undefined
  const invariantBlocks = bodyElements.filter(
    (el): el is InvariantBlock => el.$type === 'InvariantBlock',
  ) as unknown as InvariantBlock[]

  // 4. Term blocks（合并所有 term 块，保留原始顺序）
  const allTerms: TermDecl[] = termBlocks.flatMap((tb) => tb.terms)
  if (allTerms.length > 0) {
    sections.push('## Terms')
    sections.push('')
    for (const term of allTerms) {
      sections.push(serializeTerm(term))
      sections.push('')
    }
  }

  // 5. Ban block
  if (banBlock && banBlock.bans.length > 0) {
    sections.push('## Bans')
    sections.push('')
    sections.push(serializeBan(banBlock))
    sections.push('')
  }

  // 6. Invariant blocks
  if (invariantBlocks.length > 0) {
    sections.push('## Invariants')
    sections.push('')
    for (const block of invariantBlocks) {
      for (const inv of block.invariants) {
        sections.push(serializeInvariant(inv, block))
        sections.push('')
      }
    }
  }

  return {
    md:
      sections
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n',
    name: domain.name,
  }
}

function serializeTerm(term: TermDecl): string {
  const desc = unwrapString(term.desc)
  const slug = slugify(term.name)
  return `:::intent{#term-${slug} type="term" name="${escapeAttr(term.name)}"}
${desc}
:::`
}

function serializeBan(ban: BanBlock): string {
  const items = ban.bans.map((b) => unwrapString(b)).join(', ')
  return `:::intent{#ban-block type="ban" items="${escapeAttr(items)}"}
${items}
:::`
}

function serializeInvariant(inv: InvariantDecl, _block: InvariantBlock): string {
  const attrs: string[] = ['type="invariant"']

  if (inv.value !== undefined) {
    attrs.push(`value="${escapeAttr(unwrapString(inv.value))}"`)
  }
  if (inv.script !== undefined) {
    attrs.push(`script="${escapeAttr(unwrapString(inv.script))}"`)
  }
  if (inv.manual !== undefined) {
    attrs.push(`manual="${escapeAttr(unwrapString(inv.manual))}"`)
  }
  if (inv.scope !== undefined) {
    attrs.push(`scope="${escapeAttr(unwrapString(inv.scope))}"`)
  }

  const body = inv.value ?? inv.script ?? inv.manual ?? inv.scope ?? ''
  return `:::intent{#inv-${slugify(body.slice(0, 20))} ${attrs.join(' ')}}
${body}
:::`
}

// ========================
// Blueprint Decompiler
// ========================

function decompileBlueprint(blueprint: BlueprintDeclaration, options: DecompileOptions): DecompileInternalResult {
  const version = options.version ?? '0.3.0'
  const useFrontmatter = options.frontmatter ?? true

  const sections: string[] = []

  if (useFrontmatter) {
    sections.push(
      serializeFrontmatter({
        entity: 'blueprint',
        name: blueprint.name,
        // v0.3 follow-up: blueprint.version 写入 frontmatter（与 .oxn version=NUMBER 一致）
        version: blueprint.version !== undefined ? String(blueprint.version) : version,
        source_hash: extractSourceHash(blueprint.$container),
      }),
    )
  }

  // v0.3 follow-up: blueprint.version 也写进 body（人类可读）
  if (blueprint.version !== undefined) {
    sections.push(`> Blueprint version: ${blueprint.version}`)
    sections.push('')
  }

  sections.push(`# Blueprint: ${blueprint.name}`)
  sections.push('')

  if (blueprint.descriptions.length > 0) {
    const desc = blueprint.descriptions.map((d) => unwrapString(d.value)).join(' ')
    sections.push(`> ${desc}`)
    sections.push('')
  }

  if (blueprint.props.length > 0) {
    sections.push('## Props')
    sections.push('')
    for (const prop of blueprint.props) {
      sections.push(serializeProp(prop))
      sections.push('')
    }
  }

  if (blueprint.partSlots.length > 0) {
    sections.push('## Slots')
    sections.push('')
    for (const slot of blueprint.partSlots) {
      sections.push(serializeSlot(slot))
      sections.push('')
    }
  }

  return {
    md:
      sections
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n',
    name: blueprint.name,
  }
}

function serializeProp(prop: PropDeclaration): string {
  const slug = slugify(prop.name)
  const typeName = extractTypeName(prop.type)
  // v0.3 follow-up: 处理 default 值 + required 修饰符
  const required = prop.required?.value === true
  const defaultValue = prop.default ? expressionToString(prop.default.value) : undefined

  const attrs: string[] = ['type="prop"', `name="${escapeAttr(prop.name)}"`, `data-type="${typeName}"`]
  if (required) {
    attrs.push('required="true"')
  }
  if (defaultValue !== undefined) {
    attrs.push(`default="${escapeAttr(defaultValue)}"`)
  }

  // body 含 default 值（如有）便于人类阅读
  const body = defaultValue !== undefined ? `${prop.name} property (default: ${defaultValue})` : `${prop.name} property`

  return `:::intent{#prop-${slug} ${attrs.join(' ')}}
${body}
:::`
}

/** 提取 TypeReference 的可读名称（处理 string 原始值 + TypeReference 包装 + AstNode 类型）*/
function extractTypeName(typeRef: PropDeclaration['type']): string {
  if (typeRef === undefined || typeRef === null) return 'string'

  // v0.3 follow-up: PrimitiveType 是 'returns string' 规则，存储为 string 而非 AstNode
  if (typeof typeRef === 'string') {
    return typeRef
  }

  const t = typeRef as {
    $type?: string
    container?: string
    values?: string[]
    inner?: unknown
    $cstNode?: { text?: string }
  }

  // TypeReference 包装节点（PrimitiveType 经 Langium 包装后）
  // 实际类型值存在 $cstNode.text（如 "number" / "boolean" / "string"）
  if (t.$type === 'TypeReference') {
    const cstText = t.$cstNode?.text
    if (cstText) return cstText
    return 'string'
  }

  // EnumType / GenericType / AnyTypeRef 是 AstNode
  if (t.$type === 'EnumType' && t.values) {
    return `enum(${t.values.join('|')})`
  }
  if (t.$type === 'GenericType' && t.container) {
    return `${t.container}<${extractTypeName(t.inner as PropDeclaration['type'])}>`
  }
  if (t.$type === 'AnyTypeRef' || t.$type === 'AnyType') {
    return 'any'
  }
  return 'string'
}

/**
 * 提取 Expression 的可读字符串表示
 *
 * Langium 对 PrimitiveType literal 的处理是「lossy」：LiteralExpr 节点本身不存 value，
 * 实际值存在 $cstNode.text（CST 原文）。这里通过 $cstNode 取回原文。
 */
function expressionToString(expr: unknown): string {
  if (expr === null || expr === undefined) return ''
  if (typeof expr === 'string') return expr
  if (typeof expr === 'number' || typeof expr === 'boolean') return String(expr)
  if (typeof expr !== 'object') return String(expr)

  const e = expr as { $type?: string; value?: unknown; $cstNode?: { text?: string } }
  // TemplateString（v0.2 支持 "包含 ${var} 模板"）
  if (e.$type === 'TemplateString' && typeof e.value === 'string') {
    return e.value
  }
  // LiteralExpr：fallback 到 CST 原文
  if (e.$type === 'LiteralExpr') {
    const text = e.$cstNode?.text
    if (text !== undefined) {
      // 去除两侧引号
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1)
      }
      return text
    }
  }
  // VariableRef（不展开，仅显示 ref 路径）
  if (e.$type === 'VariableRef') {
    const qn = (expr as { path?: { name?: string; segments?: string[] } }).path
    if (qn) {
      return qn.segments?.length ? `${qn.name}.${qn.segments.join('.')}` : (qn.name ?? '')
    }
  }
  return String(expr)
}

function serializeSlot(slot: PartSlotDeclaration): string {
  const slug = slugify(slot.name)
  // v0.3 follow-up: observe 数组以逗号分隔
  const observe = slot.observe.flatMap((o) => o.observes)
  const attrs: string[] = ['type="slot"', `id="${escapeAttr(slot.name)}"`]
  if (slot.deps.length > 0) {
    attrs.push(`deps="${escapeAttr(slot.deps.join(','))}"`)
  }
  if (observe.length > 0) {
    attrs.push(`observe="${escapeAttr(observe.join(','))}"`)
  }

  // body: 第一行是 skill 名，下面是 observe 列表
  const body: string[] = [`- skill: ${slot.name}`]
  for (const o of slot.observe) {
    for (const target of o.observes) {
      body.push(`- observe: ${target}`)
    }
  }

  return `:::intent{#slot-${slug} ${attrs.join(' ')}}
${body.join('\n')}
:::`
}

// ========================
// Work Decompiler
// ========================

function decompileWork(work: WorkDeclaration, options: DecompileOptions): DecompileInternalResult {
  const version = options.version ?? '0.3.0'
  const useFrontmatter = options.frontmatter ?? true

  const sections: string[] = []

  if (useFrontmatter) {
    sections.push(
      serializeFrontmatter({
        entity: 'work',
        name: work.name,
        version,
        source_hash: extractSourceHash(work.$container),
      }),
    )
  }

  sections.push(`# Work: ${work.name}`)
  sections.push('')

  if (work.context) {
    sections.push(serializeWorkContext(work.context))
    sections.push('')
  }

  if (work.tasks.length > 0) {
    sections.push('## Tasks')
    sections.push('')
    for (const task of work.tasks) {
      sections.push(serializeTask(task))
      sections.push('')
    }
  }

  return {
    md:
      sections
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n',
    name: work.name,
  }
}

// v0.3 follow-up: 顶层 task.oxn 反编译器
// work.oxn 内的 task 通过 serializeTask() 复用；standalone task 用 decompileTask()
function decompileTask(task: TaskDeclaration, options: DecompileOptions): DecompileInternalResult {
  const version = options.version ?? '0.3.0'
  const useFrontmatter = options.frontmatter ?? true

  const sections: string[] = []

  if (useFrontmatter) {
    sections.push(
      serializeFrontmatter({
        entity: 'task',
        name: task.name,
        version,
        source_hash: extractSourceHash(task.$container),
      }),
    )
  }

  sections.push(`# Task: ${task.name}`)
  sections.push('')
  sections.push(serializeTask(task))

  return {
    md:
      sections
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n',
    name: task.name,
  }
}

function serializeWorkContext(ctx: WorkContext): string {
  const goal = ctx.goal ? unwrapString(ctx.goal) : ''
  const maxIter = ctx.loopPolicy?.maxIterations ?? 0
  const attrs = ['type="context"', `goal="${escapeAttr(goal)}"`, `max_iterations="${maxIter}"`]
  return `:::intent{#ctx-1 ${attrs.join(' ')}}
${goal}
:::`
}

function serializeTask(task: TaskDeclaration): string {
  const slug = slugify(task.name)
  // v0.3 follow-up: domain/blueprint/parts 在 task.body[] 内任意顺序
  const taskBody = (task.body ?? []) as Array<{ $type: string; domain?: string; blueprint?: string }>
  const taskDomain = taskBody.find((el) => el.$type === 'TaskDomainField')?.domain
  const taskBlueprint = taskBody.find((el) => el.$type === 'TaskBlueprintField')?.blueprint
  const taskParts = taskBody.filter((el) => el.$type === 'TaskPartDecl') as unknown as Array<{
    name: string
    skill_context?: string
    probes?: Array<{ name?: string }>
  }>

  const attrs = ['type="task"', `id="${escapeAttr(task.name)}"`]
  if (taskBlueprint) {
    attrs.push(`blueprint="${escapeAttr(taskBlueprint)}"`)
  }
  if (taskDomain) {
    attrs.push(`domain="${escapeAttr(taskDomain)}"`)
  }

  const body: string[] = []
  if (taskBlueprint) body.push(`- blueprint: ${taskBlueprint}`)
  if (taskDomain) body.push(`- domain: ${taskDomain}`)
  for (const part of taskParts) {
    body.push(`- part: ${part.name}`)
    if (part.skill_context) {
      body.push(`  - skill_context: ${unwrapString(part.skill_context)}`)
    }
    for (const probe of part.probes ?? []) {
      body.push(`  - probe: ${probe.name ?? 'unnamed'}`)
    }
  }

  return `:::intent{#task-${slug} ${attrs.join(' ')}}
${body.join('\n') || task.name}
:::`
}

// ========================
// Frontmatter & Utilities
// ========================

interface FrontmatterData {
  entity: string
  name: string
  version: string
  source_hash?: string
}

function serializeFrontmatter(data: FrontmatterData): string {
  const lines: string[] = ['---']
  lines.push(`entity: ${data.entity}`)
  lines.push(`version: ${data.version}`)
  lines.push(`name: ${data.name}`)
  if (data.source_hash) {
    lines.push(`source_hash: ${data.source_hash}`)
  }
  lines.push('---')
  return lines.join('\n')
}

/** 提取 Langium 文档中嵌入的 source_hash 注释（从 .oxn 文本解析时保留）*/
function extractSourceHash(_container: unknown): string | undefined {
  // 注：Langium 不会把注释存到 AST；source_hash 实际是从原始 .oxn 文本解析
  // 这里返回 undefined（decompiler 阶段不强制嵌入 hash）
  return undefined
}

/** 去除字符串两侧的引号（Langium STRING 终端包含引号）*/
function unwrapString(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1)
  }
  return s
}

/** 转义属性值（用于 :::intent{...} 中的引号转义）*/
function escapeAttr(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ')
}

/** slugify：保留字母数字 + 连字符 */
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'unnamed'
  )
}

// ========================
// 错误类型
// ========================

export class DecompilerParseError extends Error {
  constructor(
    message: string,
    public parseErrors: string[],
  ) {
    super(`[oxl-md-decompiler] ${message}`)
    this.name = 'DecompilerParseError'
  }
}
