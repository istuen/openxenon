// =============================================================================
// oxn-work-skill-v1_1.test.ts — PR-12 + ADR-0039 重构
//
// 覆盖 `.opencode/skills/oxn-work/` v1.1 + 渐进式披露结构：
//   1. SKILL.md 极简（≤1000 tokens 目标，含 frontmatter）
//   2. SKILL.md 8 阶段流程（含 v1.1 字样）
//   3. references/ 5 个文件（按需加载）
//   4. assets/ 4 个 work.oxn 模板
//   5. frontmatter 名称 = oxn-work
//   6. 关键错误码在 SKILL.md 或 references 中存在
//   7. 反模式内容在 references/anti-patterns.md
//   8. V0→V1 路径映射在 references/v0-v1-migration.md
//   9. 安装一致性：项目源 SKILL.md 与全局 SKILL.md 一致
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { homedir } from 'os'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')
const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..', '..')
const SKILL_DIR = join(PROJECT_ROOT, '.opencode', 'skills', 'oxn-work')
const SKILL_PROJECT = join(SKILL_DIR, 'SKILL.md')
const SKILL_GLOBAL = join(homedir(), '.opencode', 'skills', 'oxn-work', 'SKILL.md')

function readIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf-8') : ''
}

describe('oxn-work SKILL.md v1.1 + 渐进式披露（PR-12 + ADR-0039）', () => {
  test('1. SKILL.md 极简（≤1000 tokens 含 frontmatter）', () => {
    const content = readIfExists(SKILL_PROJECT)
    expect(content.length).toBeGreaterThan(0)
    // 简易 token 估算：英文字符 ~0.25 token/字符
    const roughTokens = Math.ceil(content.length / 4)
    expect(roughTokens).toBeLessThanOrEqual(1000)
  })

  test('2. SKILL.md 含 8 阶段流程（v1.1）', () => {
    const content = readIfExists(SKILL_PROJECT)
    expect(content).toMatch(/create.*add-task.*validate.*lock.*run.*submit.*finalize/s)
  })

  test('3. references/ 5 个文件全部存在', () => {
    const expected = [
      '8-phase-detail.md',
      'error-codes.md',
      'anti-patterns.md',
      'v0-v1-migration.md',
      'git-workspace.md',
    ]
    for (const filename of expected) {
      const path = join(SKILL_DIR, 'references', filename)
      expect(existsSync(path)).toBe(true)
    }
  })

  test('4. assets/ 4 个 work 模板（.md 格式含 OXN 代码块）全部存在', () => {
    const expected = ['work-explore.md', 'work-develop.md', 'work-fix.md', 'work-onboarding.md']
    for (const filename of expected) {
      const path = join(SKILL_DIR, 'assets', filename)
      expect(existsSync(path)).toBe(true)
    }
  })

  test('5. frontmatter name = oxn-work', () => {
    const content = readIfExists(SKILL_PROJECT)
    const fm = content.split('---')[1]
    expect(fm).toContain('name: oxn-work')
  })

  test('5b. oxn-work description 不含 Asset 创建/修改', () => {
    const content = readIfExists(SKILL_PROJECT)
    const fm = content.split('---')[1]
    expect(fm).not.toMatch(/create.*Asset|Asset.*create/)
  })

  test('6. 关键错误码在 references/error-codes.md 存在', () => {
    const content = readIfExists(join(SKILL_DIR, 'references', 'error-codes.md'))
    expect(content).toContain('IAP_ALIGN_LOCK_NOT_FOUND')
    expect(content).toContain('IAP_ALIGN_LOCK_HASH_MISMATCH')
    expect(content).toContain('IAP_ALIGN_WORK_REMOVED')
  })

  test('7. 反模式内容在 references/anti-patterns.md', () => {
    const content = readIfExists(join(SKILL_DIR, 'references', 'anti-patterns.md'))
    expect(content).toContain('跳过 validate+lock 直接 run')
    expect(content).toContain('在锁后修改 .oxn')
  })

  test('8. V0→V1 路径映射在 references/v0-v1-migration.md', () => {
    const content = readIfExists(join(SKILL_DIR, 'references', 'v0-v1-migration.md'))
    expect(content).toContain('works/<w>/work-{state,trace,frozen}.{json,jsonl}')
    expect(content).toContain('works/<w>/.run/{state,trace,frozen}.{json,jsonl}')
    expect(content).toContain('.migrated-v0/')
  })
})

describe('oxn-work SKILL.md 一致性 + install-skill 传播（PR-12）', () => {
  test('9. 项目源 SKILL.md 与全局 SKILL.md 一致', () => {
    if (!existsSync(SKILL_GLOBAL)) {
      console.log('skip: global SKILL not installed')
      return
    }
    const proj = readIfExists(SKILL_PROJECT)
    const glob = readIfExists(SKILL_GLOBAL)
    expect(proj).toBe(glob)
  })

  test('10. oxn install-skill --force 成功传播到全局', () => {
    if (!existsSync(join(homedir(), '.opencode', 'skills'))) {
      mkdirSync(join(homedir(), '.opencode', 'skills'), { recursive: true })
    }
    const proc = Bun.spawn(['bun', CLI_PATH, 'install-skill', '--skill', 'oxn-work', '--force', '--json'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    return proc.exited.then(() => {
      expect(proc.exitCode).toBe(0)
      expect(existsSync(SKILL_GLOBAL)).toBe(true)
      const proj = readIfExists(SKILL_PROJECT)
      const glob = readIfExists(SKILL_GLOBAL)
      expect(proj).toBe(glob)
    })
  })
})
