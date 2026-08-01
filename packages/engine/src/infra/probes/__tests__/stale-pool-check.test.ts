// =============================================================================
// stale-pool-check.test.ts — RFC-0015 D6.2 一等公民 probe 验证
//
// 4 case: 全部 active / 1 ref 指向 archived / 1 ref 不存在 / 空 pools 目录
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { executeStalePoolCheck, type ProbeContext } from '../stale-pool-check'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-stale-pool-'))
})

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

function makePool(file: string, refs: string[]): void {
  // inline YAML array 形式 (单行, 不依赖 multi-line 解析)
  const refsInline = refs.length > 0 ? refs.map((r) => `"${r}"`).join(', ') : ''
  const refsYaml = refs.length > 0 ? `references: [${refsInline}]` : ''
  const content = `---
entity: pool
version: 0.1.0
name: test-pool
---
${refsYaml}

# Pool: test-pool
`
  const fullPath = join(tmpDir, '.openxenon/pools', file)
  mkdirSync(join(tmpDir, '.openxenon/pools', file.split('/').slice(0, -1).join('/') ?? ''), {
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

describe('stale-pool-check (RFC-0015 D6.2)', () => {
  test('case 1: 全部 pool ref 指向 active → passed=true', async () => {
    makeDomainAsset('ActiveDomain')
    makePool('design/active-pool.md', ['ActiveDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStalePoolCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.poolCount).toBe(1)
    expect(r.staleCount).toBe(0)
    expect(r.staleRefs).toEqual([])
  })

  test('case 2: 1 ref 指向 archived → staleRefs 含之, passed=false', async () => {
    makeDomainAsset('ActiveDomain')
    makeArchivedDomain('ArchivedDomain')
    makePool('design/mixed.md', ['ActiveDomain', 'ArchivedDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStalePoolCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.staleCount).toBe(1)
    const s = r.staleRefs.find((x) => x.ref === 'ArchivedDomain')
    expect(s).toBeDefined()
    expect(s?.reason).toBe('archived')
  })

  test('case 3: 1 ref 不存在 → staleRefs 含之, reason="missing"', async () => {
    makeDomainAsset('ActiveDomain')
    makePool('design/missing-ref.md', ['NonExistentDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStalePoolCheck({}, ctx)
    expect(r.passed).toBe(false)
    expect(r.staleCount).toBe(1)
    const s = r.staleRefs.find((x) => x.ref === 'NonExistentDomain')
    expect(s).toBeDefined()
    expect(s?.reason).toBe('missing')
  })

  test('case 4: 空 pools 目录 → passed=true (no pool to check)', async () => {
    mkdirSync(join(tmpDir, '.openxenon/pools'), { recursive: true })
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStalePoolCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.poolCount).toBe(0)
  })

  test('case 5: 嵌套 pool 目录 (multi-level walk) → passed', async () => {
    makeDomainAsset('DeepDomain')
    // 嵌套路径: .openxenon/pools/drafts/research/test.md
    const content = `---
entity: pool
version: 0.1.0
name: deep-pool
references:
  - "DeepDomain"
---

# Deep Pool
`
    mkdirSync(join(tmpDir, '.openxenon/pools/drafts/research'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon/pools/drafts/research/test.md'), content)
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStalePoolCheck({}, ctx)
    expect(r.passed).toBe(true)
    expect(r.poolCount).toBe(1)
  })

  test('case 6: ref 形式 "@prj/domains/X" 解析成功', async () => {
    makeDomainAsset('NamespacedDomain')
    makePool('design/namespaced.md', ['@prj/domains/NamespacedDomain'])
    const ctx: ProbeContext = { projectRoot: tmpDir }
    const r = await executeStalePoolCheck({}, ctx)
    expect(r.passed).toBe(true)
  })
})
