import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { planMigration, applyMigration } from '../dev-pool-migrator'

let tmpDir: string

function setup(): void {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-dpm-recover-'))
  const poolDir = join(tmpDir, 'dev', 'pool')
  require('node:fs').mkdirSync(poolDir, { recursive: true })
  writeFileSync(join(poolDir, 'README.md'), '# pool readme')
  writeFileSync(
    join(poolDir, 'test-entry.md'),
    `---
id: test-entry
theme: Test
priority: medium
status: planned
created-at: 2026-08-07
scheduled-version: ~
synced-at: 2026-08-07
---

# Test
`,
  )
}

function teardown(): void {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
}

describe('planMigration', () => {
  beforeEach(setup)
  afterEach(teardown)

  test('list excludes README.md', () => {
    const r = planMigration({ projectRoot: tmpDir, dryRun: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0]?.slug).toBe('test-entry')
  })

  test('flags missing branch + source', () => {
    const r = planMigration({ projectRoot: tmpDir })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const e = r.entries[0]!
    expect(e.needsBranch).toBe(true)
    expect(e.needsSource).toBe(true)
  })
})

describe('applyMigration + idempotency', () => {
  beforeEach(setup)
  afterEach(teardown)

  test('apply writes branch + source', () => {
    const r = applyMigration({ projectRoot: tmpDir })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const content = readFileSync(join(tmpDir, 'dev', 'pool', 'test-entry.md'), 'utf-8')
    expect(content).toContain('branch: feat/goal-test-entry')
    expect(content).toContain('source: direct')
  })

  test('idempotent: second run unchanged', () => {
    applyMigration({ projectRoot: tmpDir })
    const r = applyMigration({ projectRoot: tmpDir })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.changedCount).toBe(0)
  })

  test('dry-run no writes', () => {
    const before = readFileSync(join(tmpDir, 'dev', 'pool', 'test-entry.md'), 'utf-8')
    applyMigration({ projectRoot: tmpDir, dryRun: true })
    const after = readFileSync(join(tmpDir, 'dev', 'pool', 'test-entry.md'), 'utf-8')
    expect(after).toBe(before)
  })
})
