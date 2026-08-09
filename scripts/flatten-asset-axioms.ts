#!/usr/bin/env bun
// =============================================================================
// flatten-asset-axioms.ts — Asset Axiom 扁平化（去除 sub-bullet / table / code fence）
//
// 角色：
// - 扫 .openxenon/assets/{domains,workflows,stacks,blueprints,assetmaps}/*.md
// - 对每个 Axiom body 应用 v3.0 守门约束：
//   - sub-bullet（缩进 2+ 空格 + `-`）→ 移除前导缩进（升为顶层 bullet）
//   - inline 表格行（首字符 `|`）→ 删除（提示人工转 bullet）
//   - code fence 行 → 删除（提示人工转 prose）
// - 保留豁免：Stack Tool（## Tools/## Foundation）/ Blueprint Slot（## Slot）/ Blueprint SubTargetDispatch / Blueprint Use / 顶层 Scope / Context Template
//
// 接入：
// - bun scripts/flatten-asset-axioms.ts [--dry-run]
// - 输出每文件变更前/后行数；按 y/N 确认
// =============================================================================

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type AssetKind = 'domain' | 'workflow' | 'stack' | 'blueprint' | 'assetmap'

const ASSET_DIRS: Record<AssetKind, string> = {
  domain: 'domains',
  workflow: 'workflows',
  stack: 'stacks',
  blueprint: 'blueprints',
  assetmap: 'assetmaps',
}

const BP_TOP_AXIOMS = new Set(['Scope', 'Context Template'])

// 严格豁免（field-load Axiom）：sub-bullet 保留
function isExemptGroup(kind: AssetKind, group: string | null): boolean {
  if (group === null) return false
  if (kind === 'stack' && (group === 'Tools' || group === 'Foundation')) return true
  if (kind === 'blueprint' && (group === 'Slot' || group === 'SubTargetDispatch' || /^Use\b/.test(group))) return true
  return false
}

function isExemptAxiom(kind: AssetKind, group: string | null, axiomName: string): boolean {
  if (kind === 'blueprint' && group === null && BP_TOP_AXIOMS.has(axiomName)) return true
  return false
}

function isFieldLoadAxiom(kind: AssetKind, group: string | null, axiomName: string): boolean {
  return isExemptGroup(kind, group) || isExemptAxiom(kind, group, axiomName)
}

function flattenFile(
  file: string,
  kind: AssetKind,
): { content: string; subbullets: number; tables: number; fences: number } {
  const original = readFileSync(file, 'utf-8')
  const lines = original.split('\n')

  let bodyStart = 0
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        bodyStart = i + 1
        break
      }
    }
  }

  const out: string[] = []
  let i = 0
  let currentGroup: string | null = null
  let currentAxiom: string | null = null
  let inFence = false
  let subbullets = 0
  let tables = 0
  let fences = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // 保留 frontmatter 原样
    if (i < bodyStart) {
      out.push(line)
      i++
      continue
    }

    // H2 Group
    const h2m = line.match(/^##\s+(.+?)\s*$/)
    if (h2m) {
      currentGroup = h2m[1]!.trim()
      currentAxiom = null
      out.push(line)
      i++
      continue
    }

    // H3 Axiom
    const h3m = line.match(/^###\s+(.+?)\s*$/)
    if (h3m) {
      currentAxiom = h3m[1]!.trim()
      out.push(line)
      i++
      continue
    }

    // 处理 Axiom body
    if (currentAxiom !== null && !isFieldLoadAxiom(kind, currentGroup, currentAxiom)) {
      // code fence 检测
      if (/^```/.test(line.trim())) {
        fences++
        inFence = !inFence
        i++
        continue
      }
      if (inFence) {
        i++
        continue
      }
      // table 检测
      if (/^\|/.test(line.trim())) {
        tables++
        i++
        continue
      }
      // sub-bullet 检测（2+ 空格 + -）
      if (/^ {2,}-\s/.test(line)) {
        subbullets++
        const dedented = line.replace(/^ {2,}/, '')
        out.push(dedented)
        i++
        continue
      }
    }

    out.push(line)
    i++
  }

  return { content: out.join('\n'), subbullets, tables, fences }
}

function listAssetFiles(assetsDir: string): Array<{ file: string; kind: AssetKind }> {
  const out: Array<{ file: string; kind: AssetKind }> = []
  for (const [kind, sub] of Object.entries(ASSET_DIRS)) {
    const dir = join(assetsDir, sub)
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md')) continue
      if (name.startsWith('.')) continue
      const full = join(dir, name)
      try {
        if (!statSync(full).isFile()) continue
      } catch {
        continue
      }
      out.push({ file: full, kind: kind as AssetKind })
    }
  }
  return out
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const projectRoot = process.cwd()
  const assetsDir = join(projectRoot, '.openxenon', 'assets')

  console.log(`🔍 扫描 ${assetsDir} ...`)
  const files = listAssetFiles(assetsDir)
  console.log(`   ${files.length} 个 Asset 文件\n`)

  let totalSubbullets = 0
  let totalTables = 0
  let totalFences = 0
  let totalFilesChanged = 0

  for (const { file, kind } of files) {
    const result = flattenFile(file, kind)
    if (result.subbullets === 0 && result.tables === 0 && result.fences === 0) continue

    totalSubbullets += result.subbullets
    totalTables += result.tables
    totalFences += result.fences
    totalFilesChanged++

    const relFile = file.replace(`${projectRoot}/`, '')
    console.log(`📝 ${relFile}（${kind}）`)
    console.log(`   sub-bullet 扁平化：${result.subbullets} 处`)
    console.log(`   表格删除：${result.tables} 行`)
    console.log(`   code fence 删除：${result.fences} 处`)

    if (!dryRun) {
      writeFileSync(file, result.content, 'utf-8')
      console.log(`   ✅ 已写入\n`)
    } else {
      console.log(`   🔍 dry-run（未写入）\n`)
    }
  }

  console.log(`\n📊 汇总：`)
  console.log(`   改动文件：${totalFilesChanged}`)
  console.log(`   sub-bullet 扁平化：${totalSubbullets} 处`)
  console.log(`   表格删除：${totalTables} 行`)
  console.log(`   code fence 删除：${totalFences} 处`)
  if (dryRun) {
    console.log(`\n💡 加 --write 实际写入`)
  }
}

main()
