#!/usr/bin/env bun
/**
 * check-adr-landing — ADR/RFC Accepted 必须配套 filesystem 落地的守门（ADR-0099 + RFC-0029 D4）
 *
 * version: 0.8.0
 * synced-at: 2026-08-11
 *
 * 目的：v0.6.0 D5+ 起，每个 Accepted ADR 必须在 frontmatter 声明 landing-files，
 * 本脚本校验 git diff 中实际有这些路径变化。v0.8.0 起（RFC-0029 D4）扩展：
 *   - 扫描范围扩展到 docs/rfc/zh-cn/*.md
 *   - 新增规则 3：Accepted ADR/RFC 的 landing-files (or related:) 必须含至少一条
 *     `.openxenon/assets/domains/*.md` 路径——或显式声明 landing-reason 豁免
 *     （declarative / external / postponed）。与 RFC-0029 D1 "Domain = 现行约束语义 SSOT"
 *     治理原则对齐：RFC/ADR 是 why 记录层，Domain 是 what 定义层；RFC/ADR 决策必须
 *     在 Domain 有 Axiom/Theorem 落点，否则声明与 SSOT 脱节。
 *
 * 扫描范围：
 *   docs/adrs/*.md — 所有 ADR 文件
 *   docs/rfc/zh-cn/*.md — 所有 RFC 文件
 *
 * 检查规则：
 *   1. status=Accepted + landing-files=[] + 无 landing-reason=declarative|external|postponed → 报错
 *   2. 对 landing-files 每条路径：在 git status 报告的 changed set 中匹配
 *      - 未出现 → 报错 "ADR-NNNN accepts but landing-files 路径未变化"
 *   3. 🆕 v0.8.0（RFC-0029 D4）：Accepted ADR/RFC 的 landing-files 或 related 中，
 *      必须含至少一条 `.openxenon/assets/domains/*.md` 路径——或显式声明 landing-reason 豁免
 *      （无 landing-reason 字段 → 视为必须落地；落地文件不在 Domain 路径下 → 报错）
 *
 * 退出码：
 *   0 — 0 违规
 *   1 — 有违规
 *
 * 使用：
 *   bun scripts/check-adr-landing.ts                       # 默认：advisory（仅警告）
 *   bun scripts/check-adr-landing.ts --advisory            # 等价于默认，仅警告不阻塞
 *   bun scripts/check-adr-landing.ts --enforce             # 严格：违规退出码 1
 *   bun scripts/check-adr-landing.ts --strict              # 严格模式（含历史 ADR 回溯 audit）
 *   bun scripts/check-adr-landing.ts --skip-domain-check   # 跳过规则 3（仅做规则 1+2，兼容老 ADR）
 *   bun scripts/check-adr-landing.ts --adrs-only           # 仅扫描 ADR（不扫 RFC）
 *   bun scripts/check-adr-landing.ts --rfcs-only           # 仅扫描 RFC（不扫 ADR）
 */

import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const ADVISORY = process.argv.includes('--advisory')
const ENFORCE = process.argv.includes('--enforce')
const STRICT = process.argv.includes('--strict')
const SKIP_DOMAIN_CHECK = process.argv.includes('--skip-domain-check')
const ADRS_ONLY = process.argv.includes('--adrs-only')
const RFCS_ONLY = process.argv.includes('--rfcs-only')

// 解析参数：[bun, script, ...positional, ...flags]
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const ROOT = positional[0] ?? process.cwd()

// ─── 工具函数 ───

function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match?.[1]) return null

  const yaml = match[1]
  const result: Record<string, unknown> = {}

  const lines = yaml.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    // 检查是否是列表项
    const listItemMatch = line.match(/^\s*-\s+(.+)$/)
    if (listItemMatch?.[1]) {
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
    if (/^-\s+/.test(line)) continue
    const kvMatch = line.match(/^(\w[\w-]*):\s*$/)
    if (kvMatch?.[1]) return kvMatch[1]
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

function findRfcFiles(root: string): string[] {
  try {
    const out = execSync('find docs/rfc/zh-cn -name "RFC-*.md" -type f 2>/dev/null', {
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
    const staged = execSync('git diff --name-only HEAD', {
      cwd: root,
      encoding: 'utf8',
    })
    staged.split('\n').forEach((f) => {
      const t = f.trim()
      if (t) changed.add(t)
    })

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

type DocKind = 'adr' | 'rfc'

interface DocInfo {
  id: string
  kind: DocKind
  path: string
  status: string
  landingFiles: string[]
  relatedFiles: string[]
  landingReason: string | null
  issues: string[]
  source: 'frontmatter' | 'body'
}

const docFiles: Array<{ path: string; kind: DocKind }> = []
if (!RFCS_ONLY) {
  for (const f of findAdrFiles(ROOT)) {
    docFiles.push({ path: f, kind: 'adr' })
  }
}
if (!ADRS_ONLY) {
  for (const f of findRfcFiles(ROOT)) {
    docFiles.push({ path: f, kind: 'rfc' })
  }
}

if (docFiles.length === 0) {
  console.log('✓ check-adr-landing: 无 ADR/RFC 文件，跳过')
  process.exit(0)
}

const changedFiles = getChangedFiles(ROOT)

function parseAdrFromBody(content: string): { status: string | null } {
  const statusMatch = content.match(/^## Status\s*\n([^\n]+)/m)
  if (!statusMatch?.[1]) return { status: null }

  const statusLine = statusMatch[1].trim()
  if (/^Accepted/i.test(statusLine)) {
    return { status: 'Accepted' }
  }
  return { status: statusLine.split(/[（(]/)[0]?.trim() ?? null }
}

function parseRfcFromBody(content: string): { status: string | null } {
  // RFC 文件 frontmatter 有 status 字段；但若 frontmatter 解析失败或缺失，
  // 从 H1 标题下方 "状态：✅ Accepted" / "状态：📝 Draft" 等识别
  const statusLine = content.match(/状态[：:]\s*([^\n]+)/)
  if (!statusLine?.[1]) return { status: null }

  const txt = statusLine[1].trim()
  if (/Accepted/.test(txt)) return { status: 'Accepted' }
  if (/Draft/.test(txt)) return { status: 'Draft' }
  if (/Partially/.test(txt)) return { status: 'Partially Accepted' }
  return { status: txt.split(/[（(]/)[0]?.trim() ?? null }
}

// 判定路径是否指向 Domain SSOT
function isDomainPath(p: string): boolean {
  return /^\.openxenon\/assets\/domains\/[A-Za-z][A-Za-z0-9_-]*\.md$/.test(p)
}

const checks: DocInfo[] = []

for (const { path: docPath, kind } of docFiles) {
  const fullPath = join(ROOT, docPath)
  let fileContent: string
  try {
    fileContent = readFileSync(fullPath, 'utf8')
  } catch {
    continue
  }

  // 提取 ID
  let id: string
  if (kind === 'adr') {
    const idMatch = docPath.match(/(\d{4})-/)
    id = idMatch ? `ADR-${idMatch[1]}` : docPath
  } else {
    const idMatch = docPath.match(/RFC-(\d{4})-/)
    id = idMatch ? `RFC-${idMatch[1]}` : docPath
  }

  // 优先 frontmatter；fallback body
  const fm = parseFrontmatter(fileContent)
  let status: string | null = null
  let landingFiles: string[] = []
  let relatedFiles: string[] = []
  let landingReason: string | null = null
  let source: 'frontmatter' | 'body' = 'frontmatter'

  if (fm) {
    status = (fm.status as string) ?? null
    landingFiles = (fm['landing-files'] as string[]) ?? []
    landingReason = (fm['landing-reason'] as string) ?? null
    // RFC frontmatter 有 related: 字段，ADR 也可能有
    relatedFiles = (fm.related as string[]) ?? []
  } else {
    source = 'body'
    if (kind === 'adr') {
      const body = parseAdrFromBody(fileContent)
      status = body.status
    } else {
      const body = parseRfcFromBody(fileContent)
      status = body.status
    }
  }

  // RFC 在 body 中也常见"related"列表；fallback 解析 RFC H2 "## 相关决策" 段
  if (kind === 'rfc' && relatedFiles.length === 0) {
    const relatedMatch = fileContent.match(/##\s*相关决策\s*\n([\s\S]*?)(?=\n## |\n# |$)/g)
    if (relatedMatch?.[1]) {
      const lines = relatedMatch[1].split('\n')
      for (const line of lines) {
        const m = line.match(/^\s*-\s+(.+)$/)
        if (m?.[1]) {
          const ref = m[1].trim()
          // 提取路径（如 `- .openxenon/assets/domains/xxx.md` 或 `- RFC-XXXX`）
          const pathMatch = ref.match(/^(\.openxenon\/.+?\.md)/)
          if (pathMatch?.[1]) {
            relatedFiles.push(pathMatch[1])
          }
        }
      }
    }
  }

  if (status !== 'Accepted') continue

  const issues: string[] = []

  // 规则 1: Accepted ADR/RFC 必须有 landing-files 或 landing-reason
  // 例外：ADR-0099 之前的历史 ADR（< 0099）豁免（per ADR-0099 §Consequences "历史 ADR 不补"）
  if (landingFiles.length === 0 && !landingReason) {
    const idMatch = docPath.match(/(\d{4})-/)
    const isHistoricalAdr = kind === 'adr' && idMatch && parseInt(idMatch[1] ?? '0', 10) < 99
    const isCurrent099 = kind === 'adr' && idMatch && parseInt(idMatch[1] ?? '0', 10) === 99
    if (kind === 'rfc') {
      // RFC 不豁免：RFC 必须声明 landing 或 landing-reason
      issues.push(`status=Accepted 但 landing-files 为空且无 landing-reason（必须填 declarative/external/postponed）`)
    } else if (isHistoricalAdr && !STRICT) {
      // 历史 ADR 豁免规则 1
    } else if (!isHistoricalAdr || isCurrent099) {
      issues.push(`status=Accepted 但 landing-files 为空且无 landing-reason（必须填 declarative/external/postponed）`)
    }
  }

  // 规则 2: landing-files 每条必须在 changed set 中
  const docSelfInDiff = changedFiles.has(docPath)

  for (const path of landingFiles) {
    if (!changedFiles.has(path)) {
      if (!STRICT && !docSelfInDiff && landingReason) {
        continue
      }
      if (!STRICT && !docSelfInDiff) {
        continue
      }
      issues.push(`landing-files 路径 "${path}" 不在 git diff 中（未被修改/新增/删除）`)
    }
  }

  // 规则 3（RFC-0029 D4）：Accepted ADR/RFC 的 landing-files 或 related 中，
  // 必须含至少一条 `.openxenon/assets/domains/*.md` 路径——
  // 或显式声明 landing-reason: declarative/external/postponed 豁免
  if (!SKIP_DOMAIN_CHECK) {
    const exemptReasons = ['declarative', 'external', 'postponed']
    const hasExemptReason = landingReason && exemptReasons.includes(landingReason)
    const hasDomainLanding = landingFiles.some(isDomainPath) || relatedFiles.some(isDomainPath)

    if (!hasDomainLanding && !hasExemptReason) {
      issues.push(
        `landing-files / related 中未含任何 .openxenon/assets/domains/*.md 路径；RFC-0029 D4 要求 Accepted 决策必须在 Domain SSOT 落点（无豁免时）`,
      )
    }
  }

  checks.push({
    id,
    kind,
    path: docPath,
    status,
    landingFiles,
    relatedFiles,
    landingReason,
    issues,
    source,
  })
}

// ─── 输出报告 ───

const violations = checks.filter((c) => c.issues.length > 0)
const passed = checks.filter((c) => c.issues.length === 0)

console.log('')
console.log('═══════════════════════════════════════════════════════════════')
console.log(
  ` check-adr-landing — ADR/RFC Accepted 落地校验${ADVISORY ? '（advisory）' : ''}${ENFORCE ? '（enforce）' : ''}${STRICT ? '（strict）' : ''}`,
)
console.log('═══════════════════════════════════════════════════════════════')
console.log('')
console.log(`扫描范围：docs/adrs/*.md + docs/rfc/zh-cn/RFC-*.md（共 ${docFiles.length} 份）`)
console.log(`Accepted ADR/RFC：${checks.length} 份`)
console.log(`git diff 改动文件：${changedFiles.size} 个`)
console.log(`规则 3（Domain 落地）：${SKIP_DOMAIN_CHECK ? 'SKIP（--skip-domain-check）' : 'ON'}`)
console.log('')

if (passed.length > 0) {
  console.log(`✓ 落地校验通过（${passed.length}）：`)
  for (const c of passed) {
    const reasonTag = c.landingReason ? ` [${c.landingReason}]` : ''
    const kindTag = c.kind === 'rfc' ? '🌐' : '📋'
    console.log(`  ${kindTag} ${c.id}${reasonTag} (${c.landingFiles.length} files)`)
  }
  console.log('')
}

if (violations.length > 0) {
  console.log(`✗ 落地校验失败（${violations.length}）：`)
  for (const c of violations) {
    const kindTag = c.kind === 'rfc' ? '🌐' : '📋'
    console.log(`  ${kindTag} ${c.id} (${c.path}):`)
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
  console.log(`失败 ${violations.length} 项。`)
  if (ENFORCE) {
    console.log('ENFORCE 模式：违规将阻塞（exit 1）')
  } else {
    console.log('当前为 advisory 模式：违规仅警告，不阻塞。')
    console.log('切换到 enforce 模式：bun scripts/check-adr-landing.ts --enforce')
  }
  console.log('')
  console.log('提示：')
  console.log('  - 若 ADR 已有对应文件改动，commit 时确保文件已 staged（git add）')
  console.log('  - 若 ADR/RFC 是纯宣言型，加 frontmatter: landing-reason: declarative')
  console.log('  - 若暂时无落地计划，加 frontmatter: landing-reason: postponed')
  console.log('  - 决策必须落 Domain：landing-files 加一条 .openxenon/assets/domains/<name>.md')
  console.log('  - 跳过机制：bun scripts/check-adr-landing.ts --advisory（仅警告）')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  if (!ADVISORY && ENFORCE) {
    process.exit(1)
  }
} else {
  console.log('✓ 全部通过。')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  process.exit(0)
}
