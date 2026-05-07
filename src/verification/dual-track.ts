import { executeProof } from './proof-executor'
import { getTaskDirectory } from '../lib/task-dir'
import { readTaskTrace, appendStageComplete, appendProbeResult } from '../lib/task-trace'
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
      appendStageComplete(taskDir, taskId, stageId, 'PASSED')
    } else {
      appendStageComplete(taskDir, taskId, stageId, 'FAILED')
    }

    appendProbeResult(taskDir, taskId, stageId, 'verification', result.success ? 'PASSED' : 'FAILED', result.output, result.error)

    return {
      success: result.success,
      output: result.output,
      error: result.error
    }
  } catch (error) {
    appendStageComplete(taskDir, taskId, stageId, 'FAILED')

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}