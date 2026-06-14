import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const CLI_DIR = join(import.meta.dir, '..')

/**
 * 守护：src/cli/*.ts 不得直引 'fs' / 'node:fs' / 'fs/promises' / 'node:fs/promises'
 * 必须走 src/infra/filesystem 或 src/infra/filesystem-async
 *
 * v0.2 Sprint 1 T1a: 22 个 cli 文件迁完后加入此 guard
 * 背景: lint 的 no-restricted-imports 规则仅在 L0 / Daemon 启用, L3-CLI 仍可直引
 */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /from\s+['"]fs['"]/,
  /from\s+['"]node:fs['"]/,
  /from\s+['"]fs\/promises['"]/,
  /from\s+['"]node:fs\/promises['"]/,
]

function findForbiddenImports(content: string): string[] {
  return FORBIDDEN_PATTERNS.filter((p) => p.test(content)).map((p) => p.source)
}

describe('src/cli/* no-direct-fs-imports guard', () => {
  const allEntries = readdirSync(CLI_DIR)
  const tsFiles = allEntries.filter((f) => f.endsWith('.ts') && !f.includes('__tests__'))

  it('CLI 目录存在且含生产文件', () => {
    expect(tsFiles.length).toBeGreaterThan(0)
  })

  it('22 个生产文件应被本 guard 覆盖', () => {
    // 22 = Sprint 1 T1a 迁移范围; 可能后续新增文件, 此处仅验证下限
    expect(tsFiles.length).toBeGreaterThanOrEqual(22)
  })

  it.each(tsFiles)('%s 无 fs 直引', (filename) => {
    const filePath = join(CLI_DIR, filename)
    if (!statSync(filePath).isFile()) return
    const content = readFileSync(filePath, 'utf-8')
    const violations = findForbiddenImports(content)
    expect(violations).toEqual([])
  })
})
