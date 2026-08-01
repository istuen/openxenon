// =============================================================================
// asset-migrate-check.test.ts — RFC-0015 D6.3 一等公民 probe 验证
//
// 6 case: 完整归档 / 缺 metadata / metadata 缺字段 / 缺 ## Archival H2 / 空 archived / forward ref
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeAssetMigrateCheck, type ProbeContext } from '../asset-migrate-check'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-amc-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

const VALID_METADATA = `archiveAt: "2026-07-31T00:00:00Z"
reason: "superseded by Foo v2"
sourceKind: "domain"
sourceName: "OldDomain"
`

function makeArchived(name: string, opts: { metaContent?: string; mdContent?: string; kind?: string } = {}): void {
  const kind = opts.kind ?? 'domain'
  const dir = join(tmpDir, '.openxenon/.archived/assets', `${kind}s`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.md`), opts.mdContent ?? `## Archival\n\nThis is archived.`)
  if (opts.metaContent !== '__NONE__') {
    writeFileSync(join(dir, `${name}.metadata.json`), opts.metaContent ?? VALID_METADATA)
  }
}

function makeActive(name: string, refs: string[], kind = 'domain'): void {
  const dir = join(tmpDir, '.openxenon/assets', `${kind}s`)
  mkdirSync(dir, { recursive: true })
  const refsYaml = refs.length > 0 ? `references:\n${refs.map((r) => `  - "${r}"`).join('\n')}` : ''
  writeFileSync(
    join(dir, `${name}.md`),
    `---
entity: ${kind}
version: 0.1.0
name: ${name}
---
${refsYaml}
`,
  )
}

describe('asset-migrate-check (RFC-0015 D6.3)', () => {
  test('case 1: 完整归档 → passed=true', async () => {
    makeArchived('Foo')
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeAssetMigrateCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.archiveCount).toBe(1)
    expect(r.incompleteCount).toBe(0)
    expect(r.staleRefCount).toBe(0)
  })

  test('case 2: 缺 .metadata.json → incomplete 含之, passed=false', async () => {
    makeArchived('Foo', { metaContent: '__NONE__' })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeAssetMigrateCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.incompleteArchives.find((a) => a.issue === 'metadata-missing')).toBeDefined()
  })

  test('case 3: metadata 缺 archiveAt 字段 → incomplete 含之', async () => {
    makeArchived('Foo', {
      metaContent: `reason: "superseded"
sourceKind: "domain"
sourceName: "OldDomain"
`,
    })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeAssetMigrateCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.incompleteArchives.find((a) => a.issue === 'metadata-fields')).toBeDefined()
  })

  test('case 4: .md 缺 ## Archival H2 → incomplete 含之', async () => {
    makeArchived('Foo', { mdContent: '# Some doc without archival marker' })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeAssetMigrateCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.incompleteArchives.find((a) => a.issue === 'archival-marker-missing')).toBeDefined()
  })

  test('case 5: 空 .archived 目录 → passed=true', async () => {
    mkdirSync(join(tmpDir, '.openxenon/.archived/assets'), { recursive: true })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeAssetMigrateCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.archiveCount).toBe(0)
  })

  test('case 6: active asset 引用 archived → staleArchiveRefs 含之', async () => {
    // Archived 'Foo' + Active 'Bar' 引用 'Foo' (实际上 listAssetReferences 只扫 active, 所以 Foo 不会出现在 active refs)
    // 但反向索引有 Bar -> Foo 的引用, 且 Foo 不在 active, 这就是 stale ref
    makeArchived('Foo')
    makeActive('Bar', ['Foo']) // active Bar refs Foo (但 Foo 是 archived)
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeAssetMigrateCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.staleArchiveRefs.length).toBeGreaterThan(0)
  })
})
