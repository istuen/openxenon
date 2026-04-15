import { Database } from 'bun:sqlite'
import { CREATE_PROJECTS_TABLE } from './schema/core'
import { 
  CREATE_TASKS_TABLE, 
  CREATE_STEPS_TABLE, 
  CREATE_ESCAPE_LOGS_TABLE, 
  CREATE_PROOF_LOGS_TABLE 
} from './schema/project'
import { CREATE_INDEXES } from './schema/indexes'

export function initCoreDb(dbPath: string): Database {
  const db = new Database(dbPath)
  db.run(CREATE_PROJECTS_TABLE)
  return db
}

export function initProjectDb(dbPath: string): Database {
  const db = new Database(dbPath)
  
  db.run('PRAGMA journal_mode=WAL;')
  
  db.run(CREATE_TASKS_TABLE)
  db.run(CREATE_STEPS_TABLE)
  db.run(CREATE_ESCAPE_LOGS_TABLE)
  db.run(CREATE_PROOF_LOGS_TABLE)
  
  for (const createIndex of CREATE_INDEXES) {
    db.run(createIndex)
  }
  
  return db
}

export function closeDb(db: Database): void {
  db.close()
}
