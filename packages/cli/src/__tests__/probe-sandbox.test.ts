// =============================================================================
// probe-sandbox.test.ts (T7 v0.2 Sprint 3d)
//
// 父文档 T4.5 表 4 case:
//   1. 合法 Provider → ok=true + flags=[]
//   2. 越界 require('fs/promises') → ok=false + flags=[sandbox_violation] (link 阶段)
//   3. 越界 process.exit(1) → ok=false + flags=[sandbox_violation] (runtime 阶段)
//   4. 越界 globalThis.fetch → ok=false + flags=[sandbox_violation] (runtime 阶段)
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { sandboxValidate } from '@openxenon/engine/infra/probes/sandbox'
import { join } from 'node:path'

const FIXTURES = join(import.meta.dir, 'fixtures')

describe('probe-sandbox', () => {
  test('case 1: 合法 S3 Provider → ok=true + flags=[]', async () => {
    const r = await sandboxValidate(join(FIXTURES, 'sample-s3-provider.ts'), ['s3://', 's3s://'])
    expect(r.ok).toBe(true)
    expect(r.flags).toEqual([])
    expect(r.provider).toBeDefined()
    expect(r.provider?.name).toBe('s3')
    expect(r.provider?.schemes).toEqual(['s3://', 's3s://'])
  })

  test('case 1b: 合法 Provider 但 schemes 不匹配 → reject', async () => {
    const r = await sandboxValidate(join(FIXTURES, 'sample-s3-provider.ts'), ['ftp://'])
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/missing scheme "ftp:\/\/"/)
  })

  test('case 2: 越界 require("fs/promises") → sandbox_violation (evaluate 阶段)', async () => {
    const r = await sandboxValidate(join(FIXTURES, 'evil-provider.ts'), ['evil://'])
    expect(r.ok).toBe(false)
    expect(r.flags).toContain('sandbox_violation')
    // Bun 沙箱: require 在沙箱内未定义, evaluate 阶段 throw "require is not defined"
    expect(r.reason).toMatch(/require is not defined|fs\/promises|is forbidden/)
  })

  test('case 3: 越界 process.exit(1) → runtime 阶段 sandbox_violation', async () => {
    const r = await sandboxValidate(join(FIXTURES, 'evil-exit-provider.ts'), ['exit://'])
    expect(r.ok).toBe(false)
    expect(r.flags).toContain('sandbox_violation')
    expect(r.reason).toMatch(/process is not defined|sandbox violation/)
  })

  test('case 4: 越界 globalThis.fetch() → runtime 阶段 sandbox_violation', async () => {
    const r = await sandboxValidate(join(FIXTURES, 'evil-fetch-provider.ts'), ['fetch://'])
    expect(r.ok).toBe(false)
    expect(r.flags).toContain('sandbox_violation')
    expect(r.reason).toMatch(/globalThis\.fetch is not a function|sandbox violation/)
  })

  test('case 5: 空 default export → reject 不实现 InfraProvider', async () => {
    const r = await sandboxValidate(join(FIXTURES, 'empty-provider.ts'), ['empty://'])
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/missing default export|InfraProvider/)
  })
})
