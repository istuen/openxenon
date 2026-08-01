// =============================================================================
// stale-draft-check.test.ts — RFC-0015 D6.2 一等公民 probe 验证 (v0.6.2 修复)
//
// 原 stale-pool-check 验证 .openxenon/pools/ — 已废弃目录, 现扫 .openxenon/drafts/
//
// 6 case: 全部 active / 1 ref 指向 archived / 1 ref 不存在 / 空 drafts / 嵌套 drafts / namespaced ref
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeStaleDraftCheck, type ProbeContext } from '../stale-draft-check'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-stale-draft-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function makeDraft(file: string, refs: string[]): void {
  const refsInline = refs.length > 0 ? refs.map((r) => `"${r}"`).join(', ') : ''
  const refsYaml = refs.length > 0 ? `references: [${refsInline}]` : ''
  const content = `---
entity: draft
name: test-draft
---
${refsYaml}

# Draft: test-draft
`
  const fullPath = join(tmpDir, '.openxenon/drafts', file)
  mkdirSync(join(tmpDir, '.openxenon/drafts', file.split('/').slice(0, -1).join('/') ?? ''), {
    recursive: true,
  })
  writeFileSync(fullPath, content)
}

function makeDomainAsset(name: string): void {
  mkdirSync(join(tmpDir, '.openxenon/assets/domains'), { recursive: true })
  writeFileSync(join(tmpDir, `.openxenon/assets/domains/${name}.md`), '# stub')
}

function makeArchivedDomain(name: string): void {
  mkdirSync(join(tmpDir, '.openxenon/.archived/assets/domains'), { recursive: true })
  writeFileSync(join(tmpDir, `.openxenon/.archived/assets/domains/${name}.md`), '# archived')
}

describe('stale-draft-check (RFC-0015 D6.2; v0.6.2 drafts 目录)', () => {
  test('case 1: 全部 draft ref 指向 active → passed=true', async () => {
    makeDomainAsset('ActiveDomain')
    makeDraft('active-draft.md', ['ActiveDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStaleDraftCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.draftCount).toBe(1)
    expect(r.staleCount).toBe(0)
    expect(r.staleRefs).toEqual([])
  })

  test('case 2: 1 ref 指向 archived → staleRefs 含之, passed=false', async () => {
    makeDomainAsset('ActiveDomain')
    makeArchivedDomain('ArchivedDomain')
    makeDraft('mixed.md', ['ActiveDomain', 'ArchivedDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStaleDraftCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.staleCount).toBe(1)
    const s = r.staleRefs.find((x) => x.ref === 'ArchivedDomain')
    expect(s).toBeDefined()
    expect(s?.reason).toBe('archived')
    expect(s?.draftFile).toContain('mixed.md')
  })

  test('case 3: 1 ref 不存在 → staleRefs 含之, reason="missing"', async () => {
    makeDomainAsset('ActiveDomain')
    makeDraft('missing-ref.md', ['NonExistentDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStaleDraftCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.staleCount).toBe(1)
    const s = r.staleRefs.find((x) => x.ref === 'NonExistentDomain')
    expect(s).toBeDefined()
    expect(s?.reason).toBe('missing')
  })

  test('case 4: 空 drafts 目录 → passed=true (no draft to check)', async () => {
    mkdirSync(join(tmpDir, '.openxenon/drafts'), { recursive: true })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStaleDraftCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.draftCount).toBe(0)
  })

  test('case 5: 嵌套 draft 目录 (multi-level walk) → passed', async () => {
    makeDomainAsset('DeepDomain')
    const content = `---
entity: draft
name: deep-draft
references:
  - "DeepDomain"
---

# Deep Draft
`
    mkdirSync(join(tmpDir, '.openxenon/drafts/subdir/research'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon/drafts/subdir/research/test.md'), content)
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStaleDraftCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.draftCount).toBe(1)
  })

  test('case 6: ref 形式 "@prj/domains/X" 解析成功', async () => {
    makeDomainAsset('NamespacedDomain')
    makeDraft('namespaced.md', ['@prj/domains/NamespacedDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStaleDraftCheck({}, ctx)
    expect(r.passed).toBe(true)
  })
})
