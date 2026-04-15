import type { BuiltInProofDefinition, ProofInput, ProofExecutionContext, ProofOutput } from '../../types/proof'
import { registerBuiltInProof } from '../built-in-proofs-registry'

export const dbQueryBoolProof: BuiltInProofDefinition = {
  id: 'db_query_bool',
  name: 'Database Query Boolean',
  layer: 'L3',
  description: 'Execute a SQL query and check if the result is truthy',
  
  validateInput(input: ProofInput): boolean {
    return (
      typeof input.connection === 'string' && 
      input.connection.length > 0 &&
      typeof input.sql === 'string' &&
      input.sql.length > 0
    )
  },
  
  async execute(input: ProofInput, _context: ProofExecutionContext): Promise<ProofOutput> {
    const connection = input.connection as string
    const sql = input.sql as string
    
    try {
      let result: unknown
      
      if (connection.startsWith('postgres://') || connection.startsWith('postgresql://')) {
        const { Client } = require('pg')
        const client = new Client({ connectionString: connection })
        await client.connect()
        
        const res = await client.query(sql)
        await client.end()
        
        result = res.rows[0]?.[Object.keys(res.rows[0])[0]]
      } else if (connection.startsWith('mysql://')) {
        const mysql = require('mysql2/promise')
        const conn = await mysql.createConnection(connection)
        
        const [rows] = await conn.execute(sql)
        await conn.end()
        
        result = (rows as any[])[0]?.[Object.keys((rows as any[])[0])[0]]
      } else if (connection.startsWith('sqlite:') || connection.endsWith('.db') || connection.endsWith('.sqlite')) {
        const Database = require('better-sqlite3')
        const dbPath = connection.replace('sqlite:', '')
        const db = new Database(dbPath)
        
        const row = db.prepare(sql).get()
        db.close()
        
        result = row ? row[Object.keys(row)[0]] : null
      } else {
        return {
          success: false,
          message: `Unsupported database connection: ${connection}`
        }
      }
      
      const isTruthy = Boolean(result)
      
      if (isTruthy) {
        return {
          success: true,
          message: `Query returned truthy value: ${result}`,
          data: {
            connection: connection.substring(0, 50) + '...',
            sql,
            result: String(result),
            truthy: true
          }
        }
      } else {
        return {
          success: false,
          message: `Query returned falsy value: ${result}`,
          data: {
            connection: connection.substring(0, 50) + '...',
            sql,
            result: String(result),
            truthy: false
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Database query error: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

registerBuiltInProof(dbQueryBoolProof)
