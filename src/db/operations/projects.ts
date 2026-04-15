import { randomUUID } from 'crypto'
import type { Database } from 'bun:sqlite'
import type { Project } from '../../types'

export function createProject(
  db: Database, 
  path: string, 
  name?: string
): Project {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  
  const stmt = db.prepare(`
    INSERT INTO projects (id, path, name, status, last_heartbeat, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?)
  `)
  
  stmt.run(id, path, name || null, now, now, now)
  
  return getProjectById(db, id)!
}

export function getProjectById(db: Database, id: string): Project | null {
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  const row = stmt.get(id) as any
  
  if (!row) return null
  
  return mapRowToProject(row)
}

export function getProjectByPath(db: Database, path: string): Project | null {
  const stmt = db.prepare('SELECT * FROM projects WHERE path = ?')
  const row = stmt.get(path) as any
  
  if (!row) return null
  
  return mapRowToProject(row)
}

export function getAllProjects(db: Database): Project[] {
  const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC')
  const rows = stmt.all() as any[]
  
  return rows.map(mapRowToProject)
}

export function updateProject(db: Database, id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
  const project = getProjectById(db, id)
  if (!project) return null
  
  const now = Math.floor(Date.now() / 1000)
  const setClause: string[] = ['updated_at = ?']
  const values: any[] = [now]
  
  if (updates.name !== undefined) {
    setClause.push('name = ?')
    values.push(updates.name)
  }
  
  if (updates.status !== undefined) {
    setClause.push('status = ?')
    values.push(updates.status)
  }
  
  if (updates.lastHeartbeat !== undefined) {
    setClause.push('last_heartbeat = ?')
    values.push(updates.lastHeartbeat)
  }
  
  values.push(id)
  
  const stmt = db.prepare(`
    UPDATE projects 
    SET ${setClause.join(', ')}
    WHERE id = ?
  `)
  
  stmt.run(...values)
  
  return getProjectById(db, id)
}

export function deleteProject(db: Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

function mapRowToProject(row: any): Project {
  return {
    id: row.id,
    path: row.path,
    name: row.name || '',
    status: row.status,
    lastHeartbeat: row.last_heartbeat,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
