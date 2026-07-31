/**
 * config-aware-path.test.ts — I-6 fix 回归测试
 *
 * 验证 oxn asset 命令族真正读取 .openxenon/config.json 里的 assetRoot / assetDirs 配置。
 *
 * 之前 7 个调用点（list / validate / archive / create / delete / evolve / resolver）全传 config=null，
 * 导致 assetRoot 完全不生效。
 */

import { describe, test, expect } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { list, listAll } from '../list.js'
import { resolveAssetFile } from '../internal/resolver.js'
import { validateAssetReferences } from '../validate.js'
import { listAssetReferences } from '../internal/reference-checker.js'
import { loadProjectConfig } from '@openxenon/engine/infra/project-config'

let tmpDir: string

function setupProjectWithConfig(assetRoot: string): void {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-i6-'))
  mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
  writeFileSync(
    join(tmpDir, '.openxenon', 'config.json'),
    JSON.stringify({
      version: 1,
      mode: 'PRODUCTION',
      assetRoot,
    }),
  )
}

function teardown(): void {
  rmSync(tmpDir, { recursive: true, force: true })
}

describe('I-6: oxn asset 命令族读取 .openxenon/config.json 的 assetRoot', () => {
  test('1. loadProjectConfig 加载 assetRoot 字段', () => {
    setupProjectWithConfig('custom-assets')
    const config = loadProjectConfig(tmpDir)
    expect(config).not.toBeNull()
    expect(config?.assetRoot).toBe('custom-assets')
    teardown()
  })

  test('2. list() 用自定义 assetRoot 在指定目录查找', () => {
    setupProjectWithConfig('custom-assets')
    mkdirSync(join(tmpDir, '.openxenon', 'custom-assets', 'domains'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'custom-assets', 'domains', 'custom-domain.md'),
      '---\nentity: domain\n---\n# Domain: custom-domain\n',
    )
    const result = list({ kind: 'domain', projectRoot: tmpDir })
    expect(result.assets.length).toBe(1)
    expect(result.assets[0]!.name).toBe('custom-domain')
    expect(result.assets[0]!.path).toContain('custom-assets')
    teardown()
  })

  test('3. listAll() 也读 config（无 --kind 时）', () => {
    setupProjectWithConfig('team-assets')
    mkdirSync(join(tmpDir, '.openxenon', 'team-assets', 'workflows'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'team-assets', 'workflows', 'team-wf.md'),
      '---\nentity: workflow\n---\n# Workflow: team-wf\n',
    )
    const result = listAll(tmpDir)
    expect(result.assets.some((a) => a.name === 'team-wf')).toBe(true)
    teardown()
  })

  test('4. 不存在的 assetRoot → list 返回空数组（不报错）', () => {
    setupProjectWithConfig('non-existent-root')
    const result = list({ kind: 'domain', projectRoot: tmpDir })
    expect(result.assets).toEqual([])
    teardown()
  })

  test('5. resolveAssetFile() 用 config 解析路径', () => {
    setupProjectWithConfig('team-assets')
    const path = resolveAssetFile(tmpDir, 'workflow', 'my-wf', 'md')
    expect(path).toContain('team-assets')
    expect(path).toContain('my-wf.md')
    teardown()
  })

  test('6. 项目无 config.json 时 → 用默认 .openxenon/assets 根', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-i6-no-config-'))
    mkdirSync(join(tmpDir, '.openxenon'), { recursive: true })
    mkdirSync(join(tmpDir, '.openxenon', 'assets', 'domains'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'assets', 'domains', 'default.md'),
      '---\nentity: domain\n---\n# Domain: default\n',
    )
    // 无 config.json → loadProjectConfig 返回 null → resolveAssetDir 用默认 assetRoot='assets'
    const config = loadProjectConfig(tmpDir)
    expect(config).toBeNull()
    const path = resolveAssetFile(tmpDir, 'domain', 'default', 'md', config)
    expect(path).toContain('.openxenon')
    expect(path).toContain('/assets/')
    teardown()
  })

  test('7. validateAssetReferences 用 config 扫 5 类（不报错即过）', () => {
    setupProjectWithConfig('shared-assets')
    mkdirSync(join(tmpDir, '.openxenon', 'shared-assets', 'blueprints'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'shared-assets', 'blueprints', 'shared-bp.md'),
      '---\nentity: blueprint\nreferences: []\n---\n# Blueprint: shared-bp\n',
    )
    const result = validateAssetReferences(tmpDir)
    // 验证能扫到自定义根的 assets（无环、无自环、无孤儿引用）
    expect(result.ok).toBe(true)
    expect(result.cycles).toEqual([])
    expect(result.selfRefs).toEqual([])
    expect(result.orphans).toEqual([])
    teardown()
  })

  test('8. listAssetReferences 用 config 扫 5 类', () => {
    setupProjectWithConfig('remote-assets')
    mkdirSync(join(tmpDir, '.openxenon', 'remote-assets', 'stacks'), { recursive: true })
    writeFileSync(
      join(tmpDir, '.openxenon', 'remote-assets', 'stacks', 'remote-stack.md'),
      '---\nentity: stack\n---\n# Stack: remote-stack\n',
    )
    const refs = listAssetReferences(tmpDir)
    expect(refs.some((r) => r.kind === 'stack' && r.name === 'remote-stack')).toBe(true)
    teardown()
  })
})
