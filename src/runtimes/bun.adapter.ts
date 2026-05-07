/**
 * Bun 运行时适配器
 *
 * 数据库存储功能已废弃，由文件系统替代。
 */

import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type {
  XnStore,
  XnStoreOptions
} from './interfaces/store.interface'

export class BunStore implements XnStore {
  constructor(_options: XnStoreOptions) {
  }

  initialize(path: string): void {
    const dir = dirname(path)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  exec(_sql: string, _params?: unknown[]): void {
    throw new Error('BunStore: exec not supported - database layer removed')
  }

  query<T = unknown>(_sql: string, _params?: unknown[]): T[] {
    throw new Error('BunStore: query not supported - database layer removed')
  }

  transaction<T>(_callback: () => T): T {
    throw new Error('BunStore: transaction not supported - database layer removed')
  }

  close(): void {
    // no-op
  }

  getMigrator(): unknown {
    return null
  }

  runMigrations(): unknown {
    return { executed: [], errors: [] }
  }

  getMigrationStatus(): unknown {
    return { applied: [], pending: [], all: [] }
  }

  getCurrentVersion(): string | null {
    return null
  }

  rollbackMigration(_version: string): unknown {
    return { success: false, error: 'Migration not supported' }
  }
}

export function createBunStore(options: XnStoreOptions): XnStore {
  return new BunStore(options)
}
