/**
 * 共享 no-direct-fs-imports guard helper —— 给 packages/cli + engine infra 的两个守卫测试共用。
 *
 * 规则：禁止 `import ... from 'fs' / 'node:fs' / 'fs/promises' / 'node:fs/promises'`。
 * 所有 FS 调用必须走 infra/filesystem 或 infra/filesystem-async。
 */

import { readFileSync, readdirSync, statSync } from 'fs'

export const FORBIDDEN_PATTERNS: RegExp[] = [
  /from\s+['"]fs['"]/,
  /from\s+['"]node:fs['"]/,
  /from\s+['"]fs\/promises['"]/,
  /from\s+['"]node:fs\/promises['"]/,
]

export function findForbiddenImports(content: string): string[] {
  return FORBIDDEN_PATTERNS.filter((p) => p.test(content)).map((p) => p.source)
}

/** 递归收集 dir 下所有 *.ts（不含 .test.ts 与 __tests__/）。 */
export function walkTs(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = `${dir}/${entry}`
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === '.git') continue
      walkTs(full, out)
    } else if (st.isFile() && entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      out.push(full)
    }
  }
  return out
}

export function fileExists(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

// re-exported for consumer convenience
export { readFileSync, readdirSync, statSync }
