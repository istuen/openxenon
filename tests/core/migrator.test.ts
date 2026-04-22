import { describe, expect, test, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { XnMigrator, type XnMigrationUnit } from '../../src/core/migrator'

function createTestMigrator(db: Database): { migrator: XnMigrator; executed: string[] } {
  const executed: string[] = []

  const migrationLoader = (): XnMigrationUnit[] => [
    {
      version: '0001',
      up: (exec) => { exec('CREATE TABLE test1 (id TEXT)'); executed.push('0001') },
      down: (exec) => { exec('DROP TABLE test1') }
    },
    {
      version: '0002',
      up: (exec) => { exec('CREATE TABLE test2 (id TEXT)'); executed.push('0002') },
      down: (exec) => { exec('DROP TABLE test2') }
    },
    {
      version: '0003',
      up: (exec) => { exec('CREATE TABLE test3 (id TEXT)'); executed.push('0003') },
      down: (exec) => { exec('DROP TABLE test3') }
    }
  ]

  const migrator = new XnMigrator({
    dbExec: (sql) => db.exec(sql),
    dbQuery: (sql, params) => {
      const result = db.query(sql).all(...(params || [])) as { version: string }[]
      return result
    },
    migrationLoader
  })

  return { migrator, executed }
}

describe('XnMigrator', () => {
  test('run executes all pending migrations', () => {
    const db = new Database(':memory:')
    const { migrator } = createTestMigrator(db)

    const result = migrator.run()

    expect(result.executed).toEqual(['0001', '0002', '0003'])
    expect(result.errors).toHaveLength(0)

    const tables = db.query(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as { name: string }[]
    expect(tables.map(t => t.name).sort()).toEqual(['_oxn_migrations', 'test1', 'test2', 'test3'])
  })

  test('run is idempotent - skips already executed migrations', () => {
    const db = new Database(':memory:')
    const { migrator, executed } = createTestMigrator(db)

    const r1 = migrator.run()
    expect(r1.executed).toEqual(['0001', '0002', '0003'])

    executed.length = 0
    const r2 = migrator.run()
    expect(r2.executed).toHaveLength(0)
    expect(r2.skipped).toEqual(['0001', '0002', '0003'])
    expect(executed).toHaveLength(0)
  })

  test('getStatus returns correct status', () => {
    const db = new Database(':memory:')
    const { migrator } = createTestMigrator(db)

    const before = migrator.getStatus()
    expect(before.pending).toEqual(['0001', '0002', '0003'])
    expect(before.applied).toHaveLength(0)

    migrator.run()

    const after = migrator.getStatus()
    expect(after.applied).toEqual(['0001', '0002', '0003'])
    expect(after.pending).toHaveLength(0)
  })

  test('getCurrentVersion returns latest version', () => {
    const db = new Database(':memory:')
    const { migrator } = createTestMigrator(db)

    expect(migrator.getCurrentVersion()).toBeNull()

    migrator.run()
    expect(migrator.getCurrentVersion()).toBe('0003')
  })

  test('rollback reverts a migration', () => {
    const db = new Database(':memory:')
    const { migrator } = createTestMigrator(db)

    migrator.run()

    const result = migrator.rollback('0002')

    expect(result.success).toBe(true)

    const tables = db.query(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as { name: string }[]
    expect(tables.map(t => t.name).sort()).toEqual(['_oxn_migrations', 'test1', 'test3'])
  })

  test('rollback fails for non-existent version', () => {
    const db = new Database(':memory:')
    const { migrator } = createTestMigrator(db)

    migrator.run()
    const result = migrator.rollback('9999')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  test('rollback fails for migration without down function', () => {
    const singleMigrationDb = new Database(':memory:')

    const singleMigrationLoader = (): XnMigrationUnit[] => [
      {
        version: '0001',
        up: (exec) => exec('CREATE TABLE test (id TEXT)')
      }
    ]

    const singleMigrator = new XnMigrator({
      dbExec: (sql) => singleMigrationDb.exec(sql),
      dbQuery: (sql) => singleMigrationDb.query(sql).all() as { version: string }[],
      migrationLoader: singleMigrationLoader
    })

    singleMigrator.run()
    const result = singleMigrator.rollback('0001')
    expect(result.success).toBe(false)
    expect(result.error).toContain('does not support rollback')
  })
})
