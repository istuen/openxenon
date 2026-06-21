/**
 * md-bridge/mdast-validator.ts — 5 类 E_MD_xxx 错误校验
 *
 * v0.3 阶段 1 T4 任务
 *
 * 角色：
 * - 实现 5 类 E_MD_xxx 错误校验
 * - E_MD_REFERENCE_BROKEN 分级：内部 = Fatal，外部 = Warn
 * - 提供 ValidationContext 注入 EntityType / 来源路径
 *
 * 5 类错误：
 * 1. E_MD_INVALID_SYNTAX     — mdast 解析失败
 * 2. E_MD_MISSING_REQUIRED   — 必填字段缺失（如 frontmatter.entity）
 * 3. E_MD_TYPE_MISMATCH      — 字段类型不符
 * 4. E_MD_REFERENCE_BROKEN_FATAL — 内部 Intent 引用断链
 * 5. E_MD_REFERENCE_BROKEN_WARN  — 外部 URL/路径断链
 *
 * 关键不变量：
 * - 校验失败时抛 ValidationError（不静默 return）
 * - 内部 vs 外部引用判定：target.startsWith('.openxenon/') = 内部
 * - Fatal 错误阻断 Proof；Warn 仅警告不阻断
 */

import { runMdPipeline, type IntentBlock, type PipelineOutput } from './pipeline.js'

// ========================
// 错误类型
// ========================

export type E_MD_xxx =
  | 'E_MD_INVALID_SYNTAX'
  | 'E_MD_MISSING_REQUIRED'
  | 'E_MD_TYPE_MISMATCH'
  | 'E_MD_REFERENCE_BROKEN_FATAL'
  | 'E_MD_REFERENCE_BROKEN_WARN'
  | 'E_MD_HASH_MISMATCH'

export interface ValidationIssue {
  code: E_MD_xxx
  message: string
  line?: number
  column?: number
  rule?: string
  field?: string
}

export interface ValidationResult {
  /** 是否通过（无 Fatal 错误）*/
  valid: boolean
  /** Fatal 错误（必须修复）*/
  errors: ValidationIssue[]
  /** Warning（不阻断 Proof）*/
  warnings: ValidationIssue[]
  /** 校验时间（ms）*/
  validateTime: number
}

export class ValidationError extends Error {
  constructor(
    public issues: ValidationIssue[],
    message?: string,
  ) {
    super(message ?? `Validation failed: ${issues.length} issues`)
    this.name = 'ValidationError'
  }
}

// ========================
// 校验上下文
// ========================

export interface ValidationContext {
  /** 资产类型（domain/blueprint/work/task/proof）*/
  entity: 'domain' | 'blueprint' | 'work' | 'task' | 'proof'
  /** 文件路径（用于错误信息）*/
  filePath?: string
  /** 已知的内部 Intent 资产列表（用于 reference 校验）*/
  knownInternalAssets?: Set<string>
  /** 已知 hash（用于 hash mismatch 校验）*/
  expectedHash?: string
  /** 自定义必填字段（覆盖默认）*/
  requiredFields?: string[]
}

// ========================
// 主入口
// ========================

/**
 * 校验 .md 内容（5 类 E_MD_xxx）
 *
 * @throws ValidationError 当存在 Fatal 错误时
 */
export function validateMdast(content: string, ctx: ValidationContext): ValidationResult {
  const startTime = Date.now()
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  // 1. 解析 pipeline
  const pipelineResult = runMdPipeline({
    content,
    entity: ctx.entity,
    filePath: ctx.filePath,
  })

  // 2. E_MD_INVALID_SYNTAX
  if (!pipelineResult.success) {
    for (const err of pipelineResult.errors) {
      errors.push({
        code: 'E_MD_INVALID_SYNTAX',
        message: err.message,
        line: err.line,
        column: err.column,
        rule: err.rule,
      })
    }
    return finalize(errors, warnings, startTime)
  }

  // 3. E_MD_MISSING_REQUIRED
  const requiredFields = ctx.requiredFields ?? defaultRequiredFields(ctx.entity)
  for (const field of requiredFields) {
    if (!hasFieldMdast(pipelineResult, field)) {
      errors.push({
        code: 'E_MD_MISSING_REQUIRED',
        message: `Required field missing: ${field}`,
        field,
      })
    }
  }

  // 4. E_MD_TYPE_MISMATCH
  const typeErrors = validateTypes(pipelineResult, ctx)
  errors.push(...typeErrors)

  // 5. E_MD_REFERENCE_BROKEN_FATAL / E_MD_REFERENCE_BROKEN_WARN
  //    (校验所有 intent 块中的引用)
  const refIssues = validateReferences(pipelineResult.intents, ctx)
  for (const issue of refIssues) {
    if (issue.code === 'E_MD_REFERENCE_BROKEN_FATAL') {
      errors.push(issue)
    } else {
      warnings.push(issue)
    }
  }

  // 6. E_MD_HASH_MISMATCH（如果提供了 expectedHash）
  if (ctx.expectedHash && ctx.expectedHash !== pipelineResult.contentHash) {
    errors.push({
      code: 'E_MD_HASH_MISMATCH',
      message: `Content hash mismatch: expected ${ctx.expectedHash}, got ${pipelineResult.contentHash}`,
      field: 'contentHash',
    })
  }

  return finalize(errors, warnings, startTime)
}

// ========================
// 校验规则
// ========================

/** 默认必填字段（按 entity 类型）*/
function defaultRequiredFields(entity: ValidationContext['entity']): string[] {
  const common = ['entity', 'version']
  switch (entity) {
    case 'domain':
      return [...common, 'name']
    case 'blueprint':
      return [...common, 'name']
    case 'work':
      return [...common, 'name']
    case 'task':
      return [...common, 'name', 'work']
    case 'proof':
      return [...common, 'name']
  }
}

/** 检查字段是否存在 */
function hasFieldMdast(result: PipelineOutput, field: string): boolean {
  if (field === 'contentHash') return !!result.contentHash
  // 检查所有已知 frontmatter 字段（entity/version/status/intent/name/work 等）
  return result.frontmatter[field] !== undefined
}

/** 校验字段类型 */
function validateTypes(result: PipelineOutput, _ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // entity 必须是 5 类之一
  if (result.frontmatter.entity) {
    const valid = ['domain', 'blueprint', 'work', 'task', 'proof']
    if (!valid.includes(String(result.frontmatter.entity))) {
      issues.push({
        code: 'E_MD_TYPE_MISMATCH',
        message: `Invalid entity type: ${String(result.frontmatter.entity)} (expected: ${valid.join('|')})`,
        field: 'entity',
      })
    }
  }

  // version 必须是 v<X.Y.Z> 或 <X.Y.Z> 格式
  if (result.frontmatter.version) {
    const versionPattern = /^v?\d+\.\d+\.\d+$/
    if (!versionPattern.test(String(result.frontmatter.version))) {
      issues.push({
        code: 'E_MD_TYPE_MISMATCH',
        message: `Invalid version format: ${String(result.frontmatter.version)} (expected: v<X.Y.Z> or <X.Y.Z>)`,
        field: 'version',
      })
    }
  }

  // status 必须是已知值
  if (result.frontmatter.status) {
    const valid = ['active', 'archived', 'draft', 'wip', 'done']
    if (!valid.includes(String(result.frontmatter.status))) {
      issues.push({
        code: 'E_MD_TYPE_MISMATCH',
        message: `Invalid status: ${String(result.frontmatter.status)} (expected: ${valid.join('|')})`,
        field: 'status',
      })
    }
  }

  return issues
}

/** 校验引用（intents 中的 id / scope / ref 等）*/
function validateReferences(intents: IntentBlock[], ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const intent of intents) {
    // 检查 scope 字段（指向 internal/external 资产）
    const scope = intent.attributes.scope
    if (!scope) continue

    if (scope.startsWith('.openxenon/')) {
      // 内部 Intent 资产
      if (ctx.knownInternalAssets && !ctx.knownInternalAssets.has(scope)) {
        issues.push({
          code: 'E_MD_REFERENCE_BROKEN_FATAL',
          message: `Internal Intent asset not found: ${scope}`,
          field: `intent.attributes.scope`,
        })
      }
    } else {
      // 外部 URL/路径（仅警告，不阻断）
      // v0.3 阶段 1 简化：仅检查格式
      const isUrl = /^https?:\/\//.test(scope)
      const isRelative = scope.startsWith('./') || scope.startsWith('../')
      if (!isUrl && !isRelative) {
        issues.push({
          code: 'E_MD_REFERENCE_BROKEN_WARN',
          message: `External reference may be invalid: ${scope}`,
          field: `intent.attributes.scope`,
        })
      }
    }

    // 检查 ref 字段（如果有）
    const ref = intent.attributes.ref
    if (ref) {
      if (ref.startsWith('@prj/') || ref.startsWith('@oxn/')) {
        // 内部 OXL 引用
        if (ctx.knownInternalAssets && !ctx.knownInternalAssets.has(ref)) {
          issues.push({
            code: 'E_MD_REFERENCE_BROKEN_FATAL',
            message: `Internal OXL ref not found: ${ref}`,
            field: `intent.attributes.ref`,
          })
        }
      }
      // 外部 ref 跳过（v0.3 阶段 1 简化）
    }
  }

  return issues
}

function finalize(errors: ValidationIssue[], warnings: ValidationIssue[], startTime: number): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validateTime: Date.now() - startTime,
  }
}

// ========================
// 严格模式（抛异常）
// ========================

/**
 * 严格校验：失败时抛 ValidationError
 */
export function validateMdastStrict(content: string, ctx: ValidationContext): ValidationResult {
  const result = validateMdast(content, ctx)
  if (!result.valid) {
    throw new ValidationError(result.errors)
  }
  return result
}

/**
 * 重导出 MdastParseError（保持向后兼容）
 */
export { MdastParseError } from './remark-to-mdast.js'
