import { Database } from 'bun:sqlite'
import { CREATE_PROJECTS_TABLE, CREATE_DAEMON_CONFIG_TABLE, CREATE_TASKS_TABLE as CREATE_CORE_TASKS_TABLE } from './schema/core'
import {
  CREATE_TASKS_TABLE as CREATE_PROJECT_TASKS_TABLE,
  CREATE_BLUEPRINTS_TABLE,
  CREATE_STAGES_TABLE,
  CREATE_ESCAPE_LOGS_TABLE,
  CREATE_PROOF_LOGS_TABLE,
  CREATE_CONFIG_TABLE,
  BLUEPRINTS_INDEXES,
  STAGES_INDEXES
} from './schema/project'

export function initCoreDb(dbPath: string): Database {
  const db = new Database(dbPath)
  db.run(CREATE_PROJECTS_TABLE)
  db.run(CREATE_DAEMON_CONFIG_TABLE)
  db.run(CREATE_CORE_TASKS_TABLE)
  return db
}

export function initProjectDb(dbPath: string): Database {
  const db = new Database(dbPath)

  db.run('PRAGMA journal_mode=WAL;')

  db.run(CREATE_PROJECT_TASKS_TABLE)
  db.run(CREATE_BLUEPRINTS_TABLE)
  db.run(CREATE_STAGES_TABLE)
  db.run(CREATE_ESCAPE_LOGS_TABLE)
  db.run(CREATE_PROOF_LOGS_TABLE)
  db.run(CREATE_CONFIG_TABLE)

  for (const createIndex of [...BLUEPRINTS_INDEXES, ...STAGES_INDEXES]) {
    db.run(createIndex)
  }

  return db
}

export function closeDb(db: Database): void {
  db.close()
}