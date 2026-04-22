import type { Database } from 'bun:sqlite'
import { updateStepStatus, getStepById, updateStepHeartbeat } from '../db/operations/steps'
import { createProofLog } from '../db/operations/proof-logs'
import { executeProof } from './proof-executor'
import { ManifestWatcher } from '../watcher'

export interface VerifyStepOptions {
  db: Database
  stepId: string
  proofPath: string
}

export interface VerifyStepResult {
  success: boolean
  output?: string
  error?: string
}

export async function verifyStep(options: VerifyStepOptions): Promise<VerifyStepResult> {
  const { db, stepId, proofPath } = options

  const step = getStepById(db, stepId)
  if (!step) {
    return { success: false, error: `Step ${stepId} not found` }
  }

updateStepStatus(db, stepId, 'RUNNING')
    updateStepHeartbeat(db, stepId)

    try {
      const result = await executeProof(proofPath)

      createProofLog(
        db,
        stepId,
        step.proof,
        result.success ? 'PASSED' : 'FAILED',
        result.output
      )

      if (result.success) {
        updateStepStatus(db, stepId, 'PASSED')
      } else {
        updateStepStatus(db, stepId, 'FAILED')
      }

      return {
        success: result.success,
        output: result.output,
        error: result.error
      }
    } catch (error) {
      updateStepStatus(db, stepId, 'FAILED')
    
    createProofLog(
      db,
      stepId,
      step.proof,
      'failure',
      error instanceof Error ? error.message : String(error)
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export interface EscapeMonitorOptions {
  db: Database
  manifestPath: string
  taskId: string
  escapeTimeout?: number
  onEscape?: (stepId: string) => void
}

export function startEscapeMonitor(options: EscapeMonitorOptions): ManifestWatcher {
  const watcher = new ManifestWatcher({
    db: options.db,
    manifestPath: options.manifestPath,
    taskId: options.taskId,
    escapeTimeout: options.escapeTimeout,
    onEscape: (manifest) => {
      if (options.onEscape) {
        options.onEscape(manifest.stepId)
      }
    }
  })

  watcher.watch()

  return watcher
}
