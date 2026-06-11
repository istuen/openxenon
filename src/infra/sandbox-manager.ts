import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import type { OxnAssemblyIR, OxnAssemblyPart } from '../oxl/schemas/oxn-assembly.schema'
import type { DagNode } from '../kernel/index'

const BOUNDARY_DIR = '.openxenon'

export interface SandboxConfig {
  taskId: string
  projectRoot: string
  blueprintPath: string
  allowAbstractMutation?: boolean
  allowExpectationMutation?: boolean
}

export interface SandboxState {
  taskId: string
  sandboxDir: string
  sandboxBlueprintPath: string
  originalBlueprintPath: string
  currentIR: OxnAssemblyIR
}

export class TaskSandbox {
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

  static save(state: SandboxState, ir?: OxnAssemblyIR): void {
    const toSave = ir || state.currentIR
    writeFileSync(state.sandboxBlueprintPath, JSON.stringify(toSave, null, 2), 'utf-8')
    if (ir) state.currentIR = ir
  }

  static addPart(state: SandboxState, part: OxnAssemblyPart): SandboxState {
    const existing = state.currentIR.concreteParts.find((p) => p.name === part.name)
    if (existing) {
      throw new Error(`Part "${part.name}" 已存在于沙箱中`)
    }
    state.currentIR.concreteParts.push(part)
    return state
  }

  static removePart(state: SandboxState, partName: string): SandboxState {
    const idx = state.currentIR.concreteParts.findIndex((p) => p.name === partName)
    if (idx === -1) {
      throw new Error(`Part "${partName}" 不存在于沙箱中`)
    }

    state.currentIR.concreteParts.splice(idx, 1)
    return state
  }

  static updateDeps(state: SandboxState, partName: string, deps: string[]): SandboxState {
    const part = state.currentIR.concreteParts.find((p) => p.name === partName)
    if (!part) throw new Error(`Part "${partName}" 不存在`)

    const dagNodes: DagNode[] = state.currentIR.concreteParts.map((p) => ({
      id: p.name,
      deps: p.name === partName ? deps : [],
    }))
    const { validateDagTopology } = require('../oxl/validators/blueprint-dag')
    const result = validateDagTopology(dagNodes)
    if (!result.valid) {
      throw new Error(`DAG 拓扑更新失败: ${result.errors.join('; ')}`)
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
