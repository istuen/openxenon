import { describe, expect, it } from 'bun:test'
import { findForbiddenImports, fileExists, readFileSync, walkTs } from './helpers/no-direct-fs'

/**
 * 守护: Sprint 1 T1b 迁移的非 cli 生产文件不得直引 fs / node:fs / fs/promises / node:fs/promises
 * 必须走 packages/engine/src/infra/filesystem (sync) 或 filesystem-async (async)
 *
 * 受保护目录（应被收口）:
 * - packages/engine/src/infra/probes/
 * - packages/engine/src/infra/frozen/
 * - packages/engine/src/infra/explore/
 * - packages/engine/src/infra/loader.ts / scanner.ts / socket.ts
 * - packages/engine/src/oxl/compiler/ / langium-driver/ / scope/ / unpacker/
 * - packages/engine/src/Work/
 * - packages/engine/src/watcher/
 * - packages/engine/src/hall/
 *
 * 豁免:
 * - packages/engine/src/infra/runtime/ (phase 1 收口)
 * - packages/engine/src/infra/filesystem.ts / filesystem-async.ts (迁移层本身)
 * - packages/engine/src/infra/boundary.ts (用 OsPort, 仍通过 Kernel)
 * - packages/cli/src/__tests__/ (CLI 范围, 属 t1a)
 */
const PROTECTED_DIRS: string[] = [
  'packages/engine/src/infra/probes',
  'packages/engine/src/infra/frozen',
  'packages/engine/src/infra/explore',
  'packages/engine/src/oxl/compiler',
  'packages/engine/src/oxl/langium-driver',
  'packages/engine/src/oxl/scope',
  'packages/engine/src/oxl/unpacker',
  'packages/engine/src/Work',
  'packages/engine/src/watcher',
  'packages/engine/src/hall',
]

const PROTECTED_FILES: string[] = [
  'packages/engine/src/infra/loader.ts',
  'packages/engine/src/infra/scanner.ts',
  'packages/engine/src/infra/socket.ts',
]

const EXEMPT_FILES: string[] = [
  'packages/engine/src/infra/filesystem.ts',
  'packages/engine/src/infra/filesystem-async.ts',
  'packages/engine/src/infra/boundary.ts',
]

function isProtected(filePath: string): boolean {
  if (EXEMPT_FILES.includes(filePath)) return false
  if (PROTECTED_FILES.includes(filePath)) return true
  return PROTECTED_DIRS.some((dir) => filePath.startsWith(`${dir}/`))
}

function collectProtectedFiles(): string[] {
  const result: string[] = []
  for (const f of PROTECTED_FILES) {
    if (fileExists(f)) result.push(f)
  }
  for (const dir of PROTECTED_DIRS) {
    for (const f of walkTs(dir)) {
      if (isProtected(f)) result.push(f)
    }
  }
  return result
}

describe('Sprint 1 T1b: non-cli no-direct-fs-imports guard', () => {
  const files = collectProtectedFiles()

  it('受保护目录至少含 60 个生产文件', () => {
    expect(files.length).toBeGreaterThanOrEqual(60)
  })

  it.each(files)('%s 无 fs 直引', (filePath) => {
    if (!isProtected(filePath)) return
    const content = readFileSync(filePath, 'utf-8')
    const violations = findForbiddenImports(content)
    expect(violations).toEqual([])
  })
})
