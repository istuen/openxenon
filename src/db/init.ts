import { Database } from 'bun:sqlite'
import { CREATE_PROJECTS_TABLE, CREATE_DAEMON_CONFIG_TABLE } from './schema/core'
import { CREATE_CONFIG_TABLE } from './schema/project'

export function initCoreDb(dbPath: string): Database {
  const db = new Database(dbPath)
  db.run(CREATE_PROJECTS_TABLE)
  db.run(CREATE_DAEMON_CONFIG_TABLE)
  return db
}

export function initProjectDb(dbPath: string): Database {
  const db = new Database(dbPath)

  db.run('PRAGMA journal_mode=WAL;')

  db.run(CREATE_CONFIG_TABLE)

  return db
}

export function closeDb(db: Database): void {
  db.close()
}