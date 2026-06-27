import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  computeSha256,
  readSyncMetadata,
  writeSyncMetadata,
  readCacheSha,
  writeCacheSha,
  getCachePath,
} from '../sync-hash'

describe('sync-hash', () => {
  let tmpDir: string

  function setup(): string {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-sync-hash-'))
    return tmpDir
  }

  function teardown(): void {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  }

  describe('computeSha256', () => {
    test('empty string produces 64-char hex', () => {
      const sha = computeSha256('')
      expect(sha).toMatch(/^[0-9a-f]{64}$/)
    })

    test('same input → same SHA', () => {
      const a = computeSha256('hello')
      const b = computeSha256('hello')
      expect(a).toBe(b)
    })

    test('different input → different SHA', () => {
      const a = computeSha256('hello')
      const b = computeSha256('world')
      expect(a).not.toBe(b)
    })
  })

  describe('frontmatter round-trip', () => {
    test('writeSyncMetadata → readSyncMetadata preserves fields', () => {
      const root = setup()
      try {
        const mdPath = join(root, 'x.md')
        writeFileSync(mdPath, '---\nentity: domain\nname: Foo\n---\n# Hello\n', 'utf-8')

        writeSyncMetadata(mdPath, {
          oxnSourceSha: 'aaa111',
          mdSelfSha: 'bbb222',
          syncedAt: '2026-06-25T00:00:00.000Z',
        })

        const meta = readSyncMetadata(mdPath)
        expect(meta?.oxnSourceSha).toBe('aaa111')
        expect(meta?.syncedAt).toBe('2026-06-25T00:00:00.000Z')

        // 原 frontmatter 字段保留 (写回后仍存在)
        const finalContent = readFileSync(mdPath, 'utf-8')
        expect(finalContent).toContain('entity: domain')
        expect(finalContent).toContain('name: Foo')
        // md-self-sha 不写 frontmatter (仅 .cache)
        expect(finalContent).not.toContain('md-self-sha')
      } finally {
        teardown()
      }
    })

    test('overwrite previous sync fields', () => {
      const root = setup()
      try {
        const mdPath = join(root, 'x.md')
        writeFileSync(mdPath, '---\nname: Foo\n---\n', 'utf-8')

        writeSyncMetadata(mdPath, {
          oxnSourceSha: 'first',
          mdSelfSha: 'first-md',
          syncedAt: '2026-06-25T00:00:00.000Z',
        })
        writeSyncMetadata(mdPath, {
          oxnSourceSha: 'second',
          mdSelfSha: 'second-md',
          syncedAt: '2026-06-26T00:00:00.000Z',
        })

        const meta = readSyncMetadata(mdPath)
        expect(meta?.oxnSourceSha).toBe('second')
        expect(meta?.syncedAt).toBe('2026-06-26T00:00:00.000Z')
      } finally {
        teardown()
      }
    })

    test('no frontmatter → readSyncMetadata returns null', () => {
      const root = setup()
      try {
        const mdPath = join(root, 'x.md')
        writeFileSync(mdPath, '# Hello\n', 'utf-8')
        expect(readSyncMetadata(mdPath)).toBeNull()
      } finally {
        teardown()
      }
    })
  })

  describe('cache helpers', () => {
    test('writeCacheSha + readCacheSha round-trip', () => {
      const root = setup()
      try {
        const cachePath = join(root, 'x.hash')
        writeCacheSha(cachePath, 'deadbeef')
        expect(readCacheSha(cachePath)).toBe('deadbeef')
      } finally {
        teardown()
      }
    })

    test('readCacheSha on missing file returns null', () => {
      const root = setup()
      try {
        expect(readCacheSha(join(root, 'missing.hash'))).toBeNull()
      } finally {
        teardown()
      }
    })

    test('getCachePath returns .cache dir structure', () => {
      const path = getCachePath('/proj', 'domain', 'Foo')
      expect(path).toBe('/proj/.openxenon/domains-md/.cache/Foo.hash')
    })
  })
})
