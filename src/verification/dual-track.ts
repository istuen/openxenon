import type { Database } from 'bun:sqlite'
import { executeProof } from './proof-executor'
import { getTaskDirectory } from '../lib/task-dir'
import { readTaskTrace, updateStageTrace, createProbeResult } from '../lib/task-trace'
import { readBlueprint } from '../lib/blueprint-parser'

export interface VerifyStepOptions {
  projectRoot: string
  taskId: string
  stageId: string
}

export interface VerifyStepResult {
  success: boolean
  output?: string
  error?: string
}

export async function verifyStep(options: VerifyStepOptions): Promise<VerifyStepResult> {
  const { projectRoot, taskId, stageId } = options

  const taskDir = getTaskDirectory(projectRoot, taskId)
  const trace = readTaskTrace(taskDir)

  if (!trace) {
    return { success: false, error: `Task ${taskId} not found` }
  }

  const parsed = readBlueprint(taskDir)
  if (!parsed) {
    return { success: false, error: 'Blueprint not found' }
  }

  const stage = parsed.stages.find(s => s.id === stageId)
  if (!stage) {
    return { success: false, error: `Stage ${stageId} not found` }
  }

  try {
    const result = await executeProof(stageId)

    if (result.success) {
      updateStageTrace(taskDir, stageId, {
        status: 'PASSED',
        completedAt: new Date().toISOString()
      })
    } else {
      updateStageTrace(taskDir, stageId, {
        status: 'FAILED',
        completedAt: new Date().toISOString()
      })
    }

    const stageTrace = trace.stages.find(s => s.stageId === stageId)
    if (stageTrace) {
      stageTrace.probes.push(createProbeResult('verification', result.success ? 'PASSED' : 'FAILED', result.output, result.error))
    }

    return {
      success: result.success,
      output: result.output,
      error: result.error
    }
  } catch (error) {
    updateStageTrace(taskDir, stageId, {
      status: 'FAILED',
      completedAt: new Date().toISOString()
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}