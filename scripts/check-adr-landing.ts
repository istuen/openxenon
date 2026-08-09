#!/usr/bin/env bun
/**
 * check-adr-landing — ADR Accepted 必须配套 filesystem 落地的守门（ADR-0099）
 *
 * version: 0.7.5
 * synced-at: 2026-08-09
 *
 * 目的：v0.6.0 D5+ 起，每个 Accepted ADR 必须在 frontmatter 声明 landing-files，
 * 本脚本校验 git diff 中实际有这些路径变化。
 *
 * 扫描范围：
 *   docs/adrs/*.md — 所有 ADR 文件
 *
 * 检查规则：
 *   1. status=Accepted + landing-files=[] + 无 landing-reason=declarative|external|postponed → 报错
 *   2. 对 landing-files 每条路径：在 git status 报告的 changed set 中匹配
 *      - 未出现 → 报错 "ADR-NNNN accepts but landing-files 路径未变化"
 *
 * 退出码：
 *   0 — 0 违规
 *   1 — 有违规
 *
 * 使用：
 *   bun scripts/check-adr-landing.ts
 *   bun scripts/check-adr-landing.ts --advisory   # 仅警告不阻塞
 *   bun scripts/check-adr-landing.ts --strict    # 严格模式（含历史 ADR 回溯 audit）
 */

import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const ADVISORY = process.argv.includes('--advisory')
const STRICT = process.argv.includes('--strict')
// 解析参数：[bun, script, ...positional, ...flags]
// positional 是非 flag 参数（除 argv[0] argv[1] 外）
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const ROOT = positional[0] ?? process.cwd()

// ─── 工具函数 ───

function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match || !match[1]) return null

  const yaml = match[1]
  const result: Record<string, unknown> = {}

  const lines = yaml.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    // 检查是否是列表项
    const listItemMatch = line.match(/^\s*-\s+(.+)$/)
    if (listItemMatch && listItemMatch[1]) {
      // 找上一个 key（最近的非空 key）
      const prevKey = findPrevKey(lines, i)
      if (prevKey) {
        if (!Array.isArray(result[prevKey])) {
          result[prevKey] = []
        }
        ;(result[prevKey] as string[]).push(listItemMatch[1].trim())
      }
      continue
    }
    // 检查是否是 key:value
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kvMatch) {
      const [, key, value] = kvMatch
      const safeValue = value ?? ''
      if (safeValue === '') {
        // 空值：可能是 list 起始或显式 null
        result[key!] = null
      } else if (safeValue === '[]') {
        result[key!] = []
      } else if (safeValue === '~') {
        result[key!] = null
      } else {
        result[key!] = safeValue.trim()
      }
    }
  }

  return result
}

function findPrevKey(lines: string[], currentIdx: number): string | null {
  for (let i = currentIdx - 1; i >= 0; i--) {
    const line = lines[i]?.trim() ?? ''
    if (line === '') continue
    // 跳过列表项（之前 list 的延续）
    if (/^-\s+/.test(line)) continue
    const kvMatch = line.match(/^(\w[\w-]*):\s*$/)
    if (kvMatch && kvMatch[1]) return kvMatch[1]
    return null
  }
  return null
}

function findAdrFiles(root: string): string[] {
  try {
    const out = execSync('find docs/adrs -name "*.md" -type f 2>/dev/null', {
      cwd: root,
      encoding: 'utf8',
    })
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function getChangedFiles(root: string): Set<string> {
  const changed = new Set<string>()

  try {
    // staged + unstaged
    const staged = execSync('git diff --name-only HEAD', {
      cwd: root,
      encoding: 'utf8',
    })
    staged.split('\n').forEach((f) => {
      const t = f.trim()
      if (t) changed.add(t)
    })

    // untracked
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: root,
      encoding: 'utf8',
    })
    untracked.split('\n').forEach((f) => {
      const t = f.trim()
      if (t) changed.add(t)
    })
  } catch (_e) {
    // not a git repo or git unavailable — skip
  }

  return changed
}

// ─── 主逻辑 ───

interface AdrInfo {
  id: string
  path: string
  status: string
  landingFiles: string[]
  landingReason: string | null
  issues: string[]
  source: 'frontmatter' | 'body'
}

const adrFiles = findAdrFiles(ROOT)
if (adrFiles.length === 0) {
  console.log('✓ check-adr-landing: 无 ADR 文件，跳过')
  process.exit(0)
}

const changedFiles = getChangedFiles(ROOT)

function parseAdrFromBody(content: string): { status: string | null } {
  // 格式: ## Status\nAccepted（...） — 旧式 ADR 0091~0098 用此格式
  const statusMatch = content.match(/^## Status\s*\n([^\n]+)/m)
  if (!statusMatch || !statusMatch[1]) return { status: null }

  const statusLine = statusMatch[1].trim()
  // 接受 "Accepted" 开头（可能有后续注释）
  if (/^Accepted/i.test(statusLine)) {
    return { status: 'Accepted' }
  }
  return { status: statusLine.split(/[（(]/)[0]?.trim() ?? null }
}

const checks: AdrInfo[] = []

for (const adrPath of adrFiles) {
  const fullPath = join(ROOT, adrPath)
  let fileContent: string
  try {
    fileContent = readFileSync(fullPath, 'utf8')
  } catch {
    continue
  }

  const idMatch = adrPath.match(/(\d{4})-/)
  const id = idMatch ? `ADR-${idMatch[1]}` : adrPath

  // 优先 frontmatter；fallback body
  const fm = parseFrontmatter(fileContent)
  let status: string | null = null
  let landingFiles: string[] = []
  let landingReason: string | null = null
  let source: 'frontmatter' | 'body' = 'frontmatter'

  if (fm) {
    status = (fm.status as string) ?? null
    landingFiles = (fm['landing-files'] as string[]) ?? []
    landingReason = (fm['landing-reason'] as string) ?? null
  } else {
    source = 'body'
    const body = parseAdrFromBody(fileContent)
    status = body.status
  }

  if (status !== 'Accepted') continue

  const issues: string[] = []

  // 规则 1: Accepted ADR 必须有 landing-files 或 landing-reason
  // 例外：ADR-0099 之前的历史 ADR（< 0099）豁免（per ADR-0099 §Consequences "历史 ADR 不补"）
  if (landingFiles.length === 0 && !landingReason) {
    const isHistorical = !!idMatch && parseInt(idMatch[1] ?? '0', 10) < 99
    const isCurrent099 = !!idMatch && parseInt(idMatch[1] ?? '0', 10) === 99
    if (isHistorical && !STRICT) {
      // 历史 ADR 豁免规则 1
    } else if (!isHistorical || isCurrent099) {
      issues.push(`status=Accepted 但 landing-files 为空且无 landing-reason（必须填 declarative/external/postponed）`)
    }
  }

  // 规则 2: landing-files 每条必须在 changed set 中
  const adrSelfInDiff = changedFiles.has(adrPath)

  for (const path of landingFiles) {
    if (!changedFiles.has(path)) {
      if (!STRICT && !adrSelfInDiff && landingReason) {
        continue
      }
      if (!STRICT && !adrSelfInDiff) {
        continue
      }
      issues.push(`landing-files 路径 "${path}" 不在 git diff 中（未被修改/新增/删除）`)
    }
  }

  checks.push({ id, path: adrPath, status, landingFiles, landingReason, issues, source })
}

// ─── 输出报告 ───

const violations = checks.filter((c) => c.issues.length > 0)
const passed = checks.filter((c) => c.issues.length === 0)

console.log('')
console.log('═══════════════════════════════════════════════════════════════')
console.log(` check-adr-landing — ADR Accepted 落地校验${ADVISORY ? '（advisory）' : ''}${STRICT ? '（strict）' : ''}`)
console.log('═══════════════════════════════════════════════════════════════')
console.log('')
console.log(`扫描范围：docs/adrs/*.md（${adrFiles.length} 份）`)
console.log(`Accepted ADR：${checks.length} 份`)
console.log(`git diff 改动文件：${changedFiles.size} 个`)
console.log('')

if (passed.length > 0) {
  console.log(`✓ 落地校验通过（${passed.length}）：`)
  for (const c of passed) {
    const reasonTag = c.landingReason ? ` [${c.landingReason}]` : ''
    console.log(`  - ${c.id}${reasonTag} (${c.landingFiles.length} files)`)
  }
  console.log('')
}

if (violations.length > 0) {
  console.log(`✗ 落地校验失败（${violations.length}）：`)
  for (const c of violations) {
    console.log(`  ${c.id} (${c.path}):`)
    console.log(
      `    status=${c.status}, landing-files=${c.landingFiles.length} 项, landing-reason=${c.landingReason ?? '(none)'}`,
    )
    for (const issue of c.issues) {
      console.log(`    ⚠ ${issue}`)
    }
    console.log('')
  }
}

console.log('═══════════════════════════════════════════════════════════════')

if (violations.length > 0) {
  console.log(`失败 ${violations.length} 项。请修复后再 commit。`)
  console.log('提示：')
  console.log('  - 若 ADR 已有对应文件改动，commit 时确保文件已 staged（git add）')
  console.log('  - 若 ADR 是纯宣言型，加 frontmatter: landing-reason: declarative')
  console.log('  - 若暂时无落地计划，加 frontmatter: landing-reason: postponed')
  console.log('  - 跳过机制：bun scripts/check-adr-landing.ts --advisory（仅警告）')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  if (!ADVISORY) {
    process.exit(1)
  }
} else {
  console.log('✓ 全部通过。')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  process.exit(0)
}
