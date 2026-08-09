#!/usr/bin/env bun
/**
 * scripts/check-no-new-langium-usage.ts — v0.7.5 同步（v0.6.1 PR-4 CI 守卫，fatal 等级）
 *
 * version: 0.7.5
 * synced-at: 2026-08-09
 *
 * 检测 PR 引入的"新增文件"是否使用 Langium import。**已有文件不动**。
 *
 * 设计动机（D-β c 锁定）：
 *   - v0.6.1 不卸 Langium（保留作 v0.6.x fallback）
 *   - v0.6.1 禁止新增 Langium import — 所有新代码走 mdast + EntityCompiler
 *   - v0.7.0 切割时一次 `git rm` langium-driver 目录 + 卸 npm dep
 *
 * 检测范围：git diff --name-only --diff-filter=A (新增文件)
 *   - `from 'langium'`
 *   - `from '@langium/...'`
 *   - `require('langium')` 旧 CJS 风格
 *
 * 排除：
 *   - `langium-driver/` 与 `generated/` 目录（已 deprecated）
 *   - 测试文件 `__tests__/`
 *   - 已有 Langium usage 的文件（git diff 不视为修改）
 *
 * 使用：
 *   bun scripts/check-no-new-langium-usage.ts       # 本地/CI
 *   git diff --name-only --diff-filter=A HEAD~1    # 看新增文件
 *
 * v0.7.0 切割时：本脚本升级为拦截**所有**Langium usage（D-β c 第 2 阶段）
 */

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PROJECT_ROOT = process.cwd()

/** 执行 git 命令 */
function git(args: string[]): string {
  return execSync(`git ${args.join(' ')}`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
  }).trim()
}

/** 检测新增文件（非 staged，仅 committed + working tree） */
function getNewFiles(): string[] {
  // 比较 HEAD 与 working tree 的新增（untracked）文件
  // git diff --name-only --diff-filter=A 比较 staged against HEAD；不能用
  // 这里采用：git ls-files --others --exclude-standard 列出未跟踪文件 + 已 staged 新增
  const output = git(['ls-files', '--others', '--exclude-standard'])
  const untracked = output ? output.split('\n').filter(Boolean) : []

  // 已 staged 的新增文件
  const staged = git(['diff', '--cached', '--name-only', '--diff-filter=A'])
  const stagedNew = staged ? staged.split('\n').filter(Boolean) : []

  return [...untracked, ...stagedNew]
}

/** 检测文件里 Langium import */
function hasLangiumImport(file: string): { hasLangium: boolean; lines: number[] } {
  const fullPath = join(PROJECT_ROOT, file)
  let content: string
  try {
    content = readFileSync(fullPath, 'utf-8')
  } catch {
    return { hasLangium: false, lines: [] }
  }
  const lines = content.split('\n')
  const matches: number[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (
      line.includes(`from 'langium'`) ||
      line.includes(`from "@langium`) ||
      line.includes(`from '@langium`) ||
      line.match(/require\(['"]langium['"]\)/) ||
      line.match(/require\(['"]@langium\//)
    ) {
      matches.push(i + 1)
    }
  }
  return { hasLangium: matches.length > 0, lines: matches }
}

function main() {
  const newFiles = getNewFiles()
  const findings: Array<{ file: string; lines: number[] }> = []

  for (const file of newFiles) {
    // 跳过非扫描范围
    if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.mjs')) {
      continue
    }
    if (file.includes('node_modules')) continue
    if (file.startsWith('scripts/')) continue // 本检查脚本自身
    if (file.includes('__tests__')) continue
    if (file.includes('langium-driver/')) continue
    if (file.includes('generated/')) continue
    if (file.includes('/dist/')) continue

    const { hasLangium, lines } = hasLangiumImport(file)
    if (hasLangium) {
      findings.push({ file, lines })
    }
  }

  if (findings.length === 0) {
    console.log('✓ check-no-new-langium-usage: no NEW Langium usage in newly-added files (HEAD vs working tree).')
    process.exit(0)
  }

  console.error('✗ check-no-new-langium-usage FAILED — D-β c 锁定禁止新增 Langium import:')
  for (const f of findings) {
    console.error(`  ${f.file}:${f.lines.join(',')}`)
  }
  console.error('')
  console.error('如确需新增 Langium, 请先与 user 确认 D-β c 例外，并更新 PR-4 changelog。')
  console.error('Reference: .openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md (D9)')
  process.exit(1)
}

main()
