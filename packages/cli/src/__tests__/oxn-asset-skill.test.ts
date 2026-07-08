// =============================================================================
// oxn-asset-skill.test.ts — v0.6.1-alpha.1 (ADR-0039 + 2-Skill 拆分)
//
// 覆盖 `.opencode/skills/oxn-asset/` 渐进式披露结构：
//   1. SKILL.md 极简（≤1000 tokens 含 frontmatter）
//   2. frontmatter 名称 = oxn-asset
//   3. description 关键词含 Asset 生命周期管理（不混入 Work 编排）
//   4. references/ 5 个文件（asset-kind / creation / evolution / lifecycle / vs-work）
//   5. assets/ 5 个 AssetKind 模板（domain / blueprint / stack / library / external）
//   6. 模板 H1 格式正确（# Domain: / # Blueprint: / # Stack: / # Library: / # External:）
//   7. 模板 H2 分类遵循 v0.3 RFC + v0.6.3 Asset Paper Schema
//   8. 安装一致性：项目源 SKILL.md 与全局 SKILL.md 一致
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..', '..')
const SKILL_DIR = join(PROJECT_ROOT, '.opencode', 'skills', 'oxn-asset')
const SKILL_PROJECT = join(SKILL_DIR, 'SKILL.md')
const SKILL_GLOBAL = join(homedir(), '.opencode', 'skills', 'oxn-asset', 'SKILL.md')

function readIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf-8') : ''
}

describe('oxn-asset SKILL.md 渐进式披露（v0.6.1-alpha.1）', () => {
  test('1. SKILL.md 极简（≤1000 tokens 含 frontmatter）', () => {
    const content = readIfExists(SKILL_PROJECT)
    expect(content.length).toBeGreaterThan(0)
    const roughTokens = Math.ceil(content.length / 4)
    expect(roughTokens).toBeLessThanOrEqual(1000)
  })

  test('2. frontmatter name = oxn-asset', () => {
    const content = readIfExists(SKILL_PROJECT)
    const fm = content.split('---')[1]
    expect(fm).toContain('name: oxn-asset')
  })

  test('3. description 含 Asset 生命周期 + 不混入 Work 编排', () => {
    const content = readIfExists(SKILL_PROJECT)
    const fm = content.split('---')[1]
    // 应含 Asset 生命周期关键词
    expect(fm).toMatch(/Asset|lifecycle|create|modify|delete/)
    // 应排除 Work 编排关键词（frontmatter 描述部分）
    // 检查 description 行不含 Work 模式核心动词
    const descMatch = fm?.match(/description:\s*(.+)/)
    if (descMatch) {
      const desc = descMatch[1] ?? ''
      // 不应触发 Work 模式（run / submit / Round）
      expect(desc).not.toContain('Round')
      expect(desc).not.toMatch(/编排.*Work/)
    }
  })

  test('4. references/ 5 个文件全部存在', () => {
    const expected = [
      'asset-kind-reference.md',
      'asset-creation.md',
      'asset-evolution.md',
      'asset-lifecycle.md',
      'asset-vs-work.md',
    ]
    for (const filename of expected) {
      const path = join(SKILL_DIR, 'references', filename)
      expect(existsSync(path)).toBe(true)
    }
  })

  test('5. assets/ 5 个 AssetKind 模板全部存在', () => {
    const expected = [
      'domain.md',
      'blueprint.md',
      'stack.md',
      'library.md',
      'external.md',
    ]
    for (const filename of expected) {
      const path = join(SKILL_DIR, 'assets', filename)
      expect(existsSync(path)).toBe(true)
    }
  })

  test('6. 模板 H1 格式正确（# <Entity>: <name>）', () => {
    const cases = [
      { file: 'domain.md', entity: 'Domain' },
      { file: 'blueprint.md', entity: 'Blueprint' },
      { file: 'stack.md', entity: 'Stack' },
      { file: 'library.md', entity: 'Library' },
      { file: 'external.md', entity: 'External' },
    ]
    for (const c of cases) {
      const content = readIfExists(join(SKILL_DIR, 'assets', c.file))
      expect(content).toMatch(new RegExp(`^# ${c.entity}: <name>$`, 'm'))
    }
  })

  test('7. domain.md H2 分类遵循 v0.3 RFC（Terms / Bans / Invariants）', () => {
    const content = readIfExists(join(SKILL_DIR, 'assets', 'domain.md'))
    expect(content).toMatch(/^## Terms$/m)
    expect(content).toMatch(/^## Bans$/m)
    expect(content).toMatch(/^## Invariants$/m)
  })

  test('8. blueprint.md H2 分类遵循 BlueprintCompiler（Props / Slots）', () => {
    const content = readIfExists(join(SKILL_DIR, 'assets', 'blueprint.md'))
    expect(content).toMatch(/^## Props$/m)
    expect(content).toMatch(/^## Slots$/m)
  })

  test('9. stack.md H2 分类遵循 stack-compiler（Runtimes / Linters / Tests）', () => {
    const content = readIfExists(join(SKILL_DIR, 'assets', 'stack.md'))
    expect(content).toMatch(/^## Runtimes$/m)
    expect(content).toMatch(/^## Linters$/m)
    expect(content).toMatch(/^## Tests$/m)
  })

  test('10. library.md H2 分类（Sources）', () => {
    const content = readIfExists(join(SKILL_DIR, 'assets', 'library.md'))
    expect(content).toMatch(/^## Sources$/m)
  })

  test('11. external.md H2 分类（Links）', () => {
    const content = readIfExists(join(SKILL_DIR, 'assets', 'external.md'))
    expect(content).toMatch(/^## Links$/m)
  })

  test('12. 5 个模板 frontmatter entity 字段正确', () => {
    const cases = [
      { file: 'domain.md', entity: 'domain' },
      { file: 'blueprint.md', entity: 'blueprint' },
      { file: 'stack.md', entity: 'stack' },
      { file: 'library.md', entity: 'library' },
      { file: 'external.md', entity: 'external' },
    ]
    for (const c of cases) {
      const content = readIfExists(join(SKILL_DIR, 'assets', c.file))
      expect(content).toMatch(new RegExp(`^entity: ${c.entity}$`, 'm'))
    }
  })

  test('13. 不用 OXL 代码块包裹内容（模板本身是 .md）', () => {
    const files = ['domain.md', 'blueprint.md', 'stack.md', 'library.md', 'external.md']
    for (const f of files) {
      const content = readIfExists(join(SKILL_DIR, 'assets', f))
      expect(content).not.toMatch(/```oxn/)
    }
  })

  test('14. references/asset-vs-work.md 明确职责边界', () => {
    const content = readIfExists(join(SKILL_DIR, 'references', 'asset-vs-work.md'))
    expect(content).toContain('oxn-asset')
    expect(content).toContain('oxn-work')
  })
})

describe('oxn-asset SKILL.md 一致性 + install-skill 传播', () => {
  test('15. 项目源 SKILL.md 与全局 SKILL.md 一致', () => {
    if (!existsSync(SKILL_GLOBAL)) {
      console.log('skip: global SKILL not installed')
      return
    }
    const proj = readIfExists(SKILL_PROJECT)
    const glob = readIfExists(SKILL_GLOBAL)
    expect(proj).toBe(glob)
  })

  test('16. oxn install-skill --force 成功传播到全局', () => {
    const proc = Bun.spawn(['bun', join(PROJECT_ROOT, 'packages/cli/src/index.ts'), 'install-skill', '--skill', 'oxn-asset', '--force', '--json'], {
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

describe('oxn-asset 与 oxn-work 职责边界', () => {
  test('17. oxn-asset description 不含 Work 模式核心动词', () => {
    const content = readIfExists(SKILL_PROJECT)
    const fm = content.split('---')[1]
    expect(fm).not.toContain('Round')
    expect(fm).not.toContain('submit')
    // 允许 description 提及 "Proof 展示" 作为边界（明确不做），但不应用作触发关键词
    const descMatch = fm?.match(/description:\s*(.+)/)
    if (descMatch) {
      const desc = descMatch[1] ?? ''
      // description 中 "Proof" 应只在边界说明中出现（不作为可执行动词）
      const proofMatches = desc.match(/Proof/g) ?? []
      expect(proofMatches.length).toBeLessThanOrEqual(1) // 边界说明最多 1 次
    }
  })

  test('18. oxn-work description 不含 Asset 创建/修改', () => {
    const workSkillPath = join(PROJECT_ROOT, '.opencode', 'skills', 'oxn-work', 'SKILL.md')
    const content = readIfExists(workSkillPath)
    const fm = content.split('---')[1]
    // oxn-work 的 description 应不含 Asset 创建关键词
    expect(fm).not.toMatch(/create.*Asset|Asset.*create/)
    // 应明确不含 "create domain" / "create blueprint"
    const descMatch = fm?.match(/description:\s*(.+)/)
    if (descMatch) {
      const desc = descMatch[1] ?? ''
      expect(desc).not.toMatch(/create\s+(domain|blueprint|stack)/)
    }
  })
})