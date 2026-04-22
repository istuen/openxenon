import { randomUUID } from 'crypto'
import type { Database } from 'bun:sqlite'
import type { BlueprintStatus } from '../../types'

export interface BlueprintRow {
  id: string
  task_id: string
  name: string
  status: BlueprintStatus
  created_at: number
}

export function createBlueprint(
  db: Database,
  taskId: string,
  name: string,
  status: BlueprintStatus = 'DRAFT'
): BlueprintRow {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO blueprints (id, task_id, name, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)

  stmt.run(id, taskId, name, status, now)

  return getBlueprintById(db, id)!
}

export function getBlueprintById(db: Database, id: string): BlueprintRow | null {
  const stmt = db.prepare('SELECT * FROM blueprints WHERE id = ?')
  const row = stmt.get(id) as BlueprintRow | undefined
  return row || null
}

export function getBlueprintsByTaskId(db: Database, taskId: string): BlueprintRow[] {
  const stmt = db.prepare('SELECT * FROM blueprints WHERE task_id = ? ORDER BY created_at DESC')
  return stmt.all(taskId) as BlueprintRow[]
}

export function getBlueprintsByStatus(db: Database, status: BlueprintStatus): BlueprintRow[] {
  const stmt = db.prepare('SELECT * FROM blueprints WHERE status = ? ORDER BY created_at DESC')
  return stmt.all(status) as BlueprintRow[]
}

export function updateBlueprintStatus(
  db: Database,
  id: string,
  status: BlueprintStatus
): BlueprintRow | null {
  const stmt = db.prepare('UPDATE blueprints SET status = ? WHERE id = ?')
  stmt.run(status, id)
  return getBlueprintById(db, id)
}

export function getActiveBlueprint(db: Database, taskId: string): BlueprintRow | null {
  const stmt = db.prepare(`
    SELECT b.* FROM blueprints b
    INNER JOIN tasks t ON t.active_blueprint_id = b.id
    WHERE t.id = ?
  `)
  return stmt.get(taskId) as BlueprintRow | null
}

export function deleteBlueprint(db: Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM blueprints WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}
