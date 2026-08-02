import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { asyncFs } from '../filesystem-async'

/**
 * Sprint 1 T1b: filesystem-async 异步 IO 收口层测试
 *
 * 5 case 验证 asyncFs 命名空间对象 5 个 API:
 * - access / mkdir / readdir / readFile / writeFile
 *
 * 全部基于 node:fs/promises 实现, 此测试仅验证收口层透传正确
 */

const TEST_DIR = join(tmpdir(), `oxn-fs-async-test-${Date.now()}`)

describe('infra/filesystem-async', () => {
  beforeEach(async () => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('asyncFs 命名空间对象含 5 个 API', () => {
    expect(typeof asyncFs.mkdir).toBe('function')
    expect(typeof asyncFs.readdir).toBe('function')
    expect(typeof asyncFs.readFile).toBe('function')
    expect(typeof asyncFs.writeFile).toBe('function')
    expect(typeof asyncFs.access).toBe('function')
  })

  it('asyncFs.writeFile + readFile 透传 (与 node:fs/promises 等价)', async () => {
    const f = join(TEST_DIR, 'a.txt')
    await asyncFs.mkdir(TEST_DIR, { recursive: true })
    await asyncFs.writeFile(f, 'hello', 'utf-8')
    const content = await asyncFs.readFile(f, 'utf-8')
    expect(content).toBe('hello')
  })

  it('asyncFs.mkdir recursive 创建嵌套目录', async () => {
    const nested = join(TEST_DIR, 'a', 'b', 'c')
    await asyncFs.mkdir(nested, { recursive: true })
    const list = await asyncFs.readdir(TEST_DIR)
    expect(list).toContain('a')
  })

  it('asyncFs.access 命中文件 resolve', async () => {
    const f = join(TEST_DIR, 'b.txt')
    await asyncFs.mkdir(TEST_DIR, { recursive: true })
    await asyncFs.writeFile(f, 'x', 'utf-8')
    await expect(asyncFs.access(f)).resolves.toBeDefined()
  })

  it('asyncFs.readdir 列出写入的 2 个文件', async () => {
    await asyncFs.mkdir(TEST_DIR, { recursive: true })
    await asyncFs.writeFile(join(TEST_DIR, '1.txt'), 'a', 'utf-8')
    await asyncFs.writeFile(join(TEST_DIR, '2.txt'), 'b', 'utf-8')
    const list = await asyncFs.readdir(TEST_DIR)
    expect(list.sort()).toEqual(['1.txt', '2.txt'])
  })
})
