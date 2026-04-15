import type { Database } from 'bun:sqlite'

export interface ProofLog {
  id: number
  stepId: string
  proofName: string
  result: 'success' | 'failure'
  output: string | null
  executedAt: number
}

export function createProofLog(
  db: Database,
  stepId: string,
  proofName: string,
  result: 'success' | 'failure',
  output?: string
): ProofLog {
  const executedAt = Math.floor(Date.now() / 1000)
  
  const stmt = db.prepare(`
    INSERT INTO proof_logs (step_id, proof_name, result, output, executed_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  
  const insertResult = stmt.run(
    stepId, 
    proofName, 
    result, 
    output || null, 
    executedAt
  )
  
  return {
    id: insertResult.lastInsertRowid as number,
    stepId,
    proofName,
    result,
    output: output || null,
    executedAt
  }
}

export function getProofLogById(db: Database, id: number): ProofLog | null {
  const stmt = db.prepare('SELECT * FROM proof_logs WHERE id = ?')
  const row = stmt.get(id) as any
  
  if (!row) return null
  
  return mapRowToProofLog(row)
}

export function getProofLogsByStepId(db: Database, stepId: string): ProofLog[] {
  const stmt = db.prepare('SELECT * FROM proof_logs WHERE step_id = ? ORDER BY executed_at DESC')
  const rows = stmt.all(stepId) as any[]
  
  return rows.map(mapRowToProofLog)
}

export function getProofLogsByResult(db: Database, result: 'success' | 'failure'): ProofLog[] {
  const stmt = db.prepare('SELECT * FROM proof_logs WHERE result = ? ORDER BY executed_at DESC')
  const rows = stmt.all(result) as any[]
  
  return rows.map(mapRowToProofLog)
}

export function getAllProofLogs(db: Database): ProofLog[] {
  const stmt = db.prepare('SELECT * FROM proof_logs ORDER BY executed_at DESC')
  const rows = stmt.all() as any[]
  
  return rows.map(mapRowToProofLog)
}

function mapRowToProofLog(row: any): ProofLog {
  return {
    id: row.id,
    stepId: row.step_id,
    proofName: row.proof_name,
    result: row.result,
    output: row.output,
    executedAt: row.executed_at
  }
}
