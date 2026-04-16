import type { Database } from 'bun:sqlite'
import type { StepStatus, StepManifest } from '../../types'

export interface StepRow {
  id: string
  taskId: string
  name: string
  spec: string
  proof: string
  status: StepStatus
  startedAt: number | null
  completedAt: number | null
  lastHeartbeat: number | null
  manifestSnapshot: StepManifest | null
}

export function createStep(
  db: Database,
  id: string,
  taskId: string,
  name: string,
  spec: string,
  proof: string
): StepRow {
  const stmt = db.prepare(`
    INSERT INTO steps (id, task_id, name, spec, proof, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `)
  
  stmt.run(id, taskId, name, spec, proof)
  
  return getStepById(db, id)!
}

export function getStepById(db: Database, id: string): StepRow | null {
  const stmt = db.prepare('SELECT * FROM steps WHERE id = ?')
  const row = stmt.get(id) as any
  
  if (!row) return null
  
  return mapRowToStep(row)
}

export function getStepsByTaskId(db: Database, taskId: string): StepRow[] {
  const stmt = db.prepare('SELECT * FROM steps WHERE task_id = ? ORDER BY id')
  const rows = stmt.all(taskId) as any[]
  
  return rows.map(mapRowToStep)
}

export function getStepByTaskIdAndName(db: Database, taskId: string, name: string): StepRow | null {
  const stmt = db.prepare('SELECT * FROM steps WHERE task_id = ? AND name = ?')
  const row = stmt.get(taskId, name) as any
  
  if (!row) return null
  
  return mapRowToStep(row)
}

export function getNextPendingStep(db: Database, taskId: string): StepRow | null {
  const stmt = db.prepare('SELECT * FROM steps WHERE task_id = ? AND status = ? ORDER BY id LIMIT 1')
  const row = stmt.get(taskId, 'pending') as any
  
  if (!row) return null
  
  return mapRowToStep(row)
}

export function updateStepStatus(db: Database, id: string, status: StepStatus): StepRow | null {
  const step = getStepById(db, id)
  if (!step) return null
  
  const now = Math.floor(Date.now() / 1000)
  const startedAt = status === 'running' ? now : step.startedAt
  const completedAt = status === 'passed' || status === 'failed' ? now : step.completedAt
  
  const stmt = db.prepare(`
    UPDATE steps 
    SET status = ?, started_at = ?, completed_at = ?
    WHERE id = ?
  `)
  
  stmt.run(status, startedAt, completedAt, id)
  
  return getStepById(db, id)
}

export function updateStepHeartbeat(db: Database, id: string): void {
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE steps 
    SET last_heartbeat = ?
    WHERE id = ?
  `)
  
  stmt.run(now, id)
}

export function updateStepManifest(db: Database, id: string, manifest: StepManifest): void {
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE steps 
    SET manifest_snapshot = ?, last_heartbeat = ?
    WHERE id = ?
  `)
  
  stmt.run(JSON.stringify(manifest), now, id)
}

export function deleteStep(db: Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM steps WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

function mapRowToStep(row: any): StepRow {
  return {
    id: row.id,
    taskId: row.task_id,
    name: row.name,
    spec: row.spec,
    proof: row.proof,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastHeartbeat: row.last_heartbeat,
    manifestSnapshot: row.manifest_snapshot ? JSON.parse(row.manifest_snapshot) : null
  }
}
