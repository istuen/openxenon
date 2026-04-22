import { existsSync } from 'fs'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import { missingProjectPath, projectNotFound } from './errors'
import { initProjectDb } from '../db/init'
import { isOldSchema, migrateProjectDb } from '../core/legacy-migration'

export interface ProjectContext {
  projectPath: string
  dbPath: string
  db: Database
}

const projectDatabases: Map<string, Database> = new Map()

export function loadProjectContext(projectPath: string | null): ProjectContext | Response {
  if (!projectPath) {
    return missingProjectPath()
  }

  const xenonixPath = join(projectPath, '.openxenon')
  const dbPath = join(xenonixPath, 'project.oxn')

  if (!existsSync(dbPath)) {
    return projectNotFound(projectPath)
  }

  let db = projectDatabases.get(projectPath)

  if (!db) {
    db = initProjectDb(dbPath)
    projectDatabases.set(projectPath, db)

    if (isOldSchema(db)) {
      console.log('Detected old schema, migrating to new flat schema...')
      const result = migrateProjectDb(db)
      if (result.success) {
        console.log(`Migration complete: ${result.tasksMigrated} tasks, ${result.blueprintsCreated} blueprints, ${result.stagesCreated} stages`)
      } else {
        console.error('Migration failed:', result.errors)
      }
    }
  }

  return {
    projectPath,
    dbPath,
    db
  }
}

export function closeProjectDatabases(): void {
  for (const [path, db] of projectDatabases) {
    try {
      db.close()
    } catch (error) {
      console.error(`Failed to close database for ${path}:`, error)
    }
  }
  projectDatabases.clear()
}