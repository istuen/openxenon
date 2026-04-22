/**
 * XnStore 接口 - 数据库存储抽象
 *
 * 所有运行时必须实现此接口，提供：
 * - 基础的 exec/query/transaction
 * - 内置的 migrator 实例
 * - 迁移生命周期管理
 */

import type { XnMigrator, XnMigrationResult } from '../../core/migrator'

export interface XnStore {
  // ===== 基础 CRUD =====
  initialize(path: string): void

  exec(sql: string, params?: unknown[]): void

  query<T = unknown>(sql: string, params?: unknown[]): T[]

  transaction<T>(callback: () => T): T

  close(): void

  // ===== 迁移器 =====
  /**
   * 获取 migrator 实例
   * 每次调用返回同一实例（单例）
   */
  getMigrator(): XnMigrator

  /**
   * 执行所有待执行的迁移
   * 通常在 store.initialize() 后自动调用
   */
  runMigrations(): XnMigrationResult

  /**
   * 获取迁移状态
   */
  getMigrationStatus(): { applied: string[]; pending: string[]; all: string[] }

  /**
   * 获取当前数据库 schema 版本
   */
  getCurrentVersion(): string | null

  /**
   * 手动回滚指定版本
   */
  rollbackMigration(version: string): { success: boolean; error?: string }
}

export interface XnStoreOptions {
  path: string
  WAL?: boolean
}
