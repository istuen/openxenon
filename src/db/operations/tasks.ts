import { randomUUID } from 'crypto'
import type { Database } from 'bun:sqlite'
import type { Task, Playbook, TaskStatus } from '../../types'

export function createTask(
  db: Database, 
  name: string, 
  playbook: Playbook
): Task {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  
  const stmt = db.prepare(`
    INSERT INTO tasks (id, name, playbook, status, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `)
  
  stmt.run(id, name, JSON.stringify(playbook), now, now)
  
  return getTaskById(db, id)!
}

export function getTaskById(db: Database, id: string): Task | null {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  const row = stmt.get(id) as any
  
  if (!row) return null
  
  return mapRowToTask(row)
}

export function getAllTasks(db: Database): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC')
  const rows = stmt.all() as any[]
  
  return rows.map(mapRowToTask)
}

export function getTasksByStatus(db: Database, status: TaskStatus): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC')
  const rows = stmt.all(status) as any[]
  
  return rows.map(mapRowToTask)
}

export function updateTaskStatus(db: Database, id: string, status: TaskStatus): Task | null {
  const task = getTaskById(db, id)
  if (!task) return null
  
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE tasks 
    SET status = ?, updated_at = ?
    WHERE id = ?
  `)
  
  stmt.run(status, now, id)
  
  return getTaskById(db, id)
}

export function updateTask(db: Database, id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
  const task = getTaskById(db, id)
  if (!task) return null
  
  const now = Math.floor(Date.now() / 1000)
  const setClause: string[] = ['updated_at = ?']
  const values: any[] = [now]
  
  if (updates.name !== undefined) {
    setClause.push('name = ?')
    values.push(updates.name)
  }
  
  if (updates.playbook !== undefined) {
    setClause.push('playbook = ?')
    values.push(JSON.stringify(updates.playbook))
  }
  
  if (updates.status !== undefined) {
    setClause.push('status = ?')
    values.push(updates.status)
  }
  
  values.push(id)
  
  const stmt = db.prepare(`
    UPDATE tasks 
    SET ${setClause.join(', ')}
    WHERE id = ?
  `)
  
  stmt.run(...values)
  
  return getTaskById(db, id)
}

export function deleteTask(db: Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

function mapRowToTask(row: any): Task {
  return {
    id: row.id,
    name: row.name,
    playbook: JSON.parse(row.playbook),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
