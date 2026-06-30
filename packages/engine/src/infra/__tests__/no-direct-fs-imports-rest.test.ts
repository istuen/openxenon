import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

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
 * - packages/engine/src/Work/sandbox/sandbox-manager.ts (用 FileSystemPort 注入)
 * - packages/engine/src/cli/__tests__/ (CLI 范围, 属 t1a)
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
  'packages/engine/src/Work/sandbox/sandbox-manager.ts',
]

const FORBIDDEN_PATTERNS: RegExp[] = [
  /from\s+['"]fs['"]/,
  /from\s+['"]node:fs['"]/,
  /from\s+['"]fs\/promises['"]/,
  /from\s+['"]node:fs\/promises['"]/,
]

const _REPO_ROOT = join(import.meta.dir, '..', '..', '..')

function isProtected(filePath: string): boolean {
  if (EXEMPT_FILES.includes(filePath)) return false
  if (PROTECTED_FILES.includes(filePath)) return true
  return PROTECTED_DIRS.some((dir) => filePath.startsWith(`${dir}/`))
}

function collectProtectedFiles(): string[] {
  const result: string[] = []
  // protected files (single)
  for (const f of PROTECTED_FILES) {
    if (exists(f)) result.push(f)
  }
  // protected dirs (recursive)
  for (const dir of PROTECTED_DIRS) {
    walk(dir, result)
  }
  return result
}

function exists(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

function walk(dir: string, out: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === '.git') continue
      walk(full, out)
    } else if (st.isFile() && entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      out.push(full)
    }
  }
}

function findForbiddenImports(content: string): string[] {
  return FORBIDDEN_PATTERNS.filter((p) => p.test(content)).map((p) => p.source)
}

describe('Sprint 1 T1b: non-cli no-direct-fs-imports guard', () => {
  const files = collectProtectedFiles()

  it('受保护目录至少含 70 个生产文件', () => {
    expect(files.length).toBeGreaterThanOrEqual(70)
  })

  it.each(files)('%s 无 fs 直引', (filePath) => {
    if (!isProtected(filePath)) return
    const content = readFileSync(filePath, 'utf-8')
    const violations = findForbiddenImports(content)
    expect(violations).toEqual([])
  })
})
