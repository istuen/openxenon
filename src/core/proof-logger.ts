import type { ProofResult } from '../types/proof'
import type { Database } from 'bun:sqlite'

export interface ProofLogEntry {
  id?: number
  proofId: string
  category: 'built-in' | 'project' | 'global'
  passed: boolean
  executionTime: number
  timestamp: number
  projectId?: string
  taskId?: string
  stepId?: string
  input?: string
  output?: string
  error?: string
  searchPaths?: string
}

export class ProofLogger {
  constructor(private db: Database) {}
  
  logBuiltInProof(
    proofId: string,
    result: ProofResult,
    executionTime: number,
    metadata?: {
      projectId?: string
      taskId?: string
      stepId?: string
      input?: unknown
    }
  ): void {
    const entry: ProofLogEntry = {
      proofId,
      category: 'built-in',
      passed: result.passed,
      executionTime,
      timestamp: Date.now(),
      ...metadata,
      input: metadata?.input ? JSON.stringify(metadata.input) : undefined,
      output: result.output ? JSON.stringify(result.output) : undefined,
      error: result.error
    }
    
    this.insertLog(entry)
  }
  
  logCustomProof(
    proofId: string,
    category: 'project' | 'global',
    result: ProofResult,
    executionTime: number,
    _filePath: string,
    metadata?: {
      projectId?: string
      taskId?: string
      stepId?: string
      input?: unknown
    }
  ): void {
    const entry: ProofLogEntry = {
      proofId,
      category,
      passed: result.passed,
      executionTime,
      timestamp: Date.now(),
      ...metadata,
      input: metadata?.input ? JSON.stringify(metadata.input) : undefined,
      output: result.output ? JSON.stringify(result.output) : undefined,
      error: result.error
    }
    
    this.insertLog(entry)
  }
  
  logCircuitBreaker(
    proofId: string,
    searchPaths: string[],
    reason: string,
    metadata?: {
      projectId?: string
      taskId?: string
      stepId?: string
    }
  ): void {
    const entry: ProofLogEntry = {
      proofId,
      category: 'built-in',
      passed: false,
      executionTime: 0,
      timestamp: Date.now(),
      ...metadata,
      error: reason,
      searchPaths: searchPaths.join('; ')
    }
    
    this.insertLog(entry)
  }
  
  private insertLog(entry: ProofLogEntry): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO proof_logs (
          proof_id, category, passed, execution_time, timestamp,
          project_id, task_id, step_id, input, output, error, search_paths
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        entry.proofId,
        entry.category,
        entry.passed ? 1 : 0,
        entry.executionTime,
        entry.timestamp,
        entry.projectId || null,
        entry.taskId || null,
        entry.stepId || null,
        entry.input || null,
        entry.output || null,
        entry.error || null,
        entry.searchPaths || null
      )
    } catch (error) {
      console.error('Failed to insert proof log:', error)
    }
  }
  
  getLogs(filters?: {
    proofId?: string
    category?: string
    passed?: boolean
    projectId?: string
    taskId?: string
    limit?: number
  }): ProofLogEntry[] {
    try {
      let query = 'SELECT * FROM proof_logs WHERE 1=1'
      const params: any[] = []
      
      if (filters?.proofId) {
        query += ' AND proof_id = ?'
        params.push(filters.proofId)
      }
      
      if (filters?.category) {
        query += ' AND category = ?'
        params.push(filters.category)
      }
      
      if (filters?.passed !== undefined) {
        query += ' AND passed = ?'
        params.push(filters.passed ? 1 : 0)
      }
      
      if (filters?.projectId) {
        query += ' AND project_id = ?'
        params.push(filters.projectId)
      }
      
      if (filters?.taskId) {
        query += ' AND task_id = ?'
        params.push(filters.taskId)
      }
      
      query += ' ORDER BY timestamp DESC'
      
      if (filters?.limit) {
        query += ' LIMIT ?'
        params.push(filters.limit)
      }
      
      const stmt = this.db.prepare(query)
      const rows = stmt.all(...params) as any[]
      
      return rows.map(row => ({
        id: row.id,
        proofId: row.proof_id,
        category: row.category,
        passed: row.passed === 1,
        executionTime: row.execution_time,
        timestamp: row.timestamp,
        projectId: row.project_id || undefined,
        taskId: row.task_id || undefined,
        stepId: row.step_id || undefined,
        input: row.input || undefined,
        output: row.output || undefined,
        error: row.error || undefined,
        searchPaths: row.search_paths || undefined
      }))
    } catch (error) {
      console.error('Failed to get proof logs:', error)
      return []
    }
  }
}
