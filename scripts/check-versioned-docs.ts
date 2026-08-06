#!/usr/bin/env bun
/**
 * check-versioned-docs — 版本号中性守门（advisory）
 *
 * 目的：v0.7+ 起，OpenXenon 文档系统趋向"版本号中性"——已落地的架构真理不带版本号。
 * 本脚本扫描 docs/{dev,rfc,adrs}/ 中版本号字符串（v0.X.Y / vX.Y / v0.X.Y-alpha.N）。
 *
 * 范围（advisory）：
 *   docs/dev/zh-cn    工程师文档（部分含历史版本引用）
 *   docs/dev/en       工程师文档
 *   docs/rfc/zh-cn    RFC 体系（应 version-neutral）
 *   docs/rfc/en       RFC 体系
 *   docs/adrs         ADR 体系（应 version-neutral）
 *
 * 不扫描（产品文档，版本号合理）：
 *   docs/product/     用户手册，含 "当前版本 vX.Y" + "v0.6.1 Phase D" 等历史
 *
 * 严格门（必须 0）：
 *   docs/rfc/zh-cn/RFC-0020..RFC-0023  （2026-08-05 新 promote RFC，必须 versionless）
 *
 * Advisory 门（仅警告，不阻塞）：
 *   其他 RFC/ADR/dev 文档（历史版本引用是允许的，但建议清理）
 *
 * 退出码：0（advisory 通过 / 严格门通过）/ 1（严格门违规）
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.argv[2] ?? process.cwd()

// ─── 配置 ───
const SCAN_DIRS = [
  // docs/dev/ 暂不扫描 — 工程师文档含历史版本引用是合理内容（如 "v0.6 起"、"v0.7 探索"）
  'docs/rfc/zh-cn',
  'docs/rfc/en',
  'docs/adrs',
]

const ALLOW_PATTERNS = [
  /^\.changes\//,
  /^dev\/versions\//,
  /^dev\/pool\//, // 规划池可引用 RFC 路径中的版本号（如 v0.7-emergence/），不应被脚本拦截
  /^dev\/meta\//,
  /^\.openxenon\/drafts\//,
  /^docs\/_archive\//,
  /^docs\/_archived\//,
  /\/_archive\//,
  /\/\.archived\//,
  /\/__archive__\//,
]

const VERSION_REGEX = /\bv\d+\.\d+(?:\.\d+)?(?:-(?:alpha|beta|rc)\.\d+)?\b/g

// ─── 工具函数 ───
function shouldSkip(filepath: string): boolean {
  return ALLOW_PATTERNS.some((re) => re.test(filepath))
}

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

// ─── 主逻辑 ───
let advisoryCount = 0
let strictViolations = 0
const advisoryDetails: Array<{ file: string; line: number; text: string; match: string }> = []
const strictDetails: Array<{ file: string; line: number; text: string; match: string }> = []

// 严格门：RFC-0020..RFC-0023 的 H1 标题必须 versionless
const STRICT_FILES = [/^docs\/rfc\/zh-cn\/RFC-002[0-3]-.*\.md$/]

for (const scanDir of SCAN_DIRS) {
  const absDir = join(ROOT, scanDir)
  const files = findMarkdownFiles(absDir)
  for (const file of files) {
    const relPath = file.replace(`${ROOT}/`, '')
    if (shouldSkip(relPath)) continue

    const isStrict = STRICT_FILES.some((re) => re.test(relPath))

    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch {
      continue
    }

    const lines = content.split('\n')
    let inFrontmatter = false
    let frontmatterClosed = false
    let inAllowVersionBlock = false
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

      // 注释块豁免
      if (line.includes('<!-- allow-version -->')) {
        inAllowVersionBlock = true
        continue
      }
      if (inAllowVersionBlock && line.includes('-->')) {
        inAllowVersionBlock = false
        continue
      }
      if (inAllowVersionBlock) continue

      const matches = line.match(VERSION_REGEX)
      if (!matches) continue

      for (const match of matches) {
        // 严格门：H1 标题（行首 # 开头）必须 versionless
        if (isStrict && /^#\s+/.test(line)) {
          strictViolations++
          strictDetails.push({ file: relPath, line: i + 1, text: line.trim(), match })
        } else if (!isStrict) {
          advisoryCount++
          advisoryDetails.push({ file: relPath, line: i + 1, text: line.trim(), match })
        }
        // 严格文件的非 H1 行不报（历史 context 保留）
      }
    }
  }
}

console.log('')
console.log('📊 版本号中性检查（advisory + strict）')
console.log('')
console.log(`  严格门（RFC-0020..0023）：${strictViolations} 违规`)
console.log(`  Advisory（其他 RFC/ADR/dev）：${advisoryCount} 处历史版本引用`)
console.log('')

if (strictViolations > 0) {
  console.log(`🚨 严格门违规（${strictViolations} 处，新 promote 的 RFC 必须 versionless）\n`)
  for (const v of strictDetails.slice(0, 20)) {
    console.log(`  ${v.file}:${v.line} [${v.match}]  ${v.text.slice(0, 80)}`)
  }
  if (strictDetails.length > 20) {
    console.log(`  ... 还有 ${strictDetails.length - 20} 处`)
  }
  console.log('')
}

if (advisoryCount > 0) {
  console.log(`ℹ️  Advisory（${advisoryCount} 处）— 历史版本引用，可清理但非阻塞：\n`)
  const byFile = new Map<string, Array<{ line: number; text: string; match: string }>>()
  for (const v of advisoryDetails) {
    if (!byFile.has(v.file)) byFile.set(v.file, [])
    byFile.get(v.file)!.push(v)
  }
  const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10)
  for (const [file, items] of sorted) {
    console.log(`  ${file}（${items.length} 处）`)
    for (const item of items.slice(0, 5)) {
      console.log(`    L${item.line} [${item.match}]  ${item.text.slice(0, 80)}`)
    }
    if (items.length > 5) {
      console.log(`    ... 还有 ${items.length - 5} 处`)
    }
  }
  console.log(`  ... 共 ${byFile.size} 个文件`)
  console.log('')
}

console.log('版本号应放：')
console.log('  - .changes/                  （changelog 片段）')
console.log('  - dev/versions/              （scheduling 后已绑版本 Roadmap；pool 转入时补 version 字段）')
console.log('  - dev/pool/                  （未绑版本规划池，scheduled-version: ~）')
console.log('  - dev/meta/                  （meta 文档）')
console.log('  - .openxenon/drafts/         （草稿层）')
console.log('')
console.log('生命周期：pool → scheduling → versions → 版本转正 → .archived/dev/versions/')
console.log('')
console.log('豁免方式（特殊引用）：<!-- allow-version --> ... <!-- /allow-version -->')
console.log('')

// 严格门失败 → 退出 1；advisory 仅警告 → 退出 0
process.exit(strictViolations > 0 ? 1 : 0)
