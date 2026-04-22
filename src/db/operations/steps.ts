/**
 * @deprecated Use stages.ts instead - this file is kept for backward compatibility
 * during the flat schema migration.
 */
import type { Database } from 'bun:sqlite'
import type { StepStatus, StepManifest } from '../../types'
import * as stages from './stages'

export type StepRow = stages.StageRow

export function createStep(
  db: Database,
  _id: string,
  taskId: string,
  name: string,
  spec: string,
  proof: string,
  targetState?: string
): StepRow {
  const blueprintId = taskId
  return stages.createStage(db, blueprintId, name, targetState || spec, spec, proof)
}

export function getStepById(db: Database, id: string): StepRow | null {
  return stages.getStageById(db, id)
}

export function getStepsByTaskId(db: Database, taskId: string): StepRow[] {
  return stages.getStagesByBlueprintId(db, taskId)
}

export function getStepByTaskIdAndName(db: Database, taskId: string, name: string): StepRow | null {
  const steps = stages.getStagesByBlueprintId(db, taskId)
  return steps.find(s => s.name === name) || null
}

export function getNextPendingStep(db: Database, taskId: string): StepRow | null {
  return stages.getNextPendingStage(db, taskId)
}

export function updateStepStatus(db: Database, id: string, status: StepStatus): StepRow | null {
  return stages.updateStageStatus(db, id, status.toUpperCase() as any)
}

export function updateStepHeartbeat(_db: Database, _id: string): void {
}

export function updateStepManifest(_db: Database, _id: string, _manifest: StepManifest): void {
}

export function deleteStep(db: Database, id: string): boolean {
  return stages.deleteStage(db, id)
}
