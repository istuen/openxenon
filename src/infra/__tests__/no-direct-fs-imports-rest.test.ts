import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * 守护: Sprint 1 T1b 迁移的 28 个非 cli 生产文件不得直引 fs / node:fs / fs/promises / node:fs/promises
 * 必须走 src/infra/filesystem (sync) 或 src/infra/filesystem-async (async)
 *
 * 受保护目录（应被收口）:
 * - src/infra/probes/
 * - src/infra/frozen/
 * - src/infra/explore/
 * - src/infra/loader.ts / scanner.ts / socket.ts
 * - src/oxl/compiler/ / src/oxl/langium/ / src/oxl/scope/ / src/oxl/unpacker/
 * - src/work/
 * - src/watcher/
 * - src/hall/
 *
 * 豁免:
 * - src/infra/runtime/ (phase 1 收口)
 * - src/infra/filesystem.ts / filesystem-async.ts (迁移层本身)
 * - src/infra/boundary.ts (用 OsPort, 仍通过 Kernel)
 * - src/work/sandbox/sandbox-manager.ts (用 FileSystemPort 注入)
 * - src/cli/__tests__/ (CLI 范围, 属 t1a)
 */
const PROTECTED_DIRS: string[] = [
  'src/infra/probes',
  'src/infra/frozen',
  'src/infra/explore',
  'src/oxl/compiler',
  'src/oxl/langium',
  'src/oxl/scope',
  'src/oxl/unpacker',
  'src/work',
  'src/watcher',
  'src/hall',
]

const PROTECTED_FILES: string[] = ['src/infra/loader.ts', 'src/infra/scanner.ts', 'src/infra/socket.ts']

const EXEMPT_FILES: string[] = [
  'src/infra/filesystem.ts',
  'src/infra/filesystem-async.ts',
  'src/infra/boundary.ts',
  'src/work/sandbox/sandbox-manager.ts',
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

  it('受保护目录至少含 28 个生产文件', () => {
    expect(files.length).toBeGreaterThanOrEqual(28)
  })

  it.each(files)('%s 无 fs 直引', (filePath) => {
    if (!isProtected(filePath)) return
    const content = readFileSync(filePath, 'utf-8')
    const violations = findForbiddenImports(content)
    expect(violations).toEqual([])
  })
})
