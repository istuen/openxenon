import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { initCoreDb, initProjectDb, closeDb } from '../../src/db/init'

describe('Database Initialization', () => {
  const testDir = join(process.cwd(), 'test-temp')
  let coreDb: Database
  let projectDb: Database

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (coreDb) closeDb(coreDb)
    if (projectDb) closeDb(projectDb)
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should initialize core.oxn with projects table', () => {
    coreDb = initCoreDb(join(testDir, 'core.oxn'))
    
    const result = coreDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get()
    expect(result).toBeDefined()
  })

  it('should initialize project.oxn with all required tables', () => {
    projectDb = initProjectDb(join(testDir, 'project.oxn'))
    
    const tables = ['tasks', 'steps', 'escape_logs', 'proof_logs']
    
    for (const table of tables) {
      const result = projectDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`).get()
      expect(result).toBeDefined()
    }
  })

  it('should enable WAL mode for project.oxn', () => {
    projectDb = initProjectDb(join(testDir, 'project.oxn'))
    
    const result = projectDb.prepare('PRAGMA journal_mode').get() as any
    expect(result.journal_mode).toBe('wal')
  })
})
