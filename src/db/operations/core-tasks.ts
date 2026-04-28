import { randomUUID } from 'crypto'
import type { Database } from 'bun:sqlite'

export interface CoreTaskRow {
  id: string
  project_path: string
  blueprint_path: string
  status: string
  created_at: number
  updated_at: number
}

export type CoreTaskStatus = 'CREATED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'

export interface CoreTask {
  id: string
  projectPath: string
  blueprintPath: string
  status: CoreTaskStatus
  createdAt: number
  updatedAt: number
}

export function createCoreTask(
  db: Database,
  projectPath: string,
  blueprintPath: string
): CoreTask {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO tasks (id, project_path, blueprint_path, status, created_at, updated_at)
    VALUES (?, ?, ?, 'CREATED', ?, ?)
  `)

  stmt.run(id, projectPath, blueprintPath, now, now)

  return getCoreTaskById(db, id)!
}

export function getCoreTaskById(db: Database, id: string): CoreTask | null {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  const row = stmt.get(id) as CoreTaskRow | undefined

  if (!row) return null

  return mapRowToCoreTask(row)
}

export function getAllCoreTasks(db: Database): CoreTask[] {
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC')
  const rows = stmt.all() as CoreTaskRow[]

  return rows.map(mapRowToCoreTask)
}

export function getCoreTasksByProject(db: Database, projectPath: string): CoreTask[] {
  const stmt = db.prepare('SELECT * FROM tasks WHERE project_path = ? ORDER BY created_at DESC')
  const rows = stmt.all(projectPath) as CoreTaskRow[]

  return rows.map(mapRowToCoreTask)
}

export function getCoreTasksByStatus(db: Database, status: CoreTaskStatus): CoreTask[] {
  const stmt = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC')
  const rows = stmt.all(status) as CoreTaskRow[]

  return rows.map(mapRowToCoreTask)
}

export function updateCoreTaskStatus(db: Database, id: string, status: CoreTaskStatus): CoreTask | null {
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE tasks
    SET status = ?, updated_at = ?
    WHERE id = ?
  `)

  stmt.run(status, now, id)

  return getCoreTaskById(db, id)
}

export function deleteCoreTask(db: Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

function mapRowToCoreTask(row: CoreTaskRow): CoreTask {
  return {
    id: row.id,
    projectPath: row.project_path,
    blueprintPath: row.blueprint_path,
    status: row.status as CoreTaskStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}