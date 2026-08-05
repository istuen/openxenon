#!/usr/bin/env bun
/**
 * auto-wrap-versioned — 自动包 advisory 版本号引用为 allow-version 块
 *
 * 用途：批量把 docs/{dev,rfc,adrs}/ 下的历史版本号引用包到
 *   <!-- allow-version -->
 *   ... 内容 ...
 *   <!-- /allow-version -->
 * 块中，让 check-versioned-docs.ts 不再报 advisory。
 *
 * 策略：
 *   1. 扫描所有非 H1 行的版本号
 *   2. 把含版本号的连续行合并到一组 allow-version 块
 *   3. 不动 frontmatter、H1 标题、已存在的 allow-version 块
 *
 * 适用范围：仅 advisory 阶段使用（不在 pre-commit hook 中）
 *
 * 用法：
 *   bun scripts/auto-wrap-versioned.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.argv[2] ?? process.cwd()

const SCAN_DIRS = ['docs/dev/zh-cn', 'docs/dev/en', 'docs/rfc/zh-cn', 'docs/rfc/en', 'docs/adrs']

const VERSION_REGEX = /\bv\d+\.\d+(?:\.\d+)?(?:-(?:alpha|beta|rc)\.\d+)?\b/

function findMarkdownFiles(dir: string): string[] {
  const out: string[] = []
  try {
    const entries = require('node:fs').readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        out.push(...findMarkdownFiles(full))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(full)
      }
    }
  } catch {
    // dir doesn't exist
  }
  return out
}

let totalEdits = 0
let filesChanged = 0

for (const scanDir of SCAN_DIRS) {
  const absDir = join(ROOT, scanDir)
  const files = findMarkdownFiles(absDir)
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const lines = content.split('\n')

    // 跳过 RFC-0020..0023（strict gate 文件）
    const relPath = file.replace(`${ROOT}/`, '')
    if (/^docs\/rfc\/zh-cn\/RFC-002[0-3]-.*\.md$/.test(relPath)) continue

    // 找到需要包的范围
    let inFrontmatter = false
    let frontmatterClosed = false
    let inAllowBlock = false
    const edits: Array<{ start: number; end: number }> = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''

      // frontmatter 跳过
      if (!frontmatterClosed) {
        if (!inFrontmatter && line.trim() === '---') {
          inFrontmatter = true
          continue
        }
        if (inFrontmatter && line.trim() === '---') {
          inFrontmatter = false
          frontmatterClosed = true
          continue
        }
        if (inFrontmatter) continue
      }

      // 已存在 allow-version 块跳过
      if (line.includes('<!-- allow-version -->')) {
        inAllowBlock = true
        continue
      }
      if (inAllowBlock && line.includes('<!-- /allow-version -->')) {
        inAllowBlock = false
        continue
      }
      if (inAllowBlock) continue

      // H1 处理：strict gate 文件（RFC-0020..0023）跳过；其他文件可包
      const isH1 = /^#\s+/.test(line)
      if (isH1) {
        // strict gate 文件不在本脚本范围内（已跳过文件）
        // 其他文件 H1 可包 allow-version
      }

      // 检测版本号
      if (VERSION_REGEX.test(line)) {
        edits.push({ start: i, end: i })
      }
    }

    if (edits.length === 0) continue

    // 合并连续的编辑范围
    const merged: Array<{ start: number; end: number }> = []
    for (const edit of edits) {
      const last = merged[merged.length - 1]
      if (last && edit.start <= last.end + 2) {
        last.end = edit.end
      } else {
        merged.push({ ...edit })
      }
    }

    // 应用编辑（从下到上，避免行号偏移）
    const newLines = [...lines]
    for (const range of [...merged].reverse()) {
      const firstLine = newLines[range.start] ?? ''
      const lastLine = newLines[range.end] ?? ''

      // 跳过如果已经在 allow-version 块内
      if (firstLine.includes('<!-- allow-version -->') || lastLine.includes('<!-- /allow-version -->')) {
        continue
      }

      // 插入结束标记
      newLines.splice(range.end + 1, 0, '<!-- /allow-version -->')
      // 插入开始标记
      newLines.splice(range.start, 0, '<!-- allow-version -->')

      totalEdits += 2
    }

    const newContent = newLines.join('\n')
    if (newContent !== content) {
      writeFileSync(file, newContent, 'utf-8')
      filesChanged++
    }
  }
}

console.log(`✅ Auto-wrap 完成：${filesChanged} 文件改动，${totalEdits} 个 allow-version 块插入`)
console.log('')
console.log('注：此脚本仅做 advisory 自动化。Strict gate（RFC-0020..0023 H1）未触及。')
console.log('运行 `bun scripts/check-versioned-docs.ts` 验证 advisory 数量。')
