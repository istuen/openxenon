import { randomUUID } from 'crypto'
import type { Database } from 'bun:sqlite'
import type { Task, TaskStatus } from '../../types'

export interface TaskRow {
  id: string
  name: string
  status: TaskStatus
  active_blueprint_id: string | null
  created_at: number
  updated_at: number
}

export function createTask(
  db: Database,
  name: string
): Task {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO tasks (id, name, status, created_at, updated_at)
    VALUES (?, ?, 'PENDING', ?, ?)
  `)

  stmt.run(id, name, now, now)

  return getTaskById(db, id)!
}

export function getTaskById(db: Database, id: string): Task | null {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  const row = stmt.get(id) as TaskRow | undefined

  if (!row) return null

  return mapRowToTask(row)
}

export function getAllTasks(db: Database): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC')
  const rows = stmt.all() as TaskRow[]

  return rows.map(mapRowToTask)
}

export function getTasksByStatus(db: Database, status: TaskStatus): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC')
  const rows = stmt.all(status) as TaskRow[]

  return rows.map(mapRowToTask)
}

export function updateTaskStatus(db: Database, id: string, status: TaskStatus): Task | null {
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE tasks
    SET status = ?, updated_at = ?
    WHERE id = ?
  `)

  stmt.run(status, now, id)

  return getTaskById(db, id)
}

export function updateTaskActiveBlueprint(db: Database, id: string, blueprintId: string | null): Task | null {
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE tasks
    SET active_blueprint_id = ?, updated_at = ?
    WHERE id = ?
  `)

  stmt.run(blueprintId, now, id)

  return getTaskById(db, id)
}

export function updateTask(
  db: Database,
  id: string,
  updates: {
    name?: string
    status?: TaskStatus
    activeBlueprintId?: string | null
  }
): Task | null {
  const now = Math.floor(Date.now() / 1000)
  const setClause: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [now]

  if (updates.name !== undefined) {
    setClause.push('name = ?')
    values.push(updates.name)
  }

  if (updates.status !== undefined) {
    setClause.push('status = ?')
    values.push(updates.status)
  }

  if (updates.activeBlueprintId !== undefined) {
    setClause.push('active_blueprint_id = ?')
    values.push(updates.activeBlueprintId)
  }

  values.push(id)

  const stmt = db.prepare(`UPDATE tasks SET ${setClause.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getTaskById(db, id)
}

export function deleteTask(db: Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    status: row.status as TaskStatus,
    activeBlueprintId: row.active_blueprint_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
