/**
 * md-bridge/cache.test.ts + reference-checker.test.ts — T6+T7 单元测试
 *
 * v0.3 阶段 1 T8 任务
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

// ========================
// cache 测试
// ========================

import {
  getCachedParse,
  setCachedParse,
  invalidateCache,
  invalidateByPath,
  cleanExpiredCache,
  getCacheStats,
} from '../cache.js'

import type { Root } from 'mdast'

describe('md-bridge/cache', () => {
  let testDir: string
  let cacheDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `oxn-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    cacheDir = join(testDir, '.cache/mdast')
    mkdirSync(cacheDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  const sampleMdast: Root = { type: 'root', children: [] }

  test('setCachedParse → getCachedParse 命中', () => {
    const hash = 'abc123def456'
    setCachedParse(sampleMdast, '/tmp/test.md', hash, 100, {
      cacheDir,
    })

    const cached = getCachedParse('/tmp/test.md', hash, { cacheDir })
    expect(cached).not.toBeNull()
    expect(cached?.contentHash).toBe(hash)
    expect(cached?.parseTime).toBe(100)
  })

  test('getCachedParse 未命中返回 null', () => {
    const cached = getCachedParse('/tmp/nonexistent.md', 'nonexistent', { cacheDir })
    expect(cached).toBeNull()
  })

  test('contentHash 不匹配返回 null', () => {
    setCachedParse(sampleMdast, '/tmp/test.md', 'hash-a', 100, { cacheDir })
    const cached = getCachedParse('/tmp/test.md', 'hash-b', { cacheDir })
    expect(cached).toBeNull()
  })

  test('TTL 过期返回 null（手动设置 createdAt）', () => {
    // 手动写一个过期缓存
    const expiredPath = join(cacheDir, 'expired.json')
    const expiredData = {
      path: expiredPath,
      sourcePath: '/tmp/test.md',
      contentHash: 'expired',
      mdastHash: 'mhash',
      parseTime: 100,
      createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 天前
      mdast: sampleMdast,
    }
    writeFileSync(expiredPath, JSON.stringify(expiredData), { mode: 0o444 })

    const cached = getCachedParse('/tmp/test.md', 'expired', {
      cacheDir,
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 天
    })
    expect(cached).toBeNull()
  })

  test('invalidateCache 删除指定缓存', () => {
    setCachedParse(sampleMdast, '/tmp/test.md', 'hash-x', 100, { cacheDir })
    expect(getCachedParse('/tmp/test.md', 'hash-x', { cacheDir })).not.toBeNull()

    invalidateCache('/tmp/test.md', 'hash-x', { cacheDir })
    expect(getCachedParse('/tmp/test.md', 'hash-x', { cacheDir })).toBeNull()
  })

  test('invalidateByPath 删除该路径所有缓存', () => {
    setCachedParse(sampleMdast, '/tmp/test.md', 'hash-1', 100, { cacheDir })
    setCachedParse(sampleMdast, '/tmp/test.md', 'hash-2', 200, { cacheDir })
    setCachedParse(sampleMdast, '/tmp/other.md', 'hash-3', 300, { cacheDir })

    const removed = invalidateByPath('/tmp/test.md', { cacheDir })
    expect(removed).toBe(2)
    expect(getCachedParse('/tmp/test.md', 'hash-1', { cacheDir })).toBeNull()
    expect(getCachedParse('/tmp/test.md', 'hash-2', { cacheDir })).toBeNull()
    expect(getCachedParse('/tmp/other.md', 'hash-3', { cacheDir })).not.toBeNull()
  })

  test('cleanExpiredCache 删除过期', () => {
    // 写 1 个过期
    const expiredPath = join(cacheDir, 'expired.json')
    writeFileSync(
      expiredPath,
      JSON.stringify({
        path: expiredPath,
        sourcePath: '/tmp/x.md',
        contentHash: 'exp',
        mdastHash: 'm',
        parseTime: 1,
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        mdast: sampleMdast,
      }),
      { mode: 0o444 },
    )
    // 写 1 个新鲜
    setCachedParse(sampleMdast, '/tmp/x.md', 'fresh', 1, { cacheDir })

    const removed = cleanExpiredCache({ cacheDir, ttlMs: 7 * 24 * 60 * 60 * 1000 })
    expect(removed).toBe(1)
    expect(existsSync(expiredPath)).toBe(false)
  })

  test('getCacheStats 返回统计', () => {
    setCachedParse(sampleMdast, '/tmp/a.md', 'h1', 100, { cacheDir })
    setCachedParse(sampleMdast, '/tmp/b.md', 'h2', 200, { cacheDir })

    const stats = getCacheStats({ cacheDir })
    expect(stats.total).toBe(2)
    expect(stats.sizeBytes).toBeGreaterThan(0)
    expect(stats.newestCreatedAt).toBeGreaterThan(0)
  })

  test('损坏缓存文件不抛错', () => {
    const brokenPath = join(cacheDir, 'broken.json')
    writeFileSync(brokenPath, 'not json{{{', { mode: 0o444 })

    expect(() => getCachedParse('/tmp/x.md', 'broken', { cacheDir })).not.toThrow()
  })
})

// ========================
// reference-checker 测试
// ========================

import { parseReferenceTarget, checkReference, checkReferences } from '../reference-checker.js'

describe('md-bridge/reference-checker', () => {
  describe('parseReferenceTarget', () => {
    test('内部 .openxenon/domains/ → domain + fatal', () => {
      const r = parseReferenceTarget('.openxenon/domains/OrderContext.md')
      expect(r.internal).toBe(true)
      expect(r.severity).toBe('fatal')
      expect(r.kind).toBe('domain')
    })

    test('内部 .openxenon/blueprints/ → blueprint + fatal', () => {
      const r = parseReferenceTarget('.openxenon/blueprints/dev-workflow.md')
      expect(r.kind).toBe('blueprint')
      expect(r.severity).toBe('fatal')
    })

    test('内部 .openxenon/works/<w>/work.md → work', () => {
      const r = parseReferenceTarget('.openxenon/works/feature-x/work.md')
      expect(r.kind).toBe('work')
    })

    test('内部 .openxenon/works/<w>/tasks/<t>/task.md → task', () => {
      const r = parseReferenceTarget('.openxenon/works/feature-x/tasks/step1/task.md')
      expect(r.kind).toBe('task')
    })

    test('内部 .openxenon/proofs/ → proof', () => {
      const r = parseReferenceTarget('.openxenon/proofs/feature-x/outcome.md')
      expect(r.kind).toBe('proof')
    })

    test('@prj/blueprints/X → blueprint + fatal', () => {
      const r = parseReferenceTarget('@prj/blueprints/dev-workflow')
      expect(r.internal).toBe(true)
      expect(r.kind).toBe('blueprint')
      expect(r.severity).toBe('fatal')
    })

    test('https URL → warn', () => {
      const r = parseReferenceTarget('https://example.com/spec.md')
      expect(r.internal).toBe(false)
      expect(r.severity).toBe('warn')
      expect(r.kind).toBe('url')
    })

    test('./relative → warn + path', () => {
      const r = parseReferenceTarget('./spec.md')
      expect(r.internal).toBe(false)
      expect(r.severity).toBe('warn')
      expect(r.kind).toBe('path')
    })

    test('未知引用 → warn + unknown', () => {
      const r = parseReferenceTarget('totally-unknown-ref')
      expect(r.severity).toBe('warn')
      expect(r.kind).toBe('unknown')
    })
  })

  describe('checkReference (内部)', () => {
    test('内部资产存在（已知集合）', async () => {
      const result = await checkReference('.openxenon/domains/OrderContext.md', {
        knownInternalAssets: new Set(['.openxenon/domains/OrderContext.md']),
      })
      expect(result.reachable).toBe(true)
    })

    test('内部资产不存在（已知集合）', async () => {
      const result = await checkReference('.openxenon/domains/Missing.md', {
        knownInternalAssets: new Set(['.openxenon/domains/OrderContext.md']),
      })
      expect(result.reachable).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('checkReference (外部 URL 默认跳过网络)', () => {
    test('默认 checkExternalUrls=false → URL 不检查网络', async () => {
      const result = await checkReference('https://example.com/spec.md')
      expect(result.reachable).toBe(true) // 未检查即视为 reachable
    })
  })

  describe('checkReference (相对路径)', () => {
    let localTestDir: string

    beforeEach(() => {
      localTestDir = join(tmpdir(), `oxn-relpath-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      mkdirSync(localTestDir, { recursive: true })
    })

    afterEach(() => {
      if (existsSync(localTestDir)) {
        rmSync(localTestDir, { recursive: true, force: true })
      }
    })

    test('相对路径存在（真实文件）', async () => {
      // 写一个临时文件
      const tempFile = join(localTestDir, 'spec.md')
      writeFileSync(tempFile, '# Test', { mode: 0o444 })

      const result = await checkReference('./spec.md', {
        projectRoot: localTestDir,
      })
      expect(result.reachable).toBe(true)
    })

    test('相对路径不存在', async () => {
      const result = await checkReference('./nonexistent.md', {
        projectRoot: localTestDir,
      })
      expect(result.reachable).toBe(false)
    })
  })

  describe('批量检查', () => {
    test('checkReferences 并行检查', async () => {
      const refs = [
        '.openxenon/domains/OrderContext.md',
        '.openxenon/blueprints/dev-workflow.md',
        'https://example.com/spec.md',
      ]
      const results = await checkReferences(refs, {
        knownInternalAssets: new Set(['.openxenon/domains/OrderContext.md', '.openxenon/blueprints/dev-workflow.md']),
      })
      expect(results).toHaveLength(3)
      expect(results[0]?.reachable).toBe(true)
      expect(results[1]?.reachable).toBe(true)
      expect(results[2]?.reachable).toBe(true) // URL 未检查
    })
  })
})
