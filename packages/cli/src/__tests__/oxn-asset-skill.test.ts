// =============================================================================
// oxn-asset-skill.test.ts — v0.6.1-alpha.4 (5 AssetKind 收敛 + Workflow 改名 + Blueprint 组合模板)
//
// 覆盖 `.opencode/skills/oxn-asset/` 渐进式披露结构：
//   1. SKILL.md 极简（≤1000 tokens 含 frontmatter）
//   2. frontmatter 名称 = oxn-asset
//   3. description 关键词含 Asset 生命周期管理（不混入 Work 编排）
//   4. references/ 5 个文件（asset-kind / creation / evolution / lifecycle / vs-work）
//   5. assets/ 4 个 AssetKind 模板（domain / workflow / stack / blueprint；library/external 删除）
//   6. 模板 H1 格式正确（# Domain: / # Workflow: / # Stack: / # Blueprint:）
//   7. 模板 H2 分类遵循 v0.3 RFC + v0.6.1-alpha.4 收敛
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

describe('oxn-asset SKILL.md 渐进式披露（v0.6.1-alpha.4）', () => {
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
    expect(fm).toMatch(/Asset|lifecycle|create|modify|delete/)
    const descMatch = fm?.match(/description:\s*(.+)/)
    if (descMatch) {
      const desc = descMatch[1] ?? ''
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

  test('5. assets/ 4 个 AssetKind 模板全部存在（v0.6.1-alpha.4 收敛）', () => {
    const expected = ['domain.md', 'workflow.md', 'stack.md', 'blueprint.md']
    for (const filename of expected) {
      const path = join(SKILL_DIR, 'assets', filename)
      expect(existsSync(path)).toBe(true)
    }
  })

  test('6. 模板 H1 格式正确（# <Entity>: <name>）', () => {
    const cases = [
      { file: 'domain.md', entity: 'Domain' },
      { file: 'workflow.md', entity: 'Workflow' },
      { file: 'stack.md', entity: 'Stack' },
      { file: 'blueprint.md', entity: 'Blueprint' },
    ]
    for (const c of cases) {
      const content = readIfExists(join(SKILL_DIR, 'assets', c.file))
      expect(content).toMatch(new RegExp(`^# ${c.entity}: <name>$`, 'm'))
    }
  })

  test('7. domain.md H2 分类遵循 DomainCompiler（Terms / Bans / Invariants）', () => {
    // v0.7 重构: DomainCompiler H2 白名单 = ['Terms', 'Bans', 'Invariants']
    //   - 删 'Stack'（v0.4 PR-A 软推荐已废弃）
    //   - 删 'Externals'（external 并入 frontmatter references）
    const content = readIfExists(join(SKILL_DIR, 'assets', 'domain.md'))
    expect(content).toMatch(/^## Terms$/m)
    expect(content).toMatch(/^## Bans$/m)
    expect(content).toMatch(/^## Invariants$/m)
  })

  test('8. workflow.md H2 分类遵循 WorkflowCompiler（Slots）', () => {
    // v0.7 重构: WorkflowCompiler H2 白名单 = ['Slots']
    //   - 删 'Props' + 'Externals'（v0.4 PR-A 软推荐已废弃）
    const content = readIfExists(join(SKILL_DIR, 'assets', 'workflow.md'))
    expect(content).toMatch(/^## Slots$/m)
  })

  test('9. stack.md H2 分类遵循 StackCompiler（Tools）', () => {
    // v0.7 重构: StackCompiler H2 白名单 = ['Tools']
    //   - 删 'Runtimes / Linters / Tests / Externals'（v0.4 PR-A 软推荐已废弃）
    const content = readIfExists(join(SKILL_DIR, 'assets', 'stack.md'))
    expect(content).toMatch(/^## Tools$/m)
  })

  test('10. blueprint.md H2 分类遵循 BlueprintCompiler（Use / Boundaries）', () => {
    // v0.7 重构: BlueprintCompiler H2 白名单 = ['Use', 'Boundaries']
    //   - 删 'Refs'（ref 关系通过 ## Use 段表达）
    const content = readIfExists(join(SKILL_DIR, 'assets', 'blueprint.md'))
    expect(content).toMatch(/^## Use$/m)
    expect(content).toMatch(/^## Boundaries$/m)
  })

  test('11. 4 个模板 frontmatter entity 字段正确', () => {
    const cases = [
      { file: 'domain.md', entity: 'domain' },
      { file: 'workflow.md', entity: 'workflow' },
      { file: 'stack.md', entity: 'stack' },
      { file: 'blueprint.md', entity: 'blueprint' },
    ]
    for (const c of cases) {
      const content = readIfExists(join(SKILL_DIR, 'assets', c.file))
      expect(content).toMatch(new RegExp(`^entity: ${c.entity}$`, 'm'))
    }
  })

  test('12. 不用 OXL 代码块包裹内容（模板本身是 .md）', () => {
    const files = ['domain.md', 'workflow.md', 'stack.md', 'blueprint.md']
    for (const f of files) {
      const content = readIfExists(join(SKILL_DIR, 'assets', f))
      expect(content).not.toMatch(/```oxn/)
    }
  })

  test('13. references/asset-vs-work.md 明确职责边界', () => {
    const content = readIfExists(join(SKILL_DIR, 'references', 'asset-vs-work.md'))
    expect(content).toContain('oxn-asset')
    expect(content).toContain('oxn-work')
  })
})

describe('oxn-asset SKILL.md 一致性 + install-skill 传播', () => {
  test('14. 项目源 SKILL.md 与全局 SKILL.md 一致', () => {
    if (!existsSync(SKILL_GLOBAL)) {
      console.log('skip: global SKILL not installed')
      return
    }
    const proj = readIfExists(SKILL_PROJECT)
    const global = readIfExists(SKILL_GLOBAL)
    expect(proj).toBe(global)
  })
})
