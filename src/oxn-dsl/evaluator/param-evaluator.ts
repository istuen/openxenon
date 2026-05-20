/**
 * Task 1.7 — OXN 参数闭环求值器
 *
 * 实现显式参数映射全链路校验：
 *   Task.props → Blueprint.prop → AbstractPart.params → ConcretePart.prop → Probe.params
 *
 * 三大核心校验：
 *   1. 覆盖率校验：required 参数必须被 Task binding 覆盖
 *   2. 类型一致性校验：prop type 与注入值类型兼容
 *   3. 模板字符串求值：${prop.xxx} 占位符 → 实际值
 *
 * 针对 Langium Scope Provider 的对照物：所有 Props 比对逻辑在此集中实现。
 */

import type { OxnAssemblyProp, OxnAssemblyPart } from '../../kernel/schemas/oxn-assembly.schema'

// ========================
// 类型定义
// ========================

export interface ValidationError {
  kind: 'missing_required' | 'type_mismatch' | 'enum_out_of_range' | 'unknown_field'
  message: string
  details: {
    propName?: string
    expected?: string
    actual?: string
    allowedValues?: string[]
  }
}

export interface CoverageResult {
  valid: boolean
  errors: ValidationError[]
  /** 已覆盖的 prop 名称 */
  covered: string[]
  /** 未覆盖的 required prop */
  missing: string[]
}

export interface TypeCheckResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ParamEvalResult {
  /** 最终解析后的参数值（供 Probe 使用） */
  resolved: Record<string, unknown>
  /** 覆盖率校验结果 */
  coverage: CoverageResult
  /** 类型校验结果 */
  typeCheck: TypeCheckResult
  /** 全部通过 */
  get valid(): boolean
}

// ========================
// 类型系统辅助
// ========================

function getOxnBaseType(typeStr: string): string {
  if (typeStr === 'string' || typeStr === 'number' || typeStr === 'boolean' || typeStr === 'any') {
    return typeStr
  }
  if (typeStr.startsWith('list<')) return 'list'
  if (typeStr.startsWith('map<')) return 'map'
  if (typeStr.startsWith('enum(')) return 'enum'
  return typeStr
}

function getEnumValues(typeStr: string): string[] | null {
  const match = typeStr.match(/^enum\((.+)\)$/)
  if (!match) return null
  return match[1]!.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
}

function typeIsCompatible(value: unknown, type: OxnAssemblyProp): { compatible: boolean; issue?: string } {
  if (value === undefined || value === null) return { compatible: true }

  const baseType = getOxnBaseType(type.type)

  switch (baseType) {
    case 'string':
      return { compatible: typeof value === 'string' }
    case 'number':
      return { compatible: typeof value === 'number', issue: `期望 number，实际 ${typeof value}` }
    case 'boolean':
      return { compatible: typeof value === 'boolean', issue: `期望 boolean，实际 ${typeof value}` }
    case 'any':
      return { compatible: true }
    case 'enum': {
      const allowed = getEnumValues(type.type)
      if (!allowed) return { compatible: true }
      const strVal = String(value)
      const ok = allowed.includes(strVal)
      return {
        compatible: ok,
        issue: ok ? undefined : `值 "${strVal}" 不在枚举 [${allowed.join(', ')}] 中`,
      }
    }
    case 'list':
      return { compatible: Array.isArray(value), issue: `期望 list，实际 ${typeof value}` }
    case 'map':
      return { compatible: typeof value === 'object' && value !== null && !Array.isArray(value) }
    default:
      return { compatible: true }
  }
}

// ========================
// 覆盖率校验
// ========================

/**
 * 验证 Task binding 注入的参数是否覆盖了所有 required 且无 default 的 prop
 */
export function validateParamCoverage(
  props: OxnAssemblyProp[],
  providedParams: Record<string, unknown>
): CoverageResult {
  const errors: ValidationError[] = []
  const covered: string[] = []
  const missing: string[] = []

  for (const prop of props) {
    const hasValue = prop.name in providedParams && providedParams[prop.name] !== undefined
    if (hasValue) {
      covered.push(prop.name)
    } else if (prop.required && prop.default === undefined) {
      missing.push(prop.name)
      errors.push({
        kind: 'missing_required',
        message: `必填参数 "${prop.name}" 未在 Task binding 中注入`,
        details: { propName: prop.name, expected: prop.type },
      })
    }
  }

  return { valid: errors.length === 0, errors, covered, missing }
}

// ========================
// 类型一致性校验
// ========================

/**
 * 验证 Task binding 注入的值类型与 Blueprint prop 声明类型兼容
 */
export function validateTypeConsistency(
  props: OxnAssemblyProp[],
  providedParams: Record<string, unknown>
): TypeCheckResult {
  const errors: ValidationError[] = []

  for (const prop of props) {
    const value = providedParams[prop.name]
    if (value === undefined) continue

    const check = typeIsCompatible(value, prop)
    if (!check.compatible) {
      errors.push({
        kind: 'type_mismatch',
        message: `Prop "${prop.name}" 类型不匹配：${check.issue || `期望 ${prop.type}，实际 ${typeof value}`}`,
        details: { propName: prop.name, expected: prop.type, actual: typeof value },
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

// ========================
// 模板字符串求值
// ========================

/**
 * 将模板字符串中的 ${prop.xxx} 占位符替换为实际参数值
 */
export function resolveTemplateString(template: string, params: Record<string, unknown>): string {
  return template.replace(
    /\$\{prop\.(\w+)\}/g,
    (_match: string, key: string) => {
      const val = params[key]
      return val !== undefined ? String(val) : `\${prop.${key}}`
    }
  )
}

/**
 * 递归求值 params 对象中的模板字符串
 */
export function resolveProbeParams(
  probeParams: Record<string, unknown>,
  partParams: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(probeParams)) {
    if (typeof value === 'string') {
      result[key] = resolveTemplateString(value, partParams)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = resolveProbeParams(value as Record<string, unknown>, partParams)
    } else {
      result[key] = value
    }
  }

  return result
}

// ========================
// 抽象参数验证
// ========================

/**
 * 验证 abstract part 的 params 引用的字段都存在于 concrete part 的 props 中
 */
export function validateAbstractParamFields(
  abstractParams: string[],
  concretePart: OxnAssemblyPart
): TypeCheckResult {
  const errors: ValidationError[] = []
  const concretePropNames = new Set(concretePart.props.map(p => p.name))

  for (const field of abstractParams) {
    if (!concretePropNames.has(field)) {
      errors.push({
        kind: 'unknown_field',
        message: `Abstract part 引用未知字段 "${field}"（目标 part "${concretePart.name}" 中不存在）`,
        details: { propName: field },
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

// ========================
// 主求值流程
// ========================

export interface PartEvalInput {
  /** Concrete part 定义 */
  part: OxnAssemblyPart
  /** Task binding 提供的 prop 值 */
  taskProps: Record<string, unknown>
  /** Abstract part 解析后的参数值 */
  abstractParams?: Record<string, unknown>
}

/**
 * 对单个 concrete part 执行完整的参数闭环求值
 *
 * 流程：
 *   合并 params: taskProps + abstractParams → finalParams
 *   → 覆盖率校验（基于 part.props）
 *   → 类型校验
 *   → 探针模板求值
 */
export function evaluatePartParams(input: PartEvalInput): ParamEvalResult {
  const { part, taskProps, abstractParams } = input

  // Step 1: 合并参数来源
  const merged: Record<string, unknown> = { ...abstractParams, ...taskProps }

  // 补全默认值
  for (const prop of part.props) {
    if (!(prop.name in merged) && prop.default !== undefined) {
      merged[prop.name] = prop.default
    }
  }

  // Step 2: 覆盖率校验
  const coverage = validateParamCoverage(part.props, merged)

  // Step 3: 类型校验
  const typeCheck = validateTypeConsistency(part.props, merged)

  // Step 4: 探针模板求值
  const probeResolved: Record<string, unknown> = {}
  for (const probe of part.probes || []) {
    const probeName = probe.name
    if (probe.params) {
      probeResolved[probeName] = resolveProbeParams(probe.params, merged)
    }
  }

  const result: ParamEvalResult = {
    resolved: merged,
    coverage,
    typeCheck,
    get valid() {
      return coverage.valid && typeCheck.valid
    },
  }

  return result
}

// ========================
// 便捷函数
// ========================

/**
 * 对 Blueprint 中所有 concrete parts 执行参数闭环求值
 */
export function evaluateAllParts(
  parts: OxnAssemblyPart[],
  taskProps: Record<string, unknown>,
  abstractParams?: Record<string, unknown>
): Map<string, ParamEvalResult> {
  const results = new Map<string, ParamEvalResult>()

  for (const part of parts) {
    results.set(part.name, evaluatePartParams({
      part,
      taskProps,
      abstractParams,
    }))
  }

  return results
}

/**
 * 获取所有求值错误
 */
export function collectAllErrors(results: Map<string, ParamEvalResult>): ValidationError[] {
  const errors: ValidationError[] = []
  for (const [, result] of results) {
    errors.push(...result.coverage.errors, ...result.typeCheck.errors)
  }
  return errors
}

/**
 * 格式化所有错误为字符串
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((e, i) => `  ${i + 1}. ${e.message}`).join('\n')
}
