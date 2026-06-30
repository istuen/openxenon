// =============================================================================
// /oxn-proof skill content test (v0.1.2 Phase C: AI 可见层)
//
// 验证 skill 文件本身也不泄漏实现细节：
//   - 不含 @oxn/probes/single-probe 完整 ref 名（AI 走 probe list 发现）
//   - 不含 verdict 内部判定规则
//   - 不含具体 param 内部名
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const SKILL_PATH = resolve(__dirname, '..', '..', 'skills', 'locales', 'zh-CN', 'oxn-proof', 'instruction.md')

describe('/oxn-proof skill content (no leak)', () => {
  test('skill 文件存在', () => {
    expect(existsSync(SKILL_PATH)).toBe(true)
  })

  test('skill 文本不含 verdict 内部逻辑', () => {
    const src = readFileSync(SKILL_PATH, 'utf-8')
    // 不含 exit 0 / hit 1 / statSync / spawn 等实现细节
    expect(src).not.toMatch(/exit\s*(?:0|码)/)
    expect(src).not.toMatch(/hit\s*>=?\s*\d/)
    expect(src).not.toMatch(/statSync|child_process|spawn\(/)
  })

  test('skill 文本不含具体 param 内部名（target / command / timeout / pattern）', () => {
    const src = readFileSync(SKILL_PATH, 'utf-8')
    expect(src).not.toMatch(/\btarget\s*=\s*"/)
    expect(src).not.toMatch(/\bcommand\s*=\s*"/)
    expect(src).not.toMatch(/\bpattern\s*=\s*"/)
  })

  test('skill 教学 AI 用 probe list / describe 而非硬编码 probe 名', () => {
    const src = readFileSync(SKILL_PATH, 'utf-8')
    expect(src).toContain('probe list')
    expect(src).toContain('probe describe')
  })
})
