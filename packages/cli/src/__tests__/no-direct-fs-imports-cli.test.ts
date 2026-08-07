import { describe, expect, it } from 'bun:test'
import { join } from 'path'
import { findForbiddenImports, readFileSync, readdirSync, statSync } from './helpers/no-direct-fs'

const COMMANDS_DIR = join(import.meta.dir, '..', 'commands')

/**
 * 守护：packages/cli/src/commands/*.ts 不得直引 'fs' / 'node:fs' / 'fs/promises' / 'node:fs/promises'
 * 必须走 packages/engine/src/infra/filesystem 或 filesystem-async
 *
 * v0.2 Sprint 1 T1a: 22 个 cli 文件迁完后加入此 guard
 * 背景: lint 的 no-restricted-imports 规则仅在 L0 / Daemon 启用, L3-CLI 仍可直引
 */
describe('packages/cli/src/commands/* no-direct-fs-imports guard', () => {
  const allEntries = readdirSync(COMMANDS_DIR)
  const tsFiles = allEntries.filter((f) => f.endsWith('.ts') && !f.includes('__tests__'))

  it('commands 目录存在且含生产文件', () => {
    expect(tsFiles.length).toBeGreaterThan(0)
  })

  it('commands 目录生产文件应被本 guard 覆盖 (cli-convergence 后实际文件数)', () => {
    expect(tsFiles.length).toBeGreaterThanOrEqual(30)
  })

  it.each(tsFiles)('%s 无 fs 直引', (filename) => {
    const filePath = join(COMMANDS_DIR, filename)
    if (!statSync(filePath).isFile()) return
    const content = readFileSync(filePath, 'utf-8')
    const violations = findForbiddenImports(content)
    expect(violations).toEqual([])
  })
})
