/**
 * Task 1.6 — OXN Kernel 适配器
 *
 * 将 OXN Assembly IR 转换为 FrozenBlueprint，桥接 OXN DSL 前端与 Core 执行引擎。
 *
 * 核心流程：
 *   1. OxnAssemblyIR + OxnAssemblyTaskBinding
 *   2. → isAbstract 防御性检查（未绑定 abstractPart → 拒绝）
 *   3. → 参数解析：abstractPart.params + taskBinding.propBindings → concreteParams
 *   4. → 模板求值：concretePart.probe.params 中的 ${prop.xxx} → 实际值
 *   5. → DAG 拓扑校验
 *   6. → FrozenBlueprint（Core 零感知直接消费）
 */

import type {
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyTaskBinding,
  OxnAssemblyProp,
  OxnAssemblyPartProbe,
} from '../schemas/oxn-assembly.schema'
import type { FrozenBlueprint, FrozenPart, FrozenProbe } from '../schemas/frozen-schema'
import { validateFrozenBlueprint, computeContentHash, createXenonMeta, type XenonMeta } from '../schemas/frozen-schema'
import { validateDagTopology, type DagNode } from '../schemas/dag-validator'

// ========================
// 类型接口
// ========================

export interface AdapterContext {
  taskId: string
  taskName: string
}

export interface AdapterResult {
  frozen: FrozenBlueprint
  warnings: string[]
}

// ========================
// isAbstract 防御性校验
// ========================

export interface AbstractBindingValidation {
  valid: boolean
  errors: string[]
}

/**
 * 验证所有 abstractPart 都已在 Task binding 中具象化绑定。
 * 未绑定的 abstractPart 拒绝进入 DAG，防止运行时空指针。
 */
export function validateAbstractBindings(
  ir: OxnAssemblyIR,
  binding: OxnAssemblyTaskBinding
): AbstractBindingValidation {
  const errors: string[] = []

  for (const ap of ir.abstractParts) {
    if (!binding.partBindings[ap.name]) {
      errors.push(
        `Abstract part "${ap.name}" 未在 Task binding 中绑定。` +
        `请在 binding 中指定: ${ap.name} = "@scope/part/name"`
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

// ========================
// 参数解析引擎
// ========================

/**
 * 解析模板字符串中的 ${prop.xxx} 占位符
 */
export function resolveTemplateString(template: string, props: Record<string, unknown>): string {
  return template.replace(
    /\$\{prop\.(\w+)\}/g,
    (_match: string, key: string) => {
      const val = props[key]
      return val !== undefined ? String(val) : `\${prop.${key}}`
    }
  )
}

/**
 * 解析 abstract part 的 params 表达式
 *
 * abstract part params 是将 blueprint props 映射到 concrete part props 的表达式。
 * 格式：{ target_part_attr = blueprint_prop_expr }
 *
 * 支持：
 *   - prop.xxx 引用：target_env = prop.env
 *   - 三元表达式：coverage_threshold = prop.env == "prod" ? 95 : prop.coverage
 *   - 字面量：timeout = 60000
 */
export function resolveAbstractParams(
  abstractParams: Record<string, string>,     // key → 表达式字符串
  blueprintProps: Record<string, unknown>     // Blueprint + Task 注入后的最终 props
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [targetProp, expr] of Object.entries(abstractParams)) {
    result[targetProp] = evaluateExpression(expr, blueprintProps)
  }

  return result
}

/**
 * 简易表达式求值器
 *
 * 支持的表达式：
 *   prop.xxx             → props["xxx"]
 *   "string literal"     → string literal (去掉引号)
 *   number               → number
 *   true / false         → boolean
 *   expr ? val1 : val2   → 三元表达式
 *   expr == expr         → 比较
 *   expr != expr         → 比较
 *   expr && expr         → 逻辑与
 *   expr || expr         → 逻辑或
 */
function evaluateExpression(expr: string, props: Record<string, unknown>): unknown {
  const trimmed = expr.trim()

  // 字符串字面量（双引号）—— 先于 prop. 检查
  if (/^"[^"]*"$/.test(trimmed)) {
    return trimmed.slice(1, -1)
  }

  // 布尔
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  // 数字
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  // 简单 prop.xxx 引用（无空格，无运算符）
  if (/^prop\.\w+$/.test(trimmed)) {
    return props[trimmed.slice(5)]
  }

  // 三元表达式 a ? b : c —— 必须在比较/逻辑之前
  // 使用非贪心匹配避免与 == 号冲突
  const ternaryMatch = trimmed.match(/^(.+?)\s*\?\s*(.+)\s*:\s*(.+)$/)
  if (ternaryMatch) {
    const [, condStr, thenStr, elseStr] = ternaryMatch
    const cond = evaluateExpression(condStr!, props)
    return cond ? evaluateExpression(thenStr!, props) : evaluateExpression(elseStr!, props)
  }

  // 逻辑或 —— 最低优先级
  const orMatch = trimmed.match(/^(.+?)\s*\|\|\s*(.+)$/)
  if (orMatch) {
    const [, leftStr, rightStr] = orMatch
    return Boolean(evaluateExpression(leftStr!, props)) || Boolean(evaluateExpression(rightStr!, props))
  }

  // 逻辑与
  const andMatch = trimmed.match(/^(.+?)\s*&&\s*(.+)$/)
  if (andMatch) {
    const [, leftStr, rightStr] = andMatch
    return Boolean(evaluateExpression(leftStr!, props)) && Boolean(evaluateExpression(rightStr!, props))
  }

  // 比较表达式 a op b
  const cmpMatch = trimmed.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/)
  if (cmpMatch) {
    const [, leftStr, op, rightStr] = cmpMatch
    const left = evaluateExpression(leftStr!, props)
    const right = evaluateExpression(rightStr!, props)
    switch (op) {
      case '==': return left === right
      case '!=': return left !== right
      case '<': return Number(left) < Number(right)
      case '>': return Number(left) > Number(right)
      case '<=': return Number(left) <= Number(right)
      case '>=': return Number(left) >= Number(right)
    }
  }

  // 默认返回原字符串
  return trimmed
}

// ========================
// Probe type normalization
// ========================

const PROBE_TYPE_MAP: Record<string, string> = {
  'shell-exec': 'shell_exec',
  'fs-exists': 'fs_exists',
  'fs-not-exists': 'fs_not_exists',
  'fs-match': 'fs_match',
  'fs-content-match': 'fs_match',
  'exec-exit-zero': 'exec_exit_zero',
  'exec-output-match': 'exec_output_match',
}

function normalizeProbeType(rawType: string): string {
  return PROBE_TYPE_MAP[rawType] || rawType
}

// ========================
// Assembly Part → Frozen Part
// ========================

/**
 * 将 OxnAssemblyConcretePart 转换为 FrozenPart
 *
 * 流程：
 *   params 合并: task.props → abstract.params → concrete.defaults
 *   probe.params 模板求值
 */
export function adaptConcretePart(
  part: OxnAssemblyPart,
  resolvedParams: Record<string, unknown>
): FrozenPart {
  // 合并：resolved params + part prop defaults
  const finalParams: Record<string, unknown> = { ...resolvedParams }

  for (const prop of part.props) {
    if (finalParams[prop.name] === undefined && prop.default !== undefined) {
      finalParams[prop.name] = prop.default
    }
    if (finalParams[prop.name] === undefined && prop.required) {
      throw new Error(`Part "${part.name}" 缺少必填参数 "${prop.name}"`)
    }
  }

  // 转换 probes，对模板字符串求值
  const probes: FrozenProbe[] = (part.probes || []).map((p: OxnAssemblyPartProbe, idx: number) => {
    const probeParams: Record<string, unknown> = {}
    if (p.params) {
      for (const [key, value] of Object.entries(p.params)) {
        if (typeof value === 'string') {
          probeParams[key] = resolveTemplateString(value, finalParams)
        } else {
          probeParams[key] = value
        }
      }
    }
    const probeType = normalizeProbeType(p.ref?.split('/').pop() || 'unknown')
    const probeContent = JSON.stringify({ type: probeType, params: probeParams })
    return {
      _xenon_meta: createXenonMeta({
        ref: p.ref || `inline-probe-${idx}`,
        resolvedFrom: 'project',
        content: probeContent,
      }),
      type: probeType,
      params: probeParams,
    }
  })

  const partContent = JSON.stringify({ id: part.name, name: part.name })
  return {
    _xenon_meta: createXenonMeta({
      ref: part.implements ? `${part.name}` : part.name,
      resolvedFrom: 'project',
      content: partContent,
    }),
    id: part.name,
    name: part.implements ? `${part.name} (implements ${part.implements})` : part.name,
    deps: [],
    params: finalParams,
    target: { description: part.description || part.name },
    spec: part.implements
      ? { description: `实现 ${part.implements} 能力` }
      : undefined,
    probes,
  }
}

// ========================
// 主适配器
// ========================

/**
 * OxnKernelAdapter — OXN Assembly IR → FrozenBlueprint 转换器
 *
 * 用法：
 *   const adapter = new OxnKernelAdapter()
 *   const result = adapter.adapt(assemblyIR, taskBinding, ctx)
 *   // result.frozen → FrozenBlueprint（可直接交 Core 执行）
 */
export class OxnKernelAdapter {
  /**
   * 完整的适配流程
   */
  adapt(
    ir: OxnAssemblyIR,
    binding: OxnAssemblyTaskBinding,
    ctx?: AdapterContext
  ): AdapterResult {
    const warnings: string[] = []

    // Step 1: isAbstract 防御性检查
    const absCheck = validateAbstractBindings(ir, binding)
    if (!absCheck.valid) {
      throw new Error(`Abstract binding 校验失败:\n${absCheck.errors.join('\n')}`)
    }

    // Step 2: 构建 Blueprint 级 props（Task binding propBindings + Blueprint prop defaults）
    const blueprintProps: Record<string, unknown> = { ...binding.propBindings }
    for (const prop of ir.props) {
      if (!(prop.name in blueprintProps) && prop.default !== undefined) {
        blueprintProps[prop.name] = prop.default
      }
    }

    // Step 3: 解析 abstract parts → 每个 abstract part 的 params → resolvedPartParams
    const allAbstractParams: Record<string, Record<string, string>> = {}
    for (const ap of ir.abstractParts) {
      if (ap.params) {
        const paramsMap: Record<string, string> = {}
        for (const [key, expr] of Object.entries(ap.params)) {
          paramsMap[key] = typeof expr === 'string' ? expr : String(expr)
        }
        allAbstractParams[ap.name] = paramsMap
      }
    }

    // 合并所有 abstract parts 的 resolved params
    const resolvedPartParams: Record<string, unknown> = {}
    for (const [, paramsMap] of Object.entries(allAbstractParams)) {
      const resolved = resolveAbstractParams(paramsMap, blueprintProps)
      Object.assign(resolvedPartParams, resolved)
    }

    // Step 4: 构建 stage → FrozenPart deps 映射
    const stageDepsMap = new Map<string, string[]>()
    for (const stage of ir.stages) {
      stageDepsMap.set(stage.name, stage.deps || [])
    }

    // Step 5: 转换 concrete parts → FrozenPart[]，注入 deps
    const frozenParts: FrozenPart[] = []
    const partIdSet = new Set<string>()

    for (const part of ir.concreteParts) {
      if (partIdSet.has(part.name)) {
        warnings.push(`重复的 concrete part: "${part.name}"`)
        continue
      }
      partIdSet.add(part.name)

      const frozenPart = adaptConcretePart(part, resolvedPartParams)
      // 从 stages 中查找对应的 deps
      const stageDeps = stageDepsMap.get(part.name) || []
      frozenPart.deps = stageDeps
      frozenParts.push(frozenPart)
    }

    // Step 6: DAG 拓扑校验
    const dagNodes: DagNode[] = frozenParts.map(p => ({
      id: p.id,
      deps: p.deps || [],
    }))
    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      throw new Error(`DAG 验证失败: ${dagResult.errors.join('; ')}`)
    }

    // Step 6: 构建 FrozenBlueprint
    const frozen: FrozenBlueprint = {
      id: ir.id,
      name: ir.name,
      frozen_at: new Date().toISOString(),
      parts: frozenParts,
    }

    // Step 7: 终态校验
    validateFrozenBlueprint(frozen)

    return { frozen, warnings }
  }

  /**
   * 快速适配（不带 warnings）
   */
  adaptStrict(
    ir: OxnAssemblyIR,
    binding: OxnAssemblyTaskBinding
  ): FrozenBlueprint {
    const result = this.adapt(ir, binding)
    if (result.warnings.length > 0) {
      throw new Error(`Adapter warnings: ${result.warnings.join('; ')}`)
    }
    return result.frozen
  }
}

// ========================
// 便捷函数
// ========================

const _defaultAdapter = new OxnKernelAdapter()

export function adaptOxnToFrozen(
  ir: OxnAssemblyIR,
  binding: OxnAssemblyTaskBinding,
  ctx?: AdapterContext
): AdapterResult {
  return _defaultAdapter.adapt(ir, binding, ctx)
}

export function adaptOxnToFrozenStrict(
  ir: OxnAssemblyIR,
  binding: OxnAssemblyTaskBinding
): FrozenBlueprint {
  return _defaultAdapter.adaptStrict(ir, binding)
}
