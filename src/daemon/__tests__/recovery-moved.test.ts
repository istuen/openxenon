import { describe, expect, it } from 'bun:test'
import { existsSync, statSync } from 'fs'
import { join } from 'path'

/**
 * Sprint 1 T2: 守护 src/daemon/trace/recovery.ts 移路径后结构
 *
 * 1. src/daemon/trace/recovery.ts 存在
 * 2. src/daemon/recovery.ts 不存在（已移走）
 */

const REPO_ROOT = join(import.meta.dir, '..', '..', '..')
const NEW_PATH = join(REPO_ROOT, 'src/daemon/trace/recovery.ts')
const OLD_PATH = join(REPO_ROOT, 'src/daemon/recovery.ts')

describe('Sprint 1 T2: daemon/recovery moved to daemon/trace/recovery', () => {
  it('src/daemon/trace/recovery.ts 存在', () => {
    expect(existsSync(NEW_PATH)).toBe(true)
  })

  it('src/daemon/trace/recovery.ts 是文件', () => {
    expect(statSync(NEW_PATH).isFile()).toBe(true)
  })

  it('src/daemon/recovery.ts 已不存在（移走）', () => {
    expect(existsSync(OLD_PATH)).toBe(false)
  })
})
