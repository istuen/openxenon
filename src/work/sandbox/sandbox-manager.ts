/**
 * Task 3.1 — OXN Task 沙箱管理器
 *
 * 实现 Task 本地隔离工作空间：
 * - 将目标 Blueprint 复制到 Task 本地目录
 * - 编译器遵循本地优先原则（同名资产以本地为准）
 * - 允许修改 DAG、增删 Part
 * - expectation 依赖完整性校验（删除被依赖 Part 报错）
 */

import { basename, join } from 'path'
import { BOUNDARY_DIR } from '../../kernel/index'
import { type DagNode, validateDagTopology } from '../../oxl/validators/blueprint-dag'
import type { OxnAssemblyIR, OxnAssemblyPart } from '../../oxl/schemas/oxn-assembly.schema'
import type { FileSystemPort } from '../../kernel/index'

export interface SandboxConfig {
  workId: string
  taskId: string
  projectRoot: string
  blueprintPath: string
  allowAbstractMutation?: boolean
  allowExpectationMutation?: boolean
  fs?: FileSystemPort
}

export interface SandboxState {
  workId: string
  taskId: string
  sandboxDir: string
  sandboxBlueprintPath: string
  originalBlueprintPath: string
  currentIR: OxnAssemblyIR
  fs?: FileSystemPort
}

export class TaskSandbox {
  private static getFs(config: SandboxConfig): FileSystemPort {
    return config.fs!
  }

  static create(config: SandboxConfig): SandboxState {
    const fs = TaskSandbox.getFs(config)
    const sandboxDir = join(config.projectRoot, BOUNDARY_DIR, 'works', config.workId, 'tasks', config.taskId, 'sandbox')
    if (!fs.existsSync(sandboxDir)) {
      fs.mkdirSync(sandboxDir, { recursive: true })
    }

    const sandboxBlueprintPath = join(sandboxDir, basename(config.blueprintPath))
    if (!fs.existsSync(sandboxBlueprintPath)) {
      fs.copyFileSync(config.blueprintPath, sandboxBlueprintPath)
    }

    let currentIR: OxnAssemblyIR
    if (config.blueprintPath.endsWith('.json')) {
      currentIR = JSON.parse(fs.readFileSync(config.blueprintPath, 'utf-8')) as OxnAssemblyIR
    } else {
      const { parse: parseYaml } = require('yaml')
      const raw = parseYaml(fs.readFileSync(config.blueprintPath, 'utf-8')) as Record<string, unknown>
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
      }
    }

    return {
      workId: config.workId,
      taskId: config.taskId,
      sandboxDir,
      sandboxBlueprintPath,
      originalBlueprintPath: config.blueprintPath,
      currentIR,
    }
  }

  static save(state: SandboxState, ir?: OxnAssemblyIR): void {
    const fs = state.fs!
    const toSave = ir || state.currentIR
    fs.writeFileSync(state.sandboxBlueprintPath, JSON.stringify(toSave, null, 2), 'utf-8')
    if (ir) state.currentIR = ir
  }

  static addPart(state: SandboxState, part: OxnAssemblyPart): SandboxState {
    const existing = state.currentIR.concreteParts.find((p) => p.name === part.name)
    if (existing) {
      throw new Error(`Part "${part.name}" already exists in sandbox`)
    }
    state.currentIR.concreteParts.push(part)
    return state
  }

  static removePart(state: SandboxState, partName: string): SandboxState {
    const idx = state.currentIR.concreteParts.findIndex((p) => p.name === partName)
    if (idx === -1) {
      throw new Error(`Part "${partName}" not found in sandbox`)
    }

    state.currentIR.concreteParts.splice(idx, 1)
    return state
  }

  static updateDeps(state: SandboxState, partName: string, deps: string[]): SandboxState {
    const part = state.currentIR.concreteParts.find((p) => p.name === partName)
    if (!part) throw new Error(`Part "${partName}" not found`)

    const dagNodes: DagNode[] = state.currentIR.concreteParts.map((p) => ({
      id: p.name,
      deps: p.name === partName ? deps : [],
    }))
    const result = validateDagTopology(dagNodes)
    if (!result.valid) {
      throw new Error(`DAG topology update failed: ${result.errors.join('; ')}`)
    }

    const stage = state.currentIR.stages.find((s: any) => s.name === partName)
    if (stage) {
      stage.deps = deps
    }

    return state
  }

  static resolveWithSandbox(state: SandboxState, globalIR: OxnAssemblyIR): OxnAssemblyIR {
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
