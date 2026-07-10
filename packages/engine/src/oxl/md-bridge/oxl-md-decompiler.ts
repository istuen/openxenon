/**
 * md-bridge/oxl-md-decompiler.ts — .oxn → .md 反向编译器
 *
 * v0.3 改革 PR-B（feat/v0.3-t19-md-native-migrate）
 *
 * 角色：
 * - 把 .oxn 文本反编译为 .md 文本
 * - 复用 Langium driver 解析 .oxn
 * - **v0.3 PR-B：完全走 EntityRegistry 路由 → 输出纯 MD（H1/H2/H3 + 嵌套列表）**
 * - 移除 v0.3 v3.2 阶段的 `:::intent{...}` 容器指令（breaking change）
 *
 * 关键不变量：
 * - .md 优先（v0.3 §11.2 锁定）：本函数生成的 .md 是 canonical human-readable
 * - 生成的 .md 可被 `entityRegistry.get(type).parse()` 反向解析回等价 .oxn
 * - 5 类实体均支持（domain/blueprint/work/task/proof）
 * - 旧 `:::intent{...}` 块解析期抛 E_MD_DEPRECATED_SYNTAX（PR-B 切完即弃）
 *
 * L0–L3 兼容性：
 * - L1-OXL 层
 * - 依赖 L0-Processor（Langium driver 已在 L1-OXL 内聚）
 * - 不依赖 L0-Schema
 * - 不依赖 L2-Work / L3
 */

import { URI } from 'langium'
import { createOxnParser, type OxnParseResult } from '../langium-driver/oxn-services.js'
import { computeContentHash } from './oxl-md-source-hash.js'
import { getEntityCompiler, E_OXL_ENTITY_NOT_REGISTERED } from './entity-registry.js'
// 副作用 import：注册 5 个 EntityCompiler（domain/blueprint/work/task/proof）
import './compilers/index.js'
import type { IntentEntityType } from './pipeline.js'

// ========================
// 类型
// ========================

export type { IntentEntityType }

export interface DecompileOptions {
  /** 资产类型（影响 serializer 选择；默认按 AST 节点 $type 探测）*/
  entity?: IntentEntityType
  /** 缩进风格（默认 2 空格，本版本忽略——EntityCompiler 内部固定）*/
  indent?: string
  /** 是否生成 frontmatter（默认 true）*/
  frontmatter?: boolean
  /** md 版本（默认 '0.3.0'）*/
  version?: string
  /** 源文件 SHA-256（嵌入 frontmatter source_hash，可选）*/
  sourceHash?: string
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
 * v0.3 PR-B：所有 5 类实体统一走 EntityRegistry.get(type).compile()
 *
 * @example
 * ```ts
 * const result = await compileOxnToMd(oxnContent, { entity: 'domain' })
 * console.log(result.md)        // 纯 MD 格式（H1 + H2 + H3 + 嵌套列表）
 * console.log(result.name)      // 'OrderContext'
 * console.log(result.contentHash)
 * ```
 */
export async function compileOxnToMd(oxnContent: string, options: DecompileOptions = {}): Promise<DecompileResult> {
  // 1. 解析 .oxn（Langium 驱动）
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

  // 3. 通过 EntityRegistry 路由到对应 compiler
  // （PR-B：完全切到 'native' 路径；'directive' 已废弃）
  let compiler
  try {
    compiler = getEntityCompiler(entityType)
  } catch (err) {
    if (err instanceof Error && err.name === E_OXL_ENTITY_NOT_REGISTERED) {
      throw new DecompilerParseError(`No compiler registered for entity type '${entityType}'`, [])
    }
    throw err
  }

  const compileResult = compiler.compile({
    decl: firstEntity,
    options: {
      version: options.version ?? '0.3.0',
      frontmatter: options.frontmatter ?? true,
      sourceHash: options.sourceHash,
    },
  })

  // 4. contentHash
  const contentHash = computeContentHash(compileResult.md)

  return {
    md: compileResult.md,
    name: compileResult.name,
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
      // 🆕 v0.6.1-alpha.4 Phase 2: Langium 仍用 BlueprintDeclaration 关键字（语法未改）；
      // 但 entity 名映射到新语义（组合模板）。执行模板走 WorkflowDeclaration 路径。
      return 'blueprint'
    case 'StackDeclaration':
      return 'stack'
    case 'RoadmapDeclaration':
      return 'roadmap'
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

// 重新导出 entity-registry 的错误码常量，供 consumer 使用
export { E_OXL_ENTITY_NOT_REGISTERED }
