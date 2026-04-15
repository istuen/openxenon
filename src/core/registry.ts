import { randomUUID } from 'crypto'
import type { Database } from 'bun:sqlite'
import type { Project } from '../types'

export function registerProject(
  db: Database, 
  projectPath: string, 
  projectName?: string
): Project {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  
  const stmt = db.prepare(`
    INSERT INTO projects (id, path, name, status, last_heartbeat, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?)
  `)
  
  stmt.run(id, projectPath, projectName || null, now, now, now)
  
  return {
    id,
    path: projectPath,
    name: projectName || '',
    status: 'active',
    lastHeartbeat: now,
    createdAt: now,
    updatedAt: now
  }
}

export function getProjectByPath(db: Database, projectPath: string): Project | null {
  const stmt = db.prepare('SELECT * FROM projects WHERE path = ?')
  const row = stmt.get(projectPath) as any
  
  if (!row) return null
  
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

export function getAllProjects(db: Database): Project[] {
  const stmt = db.prepare('SELECT * FROM projects')
  const rows = stmt.all() as any[]
  
  return rows.map(row => ({
    id: row.id,
    path: row.path,
    name: row.name || '',
    status: row.status,
    lastHeartbeat: row.last_heartbeat,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export function updateProjectHeartbeat(db: Database, projectId: string): void {
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE projects 
    SET last_heartbeat = ?, updated_at = ? 
    WHERE id = ?
  `)
  stmt.run(now, now, projectId)
}

export function archiveProject(db: Database, projectId: string): void {
  const now = Math.floor(Date.now() / 1000)
  const stmt = db.prepare(`
    UPDATE projects 
    SET status = 'archived', updated_at = ? 
    WHERE id = ?
  `)
  stmt.run(now, projectId)
}
