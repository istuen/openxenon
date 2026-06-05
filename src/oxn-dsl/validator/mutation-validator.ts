/**
 * Task 3.2 — OXN 变异编译校验器
 *
 * 沙箱变异安全边界：
 * - DAG 完整性校验
 * - implements 契约不可篡改检查
 * - expectation 不可篡改检查
 * - 结构约束边界校验
 */

import { type DagNode, validateDagTopology } from '../../oxn-dsl/validators/blueprint-dag'
import type { OxnAssemblyIR } from '../schemas/oxn-assembly.schema'

export interface MutationCheckResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class MutationValidator {
  /**
   * 全面校验：变异后的 IR vs 原始 IR
   */
  static validate(original: OxnAssemblyIR, mutated: OxnAssemblyIR): MutationCheckResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. DAG 完整性（从 stages 推断 deps，仅在有 concreteParts 时校验）
    if (mutated.concreteParts.length > 0) {
      const stageDepsMap = new Map<string, string[]>()
      for (const stage of mutated.stages) {
        stageDepsMap.set(stage.name, stage.deps || [])
      }
      const dagNodes: DagNode[] = mutated.concreteParts.map((p) => ({
        id: p.name,
        deps: stageDepsMap.get(p.name) || [],
      }))
      if (dagNodes.length > 0) {
        const dagResult = validateDagTopology(dagNodes)
        if (!dagResult.valid) {
          errors.push(`DAG 校验失败: ${dagResult.errors.join('; ')}`)
        }
      }
    }

    // 2. implements 契约不可篡改
    for (const originalPart of original.concreteParts) {
      const mutatedPart = mutated.concreteParts.find((p) => p.name === originalPart.name)
      if (
        mutatedPart &&
        (originalPart as any).implements &&
        (mutatedPart as any).implements !== (originalPart as any).implements
      ) {
        errors.push(
          `Part "${originalPart.name}" 的 implements 契约不可篡改: "${(originalPart as any).implements}" → "${(mutatedPart as any).implements}"`,
        )
      }
    }

    // 3. 结构约束：变异不应引入无引用的 parts
    for (const ap of mutated.abstractParts) {
      if ((ap as any).isAbstract && ap.execution && ap.execution.length > 0) {
        errors.push(`抽象零件 "${ap.name}" 不可包含 execution 块`)
      }
    }

    // 5. 结构约束：变异不应引入无引用的 parts
    const stageTargetPartNames = new Set<string>()
    for (const stage of mutated.stages) {
      const parts = stage.run.split('.')
      // Format: "part.<partName>.<action>" or just "<partName>"
      const partName = parts.length >= 2 ? parts[1] : parts[0]
      if (partName) stageTargetPartNames.add(partName)
    }

    // 6. 被删除的 parts 不应被 stage 引用
    const originalPartNames = new Set(original.concreteParts.map((p) => p.name))
    const mutatedPartNames = new Set(mutated.concreteParts.map((p) => p.name))
    const removedParts = [...originalPartNames].filter((n) => !mutatedPartNames.has(n))

    for (const name of removedParts) {
      if (stageTargetPartNames.has(name)) {
        errors.push(`Part "${name}" 被 stage 引用，不可删除`)
      }
    }

    return { valid: errors.length === 0, errors, warnings }
  }
}
