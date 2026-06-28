import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { scanDirectoryRecursive } from '../scanner'

describe('scanDirectoryRecursive (v1.1 fix-p2-robustness scanner-truncation)', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = `/tmp/oxn-scanner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('空目录 → items=[], truncated=false', () => {
    const r = scanDirectoryRecursive(tmpDir, 5)
    expect(r.items).toEqual([])
    expect(r.truncated).toBe(false)
  })

  it('maxDepth=0 → 立即 truncated=true', () => {
    mkdirSync(join(tmpDir, 'sub'))
    const r = scanDirectoryRecursive(tmpDir, 0)
    expect(r.truncated).toBe(true)
  })

  it('maxDepth 充足 → truncated=false', () => {
    mkdirSync(join(tmpDir, 'a'))
    mkdirSync(join(tmpDir, 'a', 'b'))
    writeFileSync(join(tmpDir, 'a', 'b', 'file.txt'), 'x')
    const r = scanDirectoryRecursive(tmpDir, 5)
    expect(r.truncated).toBe(false)
    expect(r.items.length).toBe(1)
    expect(r.items[0]?.isDirectory).toBe(true)
    expect(r.items[0]?.children?.items.length).toBe(1)
  })

  it('maxDepth 不够 → truncated=true 且子目录 children 体现截断', () => {
    mkdirSync(join(tmpDir, 'a'))
    mkdirSync(join(tmpDir, 'a', 'b'))
    writeFileSync(join(tmpDir, 'a', 'b', 'file.txt'), 'x')
    // maxDepth=1: 顶层 a 进, 但 a/b 不进
    const r = scanDirectoryRecursive(tmpDir, 1)
    expect(r.truncated).toBe(true)
    expect(r.items.length).toBe(1)
    expect(r.items[0]?.children?.truncated).toBe(true)
  })

  it('目录不存在 → items=[], truncated=false (不报 truncated, 因为不是 maxDepth 触发)', () => {
    const r = scanDirectoryRecursive('/tmp/nonexistent-oxn-scanner-test', 5)
    expect(r.items).toEqual([])
    expect(r.truncated).toBe(false)
  })
})
