/**
 * Task 3.1 — OXN Task 沙箱管理器
 *
 * 实现 Task 本地隔离工作空间：
 * - 将目标 Blueprint 复制到 Task 本地目录
 * - 编译器遵循本地优先原则（同名资产以本地为准）
 * - 允许修改 DAG、增删 Part
 * - expectation 依赖完整性校验（删除被依赖 Part 报错）
 */

// eslint-disable-next-line no-restricted-imports -- TODO(Phase-3): I/O to Infra via injection; kernel should be pure
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { BOUNDARY_DIR } from '../constants'
import { type DagNode, validateDagTopology } from '../schemas/dag-validator'
import type { OxnAssemblyIR, OxnAssemblyPart } from '../schemas/oxn-assembly.schema'

export interface SandboxConfig {
  taskId: string
  projectRoot: string
  /** 源 Blueprint 路径 */
  blueprintPath: string
  /** 是否允许修改 abstract parts */
  allowAbstractMutation?: boolean
  /** 是否允许修改 expectations */
  allowExpectationMutation?: boolean
}

export interface SandboxState {
  taskId: string
  sandboxDir: string
  /** 沙箱内的 Blueprint 路径 */
  sandboxBlueprintPath: string
  /** 原始 Blueprint 路径 */
  originalBlueprintPath: string
  /** 当前沙箱内的 IR */
  currentIR: OxnAssemblyIR
}

export class TaskSandbox {
  /**
   * 创建沙箱：将 Blueprint 复制到 Task 本地目录
   */
  static create(config: SandboxConfig): SandboxState {
    const sandboxDir = join(config.projectRoot, BOUNDARY_DIR, 'tasks', config.taskId, 'sandbox')
    if (!existsSync(sandboxDir)) {
      mkdirSync(sandboxDir, { recursive: true })
    }

    const sandboxBlueprintPath = join(sandboxDir, basename(config.blueprintPath))
    if (!existsSync(sandboxBlueprintPath)) {
      copyFileSync(config.blueprintPath, sandboxBlueprintPath)
    }

    let currentIR: OxnAssemblyIR
    if (config.blueprintPath.endsWith('.json')) {
      currentIR = JSON.parse(readFileSync(config.blueprintPath, 'utf-8')) as OxnAssemblyIR
    } else {
      // YAML → 构造简化 IR
      const { parse: parseYaml } = require('yaml')
      const raw = parseYaml(readFileSync(config.blueprintPath, 'utf-8')) as Record<string, unknown>
      currentIR = {
        id: (raw.name || raw.id || config.taskId) as string,
        name: (raw.name || raw.id || config.taskId) as string,
        type: (raw.type || 'task') as string,
        _version: (raw._version || 1) as number,
        assembly_at: new Date().toISOString(),
        props: [],
        slots: [] as OxnAssemblyIR['slots'],
        blueprintParts: [],
        abstractParts: [],
        concreteParts: [],
        stages: (raw.stages || raw.parts || []) as OxnAssemblyIR['stages'],
        expectations: [] as OxnAssemblyIR['expectations'],
        rules: [] as OxnAssemblyIR['rules'],
      }
    }

    return {
      taskId: config.taskId,
      sandboxDir,
      sandboxBlueprintPath,
      originalBlueprintPath: config.blueprintPath,
      currentIR,
    }
  }

  /**
   * 保存沙箱内的 Blueprint 修改
   */
  static save(state: SandboxState, ir?: OxnAssemblyIR): void {
    const toSave = ir || state.currentIR
    writeFileSync(state.sandboxBlueprintPath, JSON.stringify(toSave, null, 2), 'utf-8')
    if (ir) state.currentIR = ir
  }

  /**
   * 在沙箱内添加新的 concrete part
   */
  static addPart(state: SandboxState, part: OxnAssemblyPart): SandboxState {
    const existing = state.currentIR.concreteParts.find((p) => p.name === part.name)
    if (existing) {
      throw new Error(`Part "${part.name}" 已存在于沙箱中`)
    }
    state.currentIR.concreteParts.push(part)
    return state
  }

  /**
   * 在沙箱内删除 concrete part（需校验 expectation 依赖）
   */
  static removePart(state: SandboxState, partName: string): SandboxState {
    const idx = state.currentIR.concreteParts.findIndex((p) => p.name === partName)
    if (idx === -1) {
      throw new Error(`Part "${partName}" 不存在于沙箱中`)
    }

    // expectation 依赖完整性校验
    for (const exp of state.currentIR.expectations) {
      if (exp.probeRef.includes(partName)) {
        throw new Error(`无法删除 Part "${partName}"：被 expectation "${exp.name}" 依赖`)
      }
    }

    state.currentIR.concreteParts.splice(idx, 1)
    return state
  }

  /**
   * 修改 DAG 拓扑（修改 deps）
   */
  static updateDeps(state: SandboxState, partName: string, deps: string[]): SandboxState {
    const part = state.currentIR.concreteParts.find((p) => p.name === partName)
    if (!part) throw new Error(`Part "${partName}" 不存在`)

    // 构建临时 DAG 校验拓扑
    const dagNodes: DagNode[] = state.currentIR.concreteParts.map((p) => ({
      id: p.name,
      deps: p.name === partName ? deps : [],
    }))
    const result = validateDagTopology(dagNodes)
    if (!result.valid) {
      throw new Error(`DAG 拓扑更新失败: ${result.errors.join('; ')}`)
    }

    // 更新 stage deps
    const stage = state.currentIR.stages.find((s: any) => s.name === partName)
    if (stage) {
      stage.deps = deps
    }

    return state
  }

  /**
   * 本地优先原则：沙箱内的 IR 覆盖全局同名资产
   */
  static resolveWithSandbox(state: SandboxState, globalIR: OxnAssemblyIR): OxnAssemblyIR {
    // 合并：沙箱内的 parts 替换全局同名 parts
    const sandboxPartNames = new Set(state.currentIR.concreteParts.map((p) => p.name))
    const mergedParts = [
      ...globalIR.concreteParts.filter((p) => !sandboxPartNames.has(p.name)),
      ...state.currentIR.concreteParts,
    ]

    return {
      ...globalIR,
      concreteParts: mergedParts,
      stages: [...globalIR.stages.filter((s: any) => !sandboxPartNames.has(s.name)), ...state.currentIR.stages],
    }
  }
}
