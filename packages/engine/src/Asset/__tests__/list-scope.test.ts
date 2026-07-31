/**
 * list-scope.test.ts — I-4 fix 回归测试
 *
 * 验证 oxn asset list --scope oxn|prj|effective 行为：
 * - 'prj' (默认): 仅项目资产
 * - 'oxn': 仅 builtin 资产
 * - 'effective': 项目 + builtin-only（项目 override 的 builtin 不重复列）
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { list, listAll } from '../list.js'

let tmpDir: string

function setupProject(): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-i4-'))
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'blueprints'), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
}

function teardown(): void {
  rmSync(tmpDir, { recursive: true, force: true })
}

describe('I-4: oxn asset list --scope', () => {
  test('1. default scope=prj 仅项目资产', () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'blueprints', 'project-only.md'),
      '---\nentity: blueprint\nname: project-only\n---\n# Blueprint: project-only\n',
    )
    const result = list({ kind: 'blueprint', projectRoot: tmpDir })
    expect(result.assets.length).toBe(1)
    expect(result.assets[0]?.name).toBe('project-only')
    expect(result.assets[0]?.scope).toBe('prj')
    teardown()
  })

  test('2. scope=oxn 仅 builtin 资产（不读项目）', () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'blueprints', 'project-only.md'),
      '---\nentity: blueprint\nname: project-only\n---\n# Blueprint: project-only\n',
    )
    const result = list({ kind: 'blueprint', projectRoot: tmpDir, scope: 'oxn' })
    // builtin blueprints 至少有 verify-pipeline / git-workflow / leader-test-dsl
    expect(result.assets.length).toBeGreaterThanOrEqual(1)
    expect(result.assets.every((a) => a.scope === 'oxn')).toBe(true)
    expect(result.assets.some((a) => a.name === 'project-only')).toBe(false)
    teardown()
  })

  test('3. scope=effective 合并项目 + builtin-only', () => {
    setupProject()
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'blueprints', 'project-only.md'),
      '---\nentity: blueprint\nname: project-only\n---\n# Blueprint: project-only\n',
    )
    const result = list({ kind: 'blueprint', projectRoot: tmpDir, scope: 'effective' })
    const names = result.assets.map((a) => a.name)
    expect(names).toContain('project-only')
    expect(result.assets.some((a) => a.name === 'verify-pipeline' && a.scope === 'oxn')).toBe(true)
    teardown()
  })

  test('4. scope=oxn 对 domain（builtin 目录不存在）返回空', () => {
    setupProject()
    const result = list({ kind: 'domain', projectRoot: tmpDir, scope: 'oxn' })
    expect(result.assets.length).toBe(0)
    teardown()
  })

  test('5. listAll 透传 scope', () => {
    setupProject()
    const resultAllPrj = listAll(tmpDir, null, 'prj')
    const resultAllOxn = listAll(tmpDir, null, 'oxn')
    // prj 模式：仅项目（这里只有空 blueprints/domains → 都空）
    expect(resultAllPrj.assets.length).toBe(0)
    // oxn 模式：仅 builtin（至少有 3 个 builtin blueprint）
    expect(resultAllOxn.assets.length).toBeGreaterThan(0)
    expect(resultAllOxn.assets.every((a) => a.scope === 'oxn')).toBe(true)
    teardown()
  })
})
