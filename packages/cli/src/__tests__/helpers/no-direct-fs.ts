/**
 * CLI 本地副本 of no-direct-fs guard helper —— 防止跨包测试 import (L3↔L0)
 * 真正公用 helper 在 packages/engine/src/infra/__tests__/helpers/no-direct-fs.ts
 * 保持两份同步；规则只有 ~10 行，复制比跨包 import 更稳。
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

export function fileExists(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

export { readFileSync, readdirSync, statSync }
