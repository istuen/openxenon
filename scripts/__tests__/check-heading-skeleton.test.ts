// =============================================================================
// check-heading-skeleton.test.ts (v0.7.5+ 重写)
//
// 测试调整历史：
//   - v0.7.5 (42ad760)：脚本重写为走 `.openxenon/drafts/<DraftType>-<slug>.md` 路径，
//     但 tests 仍用 v0.2 era `pools/<pool>/` 路径 → case 1/2 一直 fail
//   - v3.2.1（fix-oxn-validation-gate-sync）：同步 tests 到新路径 + 加 rfc/ 子目录递归 case
//
// 6 case：
//   1. 全部 ok → exit 0 + passed=N
//   2. 缺 required → exit 1 + failed[]
//   3. 空目录 → 0 files checked
//   4. 目录不存在 → 静默跳过 (degraded mode)
//   5. 🆕 v3.2.1: rfc/ 子目录递归 walk（修复 pre-existing bug）
//   6. 🆕 v3.2.1: .archived/ 子目录跳过
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { checkDirectories } from '../check-heading-skeleton'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `oxn-heading-skel-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
  // v0.7.5+ 路径：<tmp>/.openxenon/drafts/
  mkdirSync(join(tmpDir, '.openxenon', 'drafts'), { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

/** Issue Draft 骨架（v0.7.5 spec）：required = ['## 复现步骤', '## 期望', '## 实际'] */
const VALID_ISSUE = `## 复现步骤\n1. step\n## 期望\nx\n## 实际\ny\n`
const INVALID_ISSUE_MISSING_EXPECTED = `## 复现步骤\n1. step\n## 实际\ny\n`

describe('check-heading-skeleton (v0.7.5+)', () => {
  test('case 1: 全部 ok → passed=N + failed=[]', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'drafts', 'issue-a.md'), VALID_ISSUE)
    writeFileSync(join(tmpDir, '.openxenon', 'drafts', 'issue-b.md'), VALID_ISSUE)
    const r = checkDirectories([join(tmpDir, '.openxenon', 'drafts')])
    expect(r.checked).toBe(2)
    expect(r.passed).toBe(2)
    expect(r.failed).toEqual([])
  })

  test('case 2: 缺 required → failed[] 含该文件', () => {
    writeFileSync(join(tmpDir, '.openxenon', 'drafts', 'issue-a.md'), INVALID_ISSUE_MISSING_EXPECTED)
    const r = checkDirectories([join(tmpDir, '.openxenon', 'drafts')])
    expect(r.checked).toBe(1)
    expect(r.passed).toBe(0)
    expect(r.failed.length).toBe(1)
    expect(r.errors[0]?.missing).toContain('## 期望')
  })

  test('case 3: 空目录 → 0 files checked + passed=0', () => {
    const r = checkDirectories([join(tmpDir, '.openxenon', 'drafts')])
    expect(r.checked).toBe(0)
    expect(r.passed).toBe(0)
    expect(r.failed).toEqual([])
  })

  test('case 4: 目录不存在 → 静默跳过 (degraded mode)', () => {
    const r = checkDirectories([join(tmpDir, '.openxenon', 'drafts', 'nonexistent')])
    expect(r.checked).toBe(0)
    expect(r.passed).toBe(0)
  })

  // 🆕 v3.2.1: 回归测试 rfc/ 子目录递归 walk
  test('case 5: rfc/ 子目录递归检查 RFC Draft 骨架', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'drafts', 'rfc'), { recursive: true })
    // RFC skeleton: required = ['## 决策要点', '## 影响范围', '## 相关术语', '## 相关决策', '## Errata']
    const VALID_RFC = `## 决策要点\nx\n## 影响范围\ny\n## 相关术语\nz\n## 相关决策\nw\n## Errata\nv\n`
    const INVALID_RFC = `## 决策要点\nx\n## 影响范围\ny\n` // 缺 3 项
    writeFileSync(join(tmpDir, '.openxenon', 'drafts', 'rfc', 'rfc-0001-foo.md'), VALID_RFC)
    writeFileSync(join(tmpDir, '.openxenon', 'drafts', 'rfc', 'rfc-0002-bar.md'), INVALID_RFC)
    const r = checkDirectories([join(tmpDir, '.openxenon', 'drafts')])
    expect(r.checked).toBe(2)
    expect(r.passed).toBe(1)
    expect(r.failed.length).toBe(1)
    expect(r.failed[0]).toContain('rfc-0002-bar.md')
  })

  // 🆕 v3.2.1: .archived/ 子目录跳过
  test('case 6: .archived/ 子目录不检查', () => {
    mkdirSync(join(tmpDir, '.openxenon', 'drafts', '.archived'), { recursive: true })
    writeFileSync(join(tmpDir, '.openxenon', 'drafts', '.archived', 'issue-old.md'), INVALID_ISSUE_MISSING_EXPECTED)
    const r = checkDirectories([join(tmpDir, '.openxenon', 'drafts')])
    expect(r.checked).toBe(0)
    expect(r.failed).toEqual([])
  })
})
