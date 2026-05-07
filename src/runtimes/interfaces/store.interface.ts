/**
 * XnStore 接口 - 数据库存储抽象（已废弃）
 *
 * 此接口已被文件系统替代，不再使用。
 */

export interface XnStore {
  initialize(path: string): void
  exec(sql: string, params?: unknown[]): void
  query<T = unknown>(sql: string, params?: unknown[]): T[]
  transaction<T>(callback: () => T): T
  close(): void
  getMigrator(): unknown
  runMigrations(): unknown
  getMigrationStatus(): unknown
  getCurrentVersion(): string | null
  rollbackMigration(version: string): unknown
}

export interface XnStoreOptions {
  path: string
  WAL?: boolean
}
