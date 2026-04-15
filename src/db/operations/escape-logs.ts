import type { Database } from 'bun:sqlite'

export interface EscapeLog {
  id: number
  taskId: string
  stepId: string
  detectedAt: number
  manifestBefore: string | null
  manifestAfter: string | null
}

export function createEscapeLog(
  db: Database,
  taskId: string,
  stepId: string,
  manifestBefore?: string,
  manifestAfter?: string
): EscapeLog {
  const detectedAt = Math.floor(Date.now() / 1000)
  
  const stmt = db.prepare(`
    INSERT INTO escape_logs (task_id, step_id, detected_at, manifest_before, manifest_after)
    VALUES (?, ?, ?, ?, ?)
  `)
  
  const result = stmt.run(
    taskId, 
    stepId, 
    detectedAt, 
    manifestBefore || null, 
    manifestAfter || null
  )
  
  return {
    id: result.lastInsertRowid as number,
    taskId,
    stepId,
    detectedAt,
    manifestBefore: manifestBefore || null,
    manifestAfter: manifestAfter || null
  }
}

export function getEscapeLogById(db: Database, id: number): EscapeLog | null {
  const stmt = db.prepare('SELECT * FROM escape_logs WHERE id = ?')
  const row = stmt.get(id) as any
  
  if (!row) return null
  
  return mapRowToEscapeLog(row)
}

export function getEscapeLogsByTaskId(db: Database, taskId: string): EscapeLog[] {
  const stmt = db.prepare('SELECT * FROM escape_logs WHERE task_id = ? ORDER BY detected_at DESC')
  const rows = stmt.all(taskId) as any[]
  
  return rows.map(mapRowToEscapeLog)
}

export function getEscapeLogsByStepId(db: Database, stepId: string): EscapeLog[] {
  const stmt = db.prepare('SELECT * FROM escape_logs WHERE step_id = ? ORDER BY detected_at DESC')
  const rows = stmt.all(stepId) as any[]
  
  return rows.map(mapRowToEscapeLog)
}

export function getAllEscapeLogs(db: Database): EscapeLog[] {
  const stmt = db.prepare('SELECT * FROM escape_logs ORDER BY detected_at DESC')
  const rows = stmt.all() as any[]
  
  return rows.map(mapRowToEscapeLog)
}

function mapRowToEscapeLog(row: any): EscapeLog {
  return {
    id: row.id,
    taskId: row.task_id,
    stepId: row.step_id,
    detectedAt: row.detected_at,
    manifestBefore: row.manifest_before,
    manifestAfter: row.manifest_after
  }
}
