/**
 * OXN Kernel 适配器 (Slot 范式 v3.0)
 *
 * 将 OXN Assembly IR 转换为 FrozenBlueprint，桥接 OXN DSL 前端与 Core 执行引擎。
 *
 * Slot 范式核心流程：
 *   1. OxnAssemblyIR + OxnAssemblyTaskIR
 *   2. → 构建 stage-based FrozenPart[]（无抽象零件/接口概念）
 *   3. → DAG 拓扑校验
 *   4. → FrozenBlueprint（Core 零感知直接消费）
 */

import type {
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblySlotBinding,
  OxnAssemblyPartProbe,
} from '../schemas/oxn-assembly.schema'
import type { FrozenBlueprint, FrozenPart, FrozenProbe } from '../schemas/frozen-schema'
import { validateFrozenBlueprint, createXenonMeta } from '../schemas/frozen-schema'
import { validateDagTopology, type DagNode } from '../schemas/dag-validator'

export interface AdapterContext {
  taskId: string
  taskName: string
}

export interface AdapterResult {
  frozen: FrozenBlueprint
  warnings: string[]
}

// ========================
// Probe Type Mapping
// ========================

const PROBE_TYPE_MAP: Record<string, string> = {
  'shell-exec': 'shell_exec',
  shell_exec: 'shell_exec',
  'exec-exit-zero': 'exec_exit_zero',
  'fs-exists': 'fs_exists',
  'fs-not-exists': 'fs_not_exists',
  'fs-match': 'fs_match',
  'fs-content-match': 'fs_match',
  'ts-uses-import': 'exec_exit_zero',
}

function normalizeProbeType(rawType: string): string {
  return PROBE_TYPE_MAP[rawType] || rawType
}

// ========================
// Part → Frozen Part
// ========================

export function adaptConcretePart(part: OxnAssemblyPart, resolvedParams: Record<string, unknown>): FrozenPart {
  const finalParams: Record<string, unknown> = { ...resolvedParams }

  for (const prop of part.props) {
    if (finalParams[prop.name] === undefined && prop.default !== undefined) {
      finalParams[prop.name] = prop.default
    }
    if (finalParams[prop.name] === undefined && prop.required) {
      throw new Error(`Part "${part.name}" 缺少必填参数 "${prop.name}"`)
    }
  }

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
      ref: part.name,
      resolvedFrom: 'project',
      content: partContent,
    }),
    id: part.name,
    name: part.name,
    deps: [],
    params: finalParams,
    target: { description: part.description || part.name },
    probes,
  }
}

// ========================
// Template String
// ========================

export function resolveTemplateString(template: string, props: Record<string, unknown>): string {
  return template.replace(/\$\{prop\.(\w+)\}/g, (_match: string, key: string) => {
    const val = props[key]
    return val !== undefined ? String(val) : `\${prop.${key}}`
  })
}

// ========================
// Expression Evaluator
// ========================

export function evaluateExpression(expr: string, props: Record<string, unknown>): unknown {
  if (/^\d+(\.\d+)?$/.test(expr)) return Number(expr)
  if (/^(true|false)$/.test(expr)) return expr === 'true'

  const ternaryMatch = expr.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+?)$/)
  if (ternaryMatch) {
    const condResult = evaluateExpression(ternaryMatch[1]!.trim(), props)
    if (condResult) {
      return evaluateExpression(ternaryMatch[2]!.trim(), props)
    }
    return evaluateExpression(ternaryMatch[3]!.trim(), props)
  }

  const propMatch = expr.match(/^prop\.(.+)$/)
  if (propMatch) {
    return props[propMatch[1]!] ?? `prop.${propMatch[1]!}`
  }

  if (expr.startsWith('"') && expr.endsWith('"')) {
    return expr.slice(1, -1)
  }

  return expr
}

// ========================
// Slot Binding 解析
// ========================

function resolveSlotBindings(
  bindings: OxnAssemblySlotBinding[],
  _slots: Array<{ name: string; run?: string }>,
): Record<string, OxnAssemblySlotBinding> {
  const result: Record<string, OxnAssemblySlotBinding> = {}
  for (const b of bindings) {
    result[b.slot] = b
  }
  return result
}

// ========================
// 主适配器
// ========================

export class OxnKernelAdapter {
  adapt(ir: OxnAssemblyIR, slotBindings: OxnAssemblySlotBinding[], _ctx?: AdapterContext): AdapterResult {
    const warnings: string[] = []

    const boundSlots = resolveSlotBindings(slotBindings, ir.slots)

    const slotDepsMap = new Map<string, string[]>()
    for (const slot of ir.slots) {
      slotDepsMap.set(slot.name, slot.deps || [])
    }

    const frozenParts: FrozenPart[] = []
    const partIdSet = new Set<string>()

    // A 类: blueprintParts (具象声明)
    if (ir.blueprintParts && ir.blueprintParts.length > 0) {
      for (const part of ir.blueprintParts) {
        if (partIdSet.has(part.name)) {
          warnings.push(`重复的 blueprintPart: "${part.name}"`)
          continue
        }
        partIdSet.add(part.name)
        frozenParts.push({
          _xenon_meta: createXenonMeta({
            ref: part.name,
            resolvedFrom: 'project',
            content: JSON.stringify({ id: part.name, name: part.name }),
          }),
          id: part.name,
          name: part.name,
          deps: (part as any).deps || [],
          params: {},
          target: { description: part.description || part.name },
          probes: [],
        })
      }
    }

    // B 类: slots (插槽声明) — 需要 Task slotBinding 填充
    for (const slot of ir.slots) {
      const slotBinding = boundSlots[slot.name]
      if (partIdSet.has(slot.name)) continue
      partIdSet.add(slot.name)

      const resolvedParams: Record<string, unknown> = {}
      if (slotBinding?.props) {
        Object.assign(resolvedParams, slotBinding.props)
      }

      frozenParts.push({
        _xenon_meta: createXenonMeta({
          ref: slotBinding?.ref || slot.name,
          resolvedFrom: 'project',
          content: JSON.stringify({ id: slot.name, name: slot.name }),
        }),
        id: slot.name,
        name: slot.name,
        deps: slot.deps || [],
        params: resolvedParams,
        target: { description: slotBinding?.ref || slot.name },
        probes: [],
      })
    }

    // Legacy: concreteParts (从 .oxn 文件内联的 Part) — 与 slot 合并
    if (ir.concreteParts.length > 0) {
      for (const part of ir.concreteParts) {
        const slotBinding = Array.from(Object.entries(boundSlots))
          .find(([, b]) => b.ref && b.ref.split('/').pop() === part.name)?.[1]

        const resolvedParams: Record<string, unknown> = {}
        if (slotBinding?.props) {
          Object.assign(resolvedParams, slotBinding.props)
        }

        const frozenPart = adaptConcretePart(part, resolvedParams)

        // 找到引用该 concrete part 的 slot，合并 deps + 使用 slot name
        const matchingSlot = Array.from(Object.entries(boundSlots))
          .find(([, b]) => b.ref && b.ref.split('/').pop() === part.name)
        if (matchingSlot) {
          const [slotName] = matchingSlot
          const slotDeps = slotDepsMap.get(slotName) || []
          frozenPart.deps = slotDeps
          // 替换之前 slot 生成的空壳
          const existingIdx = frozenParts.findIndex((p) => p.id === slotName)
          if (existingIdx >= 0) {
            frozenParts[existingIdx] = {
              ...frozenPart,
              id: slotName,
              name: slotName,
            }
          } else {
            partIdSet.add(part.name)
            frozenParts.push(frozenPart)
          }
        } else {
          if (partIdSet.has(part.name)) continue
          partIdSet.add(part.name)
          frozenPart.deps = slotDepsMap.get(part.name) || []
          frozenParts.push(frozenPart)
        }
      }
    }

    const dagNodes: DagNode[] = frozenParts.map((p) => ({
      id: p.id,
      deps: p.deps || [],
    }))
    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      throw new Error(`DAG 验证失败: ${dagResult.errors.join('; ')}`)
    }

    const frozen: FrozenBlueprint = {
      id: ir.id,
      name: ir.name,
      frozen_at: new Date().toISOString(),
      parts: frozenParts,
    }

    validateFrozenBlueprint(frozen)

    return { frozen, warnings }
  }

  adaptStrict(ir: OxnAssemblyIR, slotBindings: OxnAssemblySlotBinding[]): FrozenBlueprint {
    const result = this.adapt(ir, slotBindings)
    if (result.warnings.length > 0) {
      throw new Error(`Adapter warnings: ${result.warnings.join('; ')}`)
    }
    return result.frozen
  }
}

// ========================
// 便捷导出
// ========================

export function adaptOxnToFrozen(assembly: OxnAssemblyIR, slotBindings?: OxnAssemblySlotBinding[]): AdapterResult {
  return new OxnKernelAdapter().adapt(assembly, slotBindings || [])
}
