/**
 * XnMigrator - 跨运行时数据库迁移引擎
 *
 * 纯逻辑层，不依赖任何运行时 API (bun:sqlite / better-sqlite3 等)
 * 所有运行时差异通过构造函数注入的函数回调抹平
 */

export interface XnMigrationUnit {
  version: string
  up(dbExec: (sql: string) => void): void
  down?: (dbExec: (sql: string) => void) => void
}

export interface XnMigrationResult {
  executed: string[]
  skipped: string[]
  errors: Array<{ version: string; error: string }>
}

export interface XnMigratorOptions {
  dbExec: (sql: string) => void
  dbQuery: (sql: string, params?: unknown[]) => unknown[]
  migrationLoader: () => XnMigrationUnit[]
  onStartVersion?: (version: string) => void
  onErrorVersion?: (version: string, error: string) => void
}

export class XnMigrator {
  private dbExec: (sql: string) => void
  private dbQuery: (sql: string, params?: unknown[]) => unknown[]
  private migrationLoader: () => XnMigrationUnit[]
  private onStartVersion?: (version: string) => void
  private onErrorVersion?: (version: string, error: string) => void

  constructor(options: XnMigratorOptions) {
    this.dbExec = options.dbExec
    this.dbQuery = options.dbQuery
    this.migrationLoader = options.migrationLoader
    this.onStartVersion = options.onStartVersion
    this.onErrorVersion = options.onErrorVersion
  }

  /**
   * 执行所有待执行的迁移
   * 幂等设计：已执行的版本会被跳过
   */
  public run(): XnMigrationResult {
    this.ensureMigrationsTable()

    const result: XnMigrationResult = {
      executed: [],
      skipped: [],
      errors: []
    }

    const applied = new Set(
      this.dbQuery(
        'SELECT version FROM _oxn_migrations ORDER BY version ASC'
      ).map((r: unknown) => (r as { version: string }).version)
    )

    const pending = this.migrationLoader()
      .filter(m => {
        if (applied.has(m.version)) {
          result.skipped.push(m.version)
          return false
        }
        return true
      })
      .sort((a, b) => a.version.localeCompare(b.version))

    for (const migration of pending) {
      this.onStartVersion?.(migration.version)

      try {
        migration.up(this.dbExec)
        this.dbExec(
          `INSERT INTO _oxn_migrations (version, applied_at) VALUES ('${migration.version}', unixepoch())`
        )
        result.executed.push(migration.version)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        this.onErrorVersion?.(migration.version, errMsg)
        result.errors.push({ version: migration.version, error: errMsg })
      }
    }

    return result
  }

  /**
   * 回滚指定版本的迁移
   */
  public rollback(version: string): { success: boolean; error?: string } {
    const applied = this.dbQuery(
      `SELECT version FROM _oxn_migrations WHERE version = '${version}'`
    )

    if (applied.length === 0) {
      return { success: false, error: `Migration ${version} not found or not applied` }
    }

    const migration = this.migrationLoader().find(m => m.version === version)

    if (!migration) {
      return { success: false, error: `Migration ${version} not found in loader` }
    }

    if (!migration.down) {
      return { success: false, error: `Migration ${version} does not support rollback` }
    }

    try {
      migration.down(this.dbExec)
      this.dbExec(`DELETE FROM _oxn_migrations WHERE version = '${version}'`)
      return { success: true }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      return { success: false, error: errMsg }
    }
  }

  /**
   * 获取迁移状态
   */
  public getStatus(): { applied: string[]; pending: string[]; all: string[] } {
    this.ensureMigrationsTable()

    const applied = this.dbQuery(
      'SELECT version FROM _oxn_migrations ORDER BY version ASC'
    ).map((r: unknown) => (r as { version: string }).version)

    const all = this.migrationLoader()
      .map(m => m.version)
      .sort((a, b) => a.localeCompare(b))

    const appliedSet = new Set(applied)
    const pending = all.filter(v => !appliedSet.has(v))

    return { applied, pending, all }
  }

  /**
   * 获取当前数据库 schema 版本（最新一条已执行的迁移版本）
   */
  public getCurrentVersion(): string | null {
    this.ensureMigrationsTable()
    const result = this.dbQuery(
      'SELECT version FROM _oxn_migrations ORDER BY version DESC LIMIT 1'
    )
    return result.length > 0 ? (result[0] as { version: string }).version : null
  }

  private ensureMigrationsTable(): void {
    this.dbExec(`
      CREATE TABLE IF NOT EXISTS _oxn_migrations (
        version TEXT PRIMARY KEY,
        applied_at INTEGER DEFAULT (unixepoch())
      )
    `)
  }
}
