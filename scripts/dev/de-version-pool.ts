#!/usr/bin/env bun
/**
 * scripts/dev/de-version-pool.ts
 *
 * Phase 4 of dev-versionless-pooling: de-version 8 pool files
 * - Replace frontmatter (version/date → id/theme/priority/scheduled-version: ~)
 * - Remove H1 version prefix
 * - Replace body version references with neutral terms
 *
 * Usage: bun scripts/dev/de-version-pool.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const POOL = join(import.meta.dir, '../../dev/pool')

interface PoolSpec {
  file: string
  id: string
  theme: string
  priority: 'low' | 'medium' | 'high'
  extraFrontmatter?: string
}

const SPECS: PoolSpec[] = [
  { file: 'asset-graph.md', id: 'asset-graph', theme: 'Asset 影响图（Mermaid/DOT 渲染）', priority: 'medium' },
  {
    file: 'emergence.md',
    id: 'emergence',
    theme: '涌现层骨架 + Insight 工程化 + Hall v0.5 + Infra Ports',
    priority: 'high',
  },
  {
    file: 'infra-ports.md',
    id: 'infra-ports',
    theme: 'Infra 扩展：ResourcePort / CachePort / WorkSnapshot',
    priority: 'high',
  },
  {
    file: 'work-unified-model.md',
    id: 'work-unified-model',
    theme: 'Work 统一模型 + 引用收敛 + Round 改进',
    priority: 'high',
  },
  {
    file: 'ai-three-modes.md',
    id: 'ai-three-modes',
    theme: 'AI 三模式分级：Guided / Adaptive / Unmanaged',
    priority: 'medium',
  },
  { file: 'anchor-slot.md', id: 'anchor-slot', theme: 'Anchor / Slot 文档双向绑定', priority: 'medium' },
  {
    file: 'term-upstream-dag.md',
    id: 'term-upstream-dag',
    theme: 'Domain DSL 演进：@term/X 跨 term 寻址 + @upstream DAG',
    priority: 'low',
  },
  {
    file: 'probe-system-evolution.md',
    id: 'probe-system-evolution',
    theme: 'Probe 体系演进（追溯 + 内外拆 + 目标成果分类）',
    priority: 'medium',
  },
]

function extractExistingFrontmatter(content: string): {
  fm: string
  body: string
  rfc: string[]
  adr: string[]
  baseline: string[]
  promotedFrom: string
  restFm: string
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fmMatch) throw new Error('no frontmatter')
  const fmText = fmMatch[1]
  const body = content.slice(fmMatch[0].length)

  // Extract rfc/adr/baseline/promoted-from arrays
  const rfcLines: string[] = []
  const adrLines: string[] = []
  const baselineLines: string[] = []
  let promotedFrom = ''
  let restFm = ''

  // Match multi-line list items
  const extractList = (key: string): { lines: string[]; rest: string } => {
    const fm = fmText ?? ''
    const re = new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.*\\n)*)`, 'm')
    const m = fm.match(re)
    if (!m) return { lines: [], rest: fm }
    return { lines: (m[1] ?? '').trimEnd().split('\n'), rest: fm.replace(m[0], '') }
  }

  const rfcResult = extractList('rfc')
  rfcLines.push(...rfcResult.lines)
  restFm = rfcResult.rest

  const adrResult = extractList('adr')
  adrLines.push(...adrResult.lines)
  restFm = adrResult.rest

  const baselineResult = extractList('baseline')
  baselineLines.push(...baselineResult.lines)
  restFm = baselineResult.rest

  const pfMatch = restFm.match(/^promoted-from:\s*(.+)$/m)
  if (pfMatch?.[1]) {
    promotedFrom = pfMatch[1].trim()
    restFm = restFm.replace(pfMatch[0], '')
  }

  // Status field — keep
  const statusMatch = restFm.match(/^status:\s*(.+)$/m)
  const status = statusMatch?.[1]?.trim() ?? 'planned'

  return {
    fm: fmText ?? '',
    body,
    rfc: rfcLines,
    adr: adrLines,
    baseline: baselineLines,
    promotedFrom,
    restFm: `${status}`,
  }
}

function buildNewFrontmatter(
  spec: PoolSpec,
  rfc: string[],
  adr: string[],
  baseline: string[],
  promotedFrom: string,
  status: string,
): string {
  let fm = `id: ${spec.id}
theme: ${spec.theme}
priority: ${spec.priority}
status: ${status}
created-at: 2026-07-28
scheduled-version: ~
synced-at: 2026-08-06
note: |
  从 dev/versions/${spec.file.replace(/\.md$/, '')}（按 0-X-Y-<slug> 命名）回滚（去版本化）。
  scheduling 时由工程师判定版本号 + git mv 到 dev/versions/<slug>.md。`

  if (rfc.length > 0) {
    fm += `\nrfc:\n${rfc.map((l) => `  ${l.trim()}`).join('\n')}`
  }
  if (adr.length > 0) {
    fm += `\nadr:\n${adr.map((l) => `  ${l.trim()}`).join('\n')}`
  }
  if (baseline.length > 0) {
    fm += `\nbaseline:\n${baseline.map((l) => `  ${l.trim()}`).join('\n')}`
  }
  if (promotedFrom) {
    fm += `\npromoted-from: ${promotedFrom}`
  }
  return fm
}

function deVersionBody(body: string, _spec: PoolSpec): string {
  let result = body

  // H1: remove version prefix "# 0.X.Y — " → "# " (multiline mode for ^)
  result = result.replace(/^# \d+\.\d+\.\d+\s*—\s*/gm, '# ')

  // Body version reference replacements (universal)
  const replacements: [RegExp, string][] = [
    // H1/H2 section headers with version prefix
    [/^## \d+\.\d+\.\d+\s+/gm, '## '],

    // Version-targeted claims in body
    [/v0\.7\.0 主题[：:]/g, '主题：'],
    [/v0\.7\.1 主题[：:]/g, '主题：'],
    [/v0\.7\.2 主题[：:]/g, '主题：'],
    [/v0\.8\.0 主题[：:]/g, '主题：'],
    [/v0\.8\.1 主题[：:]/g, '主题：'],
    [/v0\.7\.0 优化/g, '本版本优化'],
    [/v0\.7\.0 W\d+-\d+/g, 'W11-12'],
    [/v0\.7\.1 W\d+-\d+/g, 'W11-12'],

    // "v0.X.Y 不做" section markers
    [/## v0\.7\.0 不做/g, '## 本版本不做'],
    [/## v0\.7\.1 不做/g, '## 本版本不做'],
    [/## v0\.7\.2 不做/g, '## 本版本不做'],
    [/## v0\.8\.0 不做/g, '## 本版本不做'],
    [/## v0\.8\.1 不做/g, '## 本版本不做'],
    [/\(v0\.7\.0 不做\)/g, '（本版本不做）'],
    [/\(v0\.7\.1 不做\)/g, '（本版本不做）'],
    [/\(v0\.7\.2 不做\)/g, '（本版本不做）'],
    [/\(v0\.8\.0 不做\)/g, '（本版本不做）'],

    // Acceptance threshold
    [/v0\.7\.0 验收门槛/g, '验收门槛'],
    [/v0\.7\.1 验收门槛/g, '验收门槛'],
    [/v0\.7\.2 验收门槛/g, '验收门槛'],
    [/v0\.7\.0 末/g, '完成时'],
    [/v0\.7\.1 末/g, '完成时'],
    [/v0\.7\.2 末/g, '完成时'],
    [/v0\.8\.0 末/g, '完成时'],

    // Section markers
    [/## 物理布局（v0\.7\.0 新增\/修改）/g, '## 物理布局（本版本新增/修改）'],
    [/## 物理布局（v0\.7\.1 新增\/修改）/g, '## 物理布局（本版本新增/修改）'],
    [/## 物理布局（v0\.7\.2 新增\/修改）/g, '## 物理布局（本版本新增/修改）'],
    [/## 物理布局（v0\.8\.0 新增\/修改）/g, '## 物理布局（本版本新增/修改）'],
    [/## 物理布局（v0\.8\.1 新增\/修改）/g, '## 物理布局（本版本新增/修改）'],
    [/## 物理布局（v0\.7\.0 增量）/g, '## 物理布局（本版本增量）'],

    // TypeScript code comments
    [/\/\/ \.\.\. v0\.\d+\.\d+ 已有/g, '// ... 已有'],
    [/v0\.6\.x → v0\.7\.0/g, '上一版本 → 本版本'],
    [/v0\.6\.x → v0\.8\.0/g, '上一版本 → 本版本'],
    [/v0\.7\.0 → v0\.8\.0/g, '上一 minor → 本 minor'],
    [/v0\.7\.0 → v0\.7\.1/g, '上一 minor → 本 minor'],
    [/v0\.7\.1 → v0\.7\.2/g, '上一 minor → 本 minor'],
    [/v0\.6\.3 → v0\.7\.0/g, '上一 minor → 本 minor'],

    // Target version
    [/目标版本：v0\.7\.0/g, '目标版本：~（scheduling 决定）'],
    [/目标版本：v0\.7\.1/g, '目标版本：~（scheduling 决定）'],
    [/目标版本：v0\.7\.2/g, '目标版本：~（scheduling 决定）'],
    [/目标版本：v0\.8\.0/g, '目标版本：~（scheduling 决定）'],
    [/目标版本：v0\.8\.1/g, '目标版本：~（scheduling 决定）'],
    [/目标发布：v0\.\d+\.\d+ = \d{4}-\d{2}-\d{2}/g, ''],

    // Frontmatter-style claims
    [/\*\*目标版本\*\*：v0\.\d+\.\d+/g, '**目标版本**：~（scheduling 决定）'],
    [/前提\*\*：v0\.\d+\.\d+/g, '前提**：~（scheduling 决定）'],
    [/前提\*\*：v0\.\d+\.\d+ \(/g, '前提**：~（scheduling 决定；'],
    [/前提\*\*：v0\.\d+\.\d+ \(deferred\)/g, '前提**：~（scheduling 决定；deferred）'],
    [/前提\*\*：v0\.\d+\.\d+ \(并行\)/g, '前提**：~（scheduling 决定；并行）'],

    // Core RFC text (file path kept, version in display text removed)
    [/\*\*核心 RFC\*\*：\[v0\.\d+\.\d+ ([^\]]+)\]\(([^)]+)\)/g, '**核心 RFC**：[$1]($2)'],

    // "v0.7.0 Asset 影响图增量" prefix
    [/v0\.7\.0 Asset 影响图增量/g, 'Asset 影响图增量'],
    [/v0\.7\.0 增量/g, '本版本增量'],
    [/v0\.7\.1 增量/g, '本版本增量'],
    [/v0\.7\.2 增量/g, '本版本增量'],
    [/v0\.8\.0 增量/g, '本版本增量'],

    // "Anchored Docs (v0.7.2 计划)"
    [/Anchored Docs \(v0\.\d+\.\d+ 计划\)/g, 'Anchored Docs（后续计划）'],
    [/\(v0\.\d+\.\d+ W\d+\)/g, '（W12）'],
    [/Hall 资产影响面板（v0\.\d+\.\d+ W\d+）/g, 'Hall 资产影响面板（W12）'],

    // "v0.8.0 Asset 知识库范围"
    [/v0\.8\.0 Asset 知识库范围/g, '未来 Asset 知识库范围'],

    // Project upgrade path (in shell code comments)
    [/# v0\.\d+\.\d+ → v0\.\d+\.\d+/g, '# 上一版本 → 本版本'],
    [/# 项目从 v0\.\d+\.\d+ 升级到 v0\.\d+\.\d+/g, '# 项目从上一版本升级到本版本'],

    // 前置依赖：v0.X.Y + v0.X.Y (in body)
    [/\*\*前提\*\*：~（scheduling 决定）\+ v0\.\d+\.\d+/g, '**前提**：~（scheduling 决定；前置 minor 由版本计划决定）'],

    // "v0.6.x Phase A 静态扫" style references in code
    [/\(v0\.6\.x Phase A 静态扫\)/g, '（上一版本 Phase A 静态扫）'],
    [/\(v0\.6\.x（文件 IO）\)/g, '（上一版本 文件 IO）'],
    [/v0\.6\.x \(文件 IO\)/g, '上一版本（文件 IO）'],

    // "...v0.X.Y 已有" in shell/TS code
    [/\/\/ \.\.\. v0\.\d+\.\d+/g, '// ...'],

    // "(v0.X.Y 计划)"
    [/\(v0\.\d+\.\d+ 计划\)/g, '（后续计划）'],

    // ⚠ Breaking Change — keep file content
    // (no-op)

    // 兼容窗口：v0.X.Y + v0.X.Y + v0.X.Y 三个 minor 期
    [
      /兼容窗口\*\*：v0\.\d+\.\d+ \+ v0\.\d+\.\d+ \+ v0\.\d+\.\d+ 三个 minor 期/g,
      '兼容窗口**：3 个 minor 期（具体版本由 scheduling 决定）',
    ],

    // "v0.X.Y 主题" patterns inside blockquotes (broader context)
    [/\*\*v0\.\d+\.\d+ 主题\*\*/g, '**主题**'],

    // "→ v0.X.Y" deferred to future version (in feature bullets)
    [/→ v0\.\d+\.\d+\b/g, '→ 后续 minor'],

    // "→ v0.9" and similar single-digit future versions
    [/→ v\d+\b/g, '→ 后续 major'],

    // "v0.X.Y Skill Registry" / "v0.X.Y Asset 知识库" — package names with version
    [/v0\.\d+\.\d+ Skill Registry/g, 'Skill Registry（后续版本）'],
    [/v0\.\d+\.\d+ Asset 知识库/g, 'Asset 知识库（后续版本）'],
    [/v0\.\d+\.\d+ AI 三档/g, 'AI 三档（后续版本）'],

    // Historical version references in body text
    [/v0\.\d+\.\d+ Phase A 静态扫/g, 'Phase A 静态扫（前置版本）'],
    [/v0\.\d+\.\d+ 末门槛/g, '前置版本末门槛'],
    [/v0\.\d+\.\d+ 末/g, '前置版本末'],
    [/v0\.\d+\.\d+ \+ \d+ cases/g, '前置版本增量 +12 cases'],
    [/v0\.\d+\.\d+\+\d+/g, '前置版本增量+12'],
    [/v0\.\d+\.\d+ Phase A/g, 'Phase A（前置版本）'],

    // "v0.X.Y + v0.X.Y" in 前提 clauses
    [/\*\*前提\*\*：~（scheduling 决定） \+ v0\.\d+\.\d+/g, '**前提**：~（scheduling 决定；前置 minor 由工程师判定）'],

    // "基于 v0.X.Y 模式库累积" — historical accumulation
    [/基于 v0\.\d+\.\d+ 模式库累积/g, '基于前置 minor 模式库累积'],

    // "v0.6.x（文件 IO）" in tables
    [/v0\.\d+\.\d+（文件 IO）/g, '前置版本（文件 IO）'],
  ]

  for (const [re, replacement] of replacements) {
    result = result.replace(re, replacement)
  }

  return result
}

let totalEdits = 0
let totalChars = 0

for (const spec of SPECS) {
  const path = join(POOL, spec.file)
  const content = readFileSync(path, 'utf-8')
  const { body, rfc, adr, baseline, promotedFrom, restFm } = extractExistingFrontmatter(content)
  const statusMatch = restFm.match(/^(\w+)$/m)
  const status = statusMatch?.[1] ?? 'planned'

  const newFm = buildNewFrontmatter(spec, rfc, adr, baseline, promotedFrom, status)
  const newBody = deVersionBody(body, spec).replace(/^\n+/, '') // strip leading newlines so we control spacing
  const newContent = `---\n${newFm}\n---\n\n${newBody}`

  writeFileSync(path, newContent, 'utf-8')
  totalEdits++
  totalChars += newContent.length
  console.log(`✓ ${spec.file} (${newContent.length} bytes)`)
}

console.log(`\nTotal: ${totalEdits} files, ${totalChars} bytes`)
