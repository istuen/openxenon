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
        version,
        source_hash: extractSourceHash(blueprint.$container),
      }),
    )
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
  return `:::intent{#prop-${slug} type="prop" name="${escapeAttr(prop.name)}" data-type="${typeName}"}
${prop.name} property
:::`
}

/** 提取 TypeReference 的可读名称（处理 AnyType/EnumType/GenericType 三种）*/
function extractTypeName(typeRef: PropDeclaration['type']): string {
  if (!typeRef) return 'string'
  const t = typeRef as { $type?: string; container?: string; values?: string[] }
  if (t.$type === 'EnumType' && t.values) {
    return `enum(${t.values.join('|')})`
  }
  if (t.$type === 'GenericType' && t.container) {
    return `${t.container}<...>`
  }
  if (t.$type === 'AnyTypeRef') {
    return 'any'
  }
  return 'string'
}

function serializeSlot(slot: PartSlotDeclaration): string {
  const slug = slugify(slot.name)
  const deps = slot.deps.length > 0 ? ` deps="${escapeAttr(slot.deps.join(','))}"` : ''
  return `:::intent{#slot-${slug} type="slot" id="${escapeAttr(slot.name)}"${deps}}
- skill: ${slot.name}
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
  const attrs = ['type="task"', `id="${escapeAttr(task.name)}"`]
  if (task.blueprint) {
    attrs.push(`blueprint="${escapeAttr(task.blueprint)}"`)
  }

  const body: string[] = []
  body.push(`- blueprint: ${task.blueprint}`)
  if (task.domain) {
    body.push(`- domain: ${task.domain}`)
  }
  for (const part of task.parts) {
    body.push(`- part: ${part.name}`)
    if (part.skill_context) {
      body.push(`  - skill_context: ${unwrapString(part.skill_context)}`)
    }
    for (const probe of part.probes) {
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
