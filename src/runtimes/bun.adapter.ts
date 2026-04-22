/**
 * Bun 运行时适配器
 *
 * 实现 XnStore 接口，使用 bun:sqlite 作为底层数据库
 * 同时提供 XnMigrator 的实例化和迁移加载
 */

import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import type {
  XnStore,
  XnStoreOptions
} from './interfaces/store.interface'
import {
  XnMigrator,
  type XnMigrationUnit
} from '../core/migrator'

// 类型声明：Bun 的 import.meta.glob 返回类型
declare module 'bun' {
  interface ImportMeta {
    glob(options?: { eager?: boolean }): Record<string, unknown>
  }
}

function buildMigrationLoader(migrationsDir: string): () => XnMigrationUnit[] {
  return (): XnMigrationUnit[] => {
    if (!existsSync(migrationsDir)) {
      return []
    }

    const units: XnMigrationUnit[] = []

    try {
      const globFn = (globalThis as Record<string, unknown>).import as { meta?: { glob?: (pattern: string, options?: { eager?: boolean }) => Record<string, unknown> } } | undefined
      const files = globFn?.meta?.glob?.(join(migrationsDir, '*.sql'), { eager: true }) ?? {}

      for (const [filePath, mod] of Object.entries(files)) {
        const fileName = filePath.split('/').pop() || ''
        const versionMatch = fileName.match(/^(\d+)_/)

        if (!versionMatch) {
          continue
        }

        const version = versionMatch[1]

        // 读取文件内容
        let sql: string
        try {
          sql = (mod as { default?: string })?.default || String(mod)
        } catch {
          // 尝试直接读文件
          const fullPath = join(migrationsDir, fileName)
          if (existsSync(fullPath)) {
            sql = readFileSync(fullPath, 'utf-8')
          } else {
            continue
          }
        }

        const upMatch = sql.match(/--\s*@up\s*([\s\S]*?)(?=--\s*@down\s*|$)/i)
        const downMatch = sql.match(/--\s*@down\s*([\s\S]*?)$/i)

        if (!upMatch || upMatch[1] === undefined) {
          continue
        }

        const upSql = upMatch[1].trim()
        const downSql = downMatch?.[1]?.trim() ?? null

        units.push({
          version: version as string,
          up: (dbExec) => dbExec(upSql),
          down: downSql ? ((dbExec) => dbExec(downSql)) : undefined
        })
      }
    } catch (error) {
      console.warn(`[XnStore] Failed to load migrations from ${migrationsDir}: ${error}`)
    }

    return units.sort((a, b) => a.version.localeCompare(b.version))
  }
}

export class BunStore implements XnStore {
  private db: Database | null = null
  private dbPath: string = ''
  private _migrator: XnMigrator | null = null
  private options: XnStoreOptions
  private migrationsDir: string

  constructor(options: XnStoreOptions) {
    this.options = options
    this.migrationsDir = options.path.replace(/[/\\][^/\\]+$/, '/migrations')
  }

  initialize(path: string): void {
    this.dbPath = path

    // 确保目录存在
    const dir = dirname(path)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(this.dbPath, { strict: true })

    if (this.options.WAL) {
      this.db.run('PRAGMA journal_mode=WAL;')
    }

    // 初始化后自动执行迁移
    this.runMigrations()
  }

  exec(sql: string, params?: unknown[]): void {
    this.ensureDb()
    if (params && params.length > 0) {
      this.db!.prepare(sql).run(...(params as (string | number | null | Uint8Array)[]))
    } else {
      this.db!.exec(sql)
    }
  }

  query<T = unknown>(sql: string, params?: unknown[]): T[] {
    this.ensureDb()
    if (params && params.length > 0) {
      return this.db!.prepare(sql).all(...(params as (string | number | null | Uint8Array)[])) as T[]
    }
    return this.db!.prepare(sql).all() as T[]
  }

  transaction<T>(callback: () => T): T {
    this.ensureDb()
    return this.db!.transaction(callback)()
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  getMigrator(): XnMigrator {
    if (this._migrator) {
      return this._migrator
    }

    this.ensureDb()

    const loader = buildMigrationLoader(this.migrationsDir)

    this._migrator = new XnMigrator({
      dbExec: (sql) => {
        this.ensureDb()
        this.db!.exec(sql)
      },
      dbQuery: (sql, params) => {
        this.ensureDb()
        if (params && params.length > 0) {
          return this.db!.prepare(sql).all(...(params as (string | number | null | Uint8Array)[]))
        }
        return this.db!.prepare(sql).all()
      },
      migrationLoader: loader,
      onStartVersion: (version) => {
        console.log(`[XnStore] Applying migration: ${version}`)
      },
      onErrorVersion: (version, error) => {
        console.error(`[XnStore] Migration ${version} failed: ${error}`)
      }
    })

    return this._migrator
  }

  runMigrations() {
    const migrator = this.getMigrator()
    const result = migrator.run()

    if (result.executed.length > 0) {
      console.log(`[XnStore] Migrations applied: ${result.executed.join(', ')}`)
    }

    if (result.errors.length > 0) {
      console.error(`[XnStore] Migration errors: ${JSON.stringify(result.errors)}`)
    }

    return result
  }

  getMigrationStatus() {
    return this.getMigrator().getStatus()
  }

  getCurrentVersion(): string | null {
    return this.getMigrator().getCurrentVersion()
  }

  rollbackMigration(version: string) {
    return this.getMigrator().rollback(version)
  }

  private ensureDb(): void {
    if (!this.db) {
      throw new Error('XnStore not initialized. Call initialize() first.')
    }
  }
}

/**
 * 创建 BunStore 实例的工厂函数
 */
export function createBunStore(options: XnStoreOptions): XnStore {
  return new BunStore(options)
}
