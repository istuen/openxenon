import { randomUUID } from 'crypto'
import type { Database } from 'bun:sqlite'
import type { XnStageStatus } from '../../types'

export interface StageRow {
  id: string
  blueprint_id: string
  name: string
  deps: string
  target: string
  spec: string
  action: string | null
  proof: string
  status: XnStageStatus
  created_at: number
  completed_at: number | null
}

export function createStage(
  db: Database,
  blueprintId: string,
  name: string,
  target: string,
  spec: string,
  proof: string,
  deps: string[] = [],
  action?: string
): StageRow {
  const id = randomUUID()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO stages (id, blueprint_id, name, deps, target, spec, action, proof, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `)

  stmt.run(id, blueprintId, name, JSON.stringify(deps), target, spec, action || null, proof, now)

  return getStageById(db, id)!
}

export function getStageById(db: Database, id: string): StageRow | null {
  const stmt = db.prepare('SELECT * FROM stages WHERE id = ?')
  const row = stmt.get(id) as StageRow | undefined
  return row || null
}

export function getStagesByBlueprintId(db: Database, blueprintId: string): StageRow[] {
  const stmt = db.prepare('SELECT * FROM stages WHERE blueprint_id = ? ORDER BY created_at ASC')
  return stmt.all(blueprintId) as StageRow[]
}

export function getStagesByStatus(db: Database, status: XnStageStatus): StageRow[] {
  const stmt = db.prepare('SELECT * FROM stages WHERE status = ? ORDER BY created_at ASC')
  return stmt.all(status) as StageRow[]
}

export function updateStageStatus(
  db: Database,
  id: string,
  status: XnStageStatus
): StageRow | null {
  const now = Math.floor(Date.now() / 1000)
  const completedAt = status === 'PASSED' || status === 'FAILED' ? now : null

  const stmt = db.prepare(`
    UPDATE stages SET status = ?, completed_at = ? WHERE id = ?
  `)
  stmt.run(status, completedAt, id)

  return getStageById(db, id)
}

export function updateStage(
  db: Database,
  id: string,
  updates: {
    name?: string
    target?: string
    spec?: string
    action?: string
    proof?: string
    deps?: string[]
  }
): StageRow | null {
  const stage = getStageById(db, id)
  if (!stage) return null

  const setClause: string[] = []
  const values: (string | number | null)[] = []

  if (updates.name !== undefined) {
    setClause.push('name = ?')
    values.push(updates.name)
  }
  if (updates.target !== undefined) {
    setClause.push('target = ?')
    values.push(updates.target)
  }
  if (updates.spec !== undefined) {
    setClause.push('spec = ?')
    values.push(updates.spec)
  }
  if (updates.action !== undefined) {
    setClause.push('action = ?')
    values.push(updates.action || null)
  }
  if (updates.proof !== undefined) {
    setClause.push('proof = ?')
    values.push(updates.proof)
  }
  if (updates.deps !== undefined) {
    setClause.push('deps = ?')
    values.push(JSON.stringify(updates.deps))
  }

  if (setClause.length === 0) return stage

  values.push(id)
  const stmt = db.prepare(`UPDATE stages SET ${setClause.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  return getStageById(db, id)
}

export function deleteStage(db: Database, id: string): boolean {
  const stmt = db.prepare('DELETE FROM stages WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

export function getNextPendingStage(db: Database, blueprintId: string): StageRow | null {
  const stmt = db.prepare(`
    SELECT * FROM stages
    WHERE blueprint_id = ? AND status = 'PENDING'
    ORDER BY created_at ASC LIMIT 1
  `)
  return stmt.get(blueprintId) as StageRow | null
}
