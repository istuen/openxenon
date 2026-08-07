/**
 * Goal Engine — v0.6.0 (D5+ 2026-08-07)
 *
 * 概念：Goal = IAP 准备阶段承诺单元（取代 PlanningPool，吸收进 Goal 概念）；
 * 物理：dev/pool/<slug>.md frontmatter 含 branch + source + status=planned。
 *
 * CLI：`oxn goal {create,list,show,work,archive}` 5 命令。
 * 工作流：Goal → Work 由 D5+ followup `oxn goal work <slug>` 接管，
 *       本 Work A 仅提供骨架（work 命令返回建议 Work frontmatter，不创建）。
 *
 * 设计来源：design-version-iteration-redesign.md §3 D2 + §4.3
 * 依赖：.openxenon/drafts/goal.md skeleton + dev/pool/README.md schema
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const POOL_DIR = 'dev/pool'
const ARCHIVE_DIR = '.openxenon/.archived/dev/pool'

export interface GoalCreateInput {
  projectRoot: string
  slug: string
  theme: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  source?: 'direct' | 'draft'
  sourceRef?: string
}

export interface GoalCreateResult {
  ok: true
  slug: string
  filePath: string
  branch: string
}

export interface GoalCreateError {
  ok: false
  code: 'OXN_GOAL_SLUG_INVALID' | 'OXN_GOAL_EXISTS' | 'OXN_GOAL_DIR_CREATE_FAILED'
  message: string
  suggestion?: string
}

export interface GoalListItem {
  slug: string
  theme: string
  priority: string
  status: string
  scheduledVersion: string
  branch: string
  source: string
  createdAt: string
  syncedAt: string
  filePath: string
}

export interface GoalListResult {
  ok: true
  goals: GoalListItem[]
  total: number
}

export interface GoalShowResult {
  ok: true
  goal: GoalListItem
  body: string
}

export interface GoalShowError {
  ok: false
  code: 'OXN_GOAL_NOT_FOUND'
  message: string
  suggestion?: string
}

export interface GoalWorkCreatorInput {
  projectRoot: string
  slug: string
  blueprint?: string
}

export interface GoalWorkCreatorResult {
  ok: true
  slug: string
  proposedWorkId: string
  proposedWorkPath: string
  proposedBlueprint: string
  note: string // 当前 stub 提示：D5+ 真正实现
}

export interface GoalArchiveResult {
  ok: true
  slug: string
  archivedPath: string
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug)
}

function parseFrontmatter(content: string): { fm: Record<string, string>; body: string } | null {
  const lines = content.split('\n')
  if (lines[0] !== '---') return null
  const endIdx = lines.indexOf('---', 1)
  if (endIdx === -1) return null
  const fmLines = lines.slice(1, endIdx)
  const body = lines.slice(endIdx + 1).join('\n')
  const fm: Record<string, string> = {}
  for (const line of fmLines) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (m?.[1] && m[2] !== undefined) fm[m[1]] = m[2].trim()
  }
  return { fm, body }
}

function serializeFrontmatter(fm: Record<string, string>): string {
  return `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---`
}

function buildGoalFrontmatter(input: GoalCreateInput): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10)
  const fm: Record<string, string> = {
    id: input.slug,
    theme: input.theme,
    priority: input.priority ?? 'medium',
    status: 'planned',
    'created-at': today,
    'scheduled-version': '~',
    'synced-at': today,
    branch: `feat/goal-${input.slug}`,
    source: input.source ?? 'direct',
  }
  if (input.sourceRef) fm['source-ref'] = input.sourceRef
  return fm
}

export function createGoal(input: GoalCreateInput): GoalCreateResult | GoalCreateError {
  if (!validateSlug(input.slug)) {
    return {
      ok: false,
      code: 'OXN_GOAL_SLUG_INVALID',
      message: `Goal slug "${input.slug}" is invalid. Must match /^[a-z0-9][a-z0-9-]*$/ (kebab-case).`,
      suggestion: 'Use kebab-case ASCII slug (e.g., "anchor-slot", "engine-closure").',
    }
  }
  const poolDir = join(input.projectRoot, POOL_DIR)
  const filePath = join(poolDir, `${input.slug}.md`)
  if (existsSync(filePath)) {
    return {
      ok: false,
      code: 'OXN_GOAL_EXISTS',
      message: `Goal already exists: ${filePath}`,
      suggestion: 'Use a different slug or remove the existing file first.',
    }
  }
  try {
    mkdirSync(poolDir, { recursive: true })
  } catch (err) {
    return {
      ok: false,
      code: 'OXN_GOAL_DIR_CREATE_FAILED',
      message: `Failed to create pool directory: ${poolDir} (${err instanceof Error ? err.message : String(err)})`,
    }
  }
  const fm = buildGoalFrontmatter(input)
  const branchName: string = fm.branch ?? `feat/goal-${input.slug}`
  const content = `${serializeFrontmatter(fm)}\n\n# Goal: ${input.theme}\n\n## Intent\n\nTODO\n\n## Why\n\nTODO\n\n## Acceptance\n\nTODO\n\n`
  writeFileSync(filePath, content, 'utf-8')
  return {
    ok: true,
    slug: input.slug,
    filePath,
    branch: branchName,
  }
}

export function listGoals(input: { projectRoot: string }): GoalListResult {
  const poolDir = join(input.projectRoot, POOL_DIR)
  if (!existsSync(poolDir)) {
    return { ok: true, goals: [], total: 0 }
  }
  const files = readdirSync(poolDir).filter((f) => f.endsWith('.md') && f !== 'README.md')
  const goals: GoalListItem[] = []
  for (const f of files) {
    const slug = f.replace(/\.md$/, '')
    const filePath = join(poolDir, f)
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = parseFrontmatter(raw)
    if (!parsed) continue
    goals.push({
      slug,
      theme: parsed.fm.theme ?? '',
      priority: parsed.fm.priority ?? '',
      status: parsed.fm.status ?? '',
      scheduledVersion: parsed.fm['scheduled-version'] ?? '~',
      branch: parsed.fm.branch ?? '',
      source: parsed.fm.source ?? '',
      createdAt: parsed.fm['created-at'] ?? '',
      syncedAt: parsed.fm['synced-at'] ?? '',
      filePath,
    })
  }
  // 排序：按 priority (critical > high > medium > low) + slug asc
  const priorityWeight: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  goals.sort((a, b) => {
    const pa = priorityWeight[a.priority] ?? 99
    const pb = priorityWeight[b.priority] ?? 99
    if (pa !== pb) return pa - pb
    return a.slug.localeCompare(b.slug)
  })
  return { ok: true, goals, total: goals.length }
}

export function showGoal(input: { projectRoot: string; slug: string }): GoalShowResult | GoalShowError {
  const filePath = join(input.projectRoot, POOL_DIR, `${input.slug}.md`)
  if (!existsSync(filePath)) {
    return {
      ok: false,
      code: 'OXN_GOAL_NOT_FOUND',
      message: `Goal "${input.slug}" not found at ${filePath}`,
      suggestion: 'Use `oxn goal list` to see existing goals.',
    }
  }
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = parseFrontmatter(raw)
  if (!parsed) {
    return {
      ok: false,
      code: 'OXN_GOAL_NOT_FOUND',
      message: `Goal "${input.slug}" has invalid frontmatter`,
    }
  }
  const meta: GoalListItem = {
    slug: input.slug,
    theme: parsed.fm.theme ?? '',
    priority: parsed.fm.priority ?? '',
    status: parsed.fm.status ?? '',
    scheduledVersion: parsed.fm['scheduled-version'] ?? '~',
    branch: parsed.fm.branch ?? '',
    source: parsed.fm.source ?? '',
    createdAt: parsed.fm['created-at'] ?? '',
    syncedAt: parsed.fm['synced-at'] ?? '',
    filePath,
  }
  return { ok: true, goal: meta, body: parsed.body }
}

/**
 * D5+ stub：当前返回建议 Work 配置，不创建 Work。
 */
export function createWorkFromGoal(input: GoalWorkCreatorInput): GoalWorkCreatorResult {
  return {
    ok: true,
    slug: input.slug,
    proposedWorkId: `${input.slug}-work`,
    proposedWorkPath: `.openxenon/works/${input.slug}-work/work.md`,
    proposedBlueprint: input.blueprint ?? 'oxn-blueprint',
    note: 'D5+ stub: 返回建议 Work 配置; 实际 Work IAP 创建将在 followup Wave 实现 (v0.6.x D5+). Use `oxn work create --blueprint oxn-blueprint --name <id>` 手动创建.',
  }
}

export function archiveGoal(input: { projectRoot: string; slug: string }): GoalArchiveResult {
  const filePath = join(input.projectRoot, POOL_DIR, `${input.slug}.md`)
  const archiveDir = join(input.projectRoot, ARCHIVE_DIR)
  if (!existsSync(filePath)) {
    return { ok: true, slug: input.slug, archivedPath: filePath }
  }
  mkdirSync(archiveDir, { recursive: true })
  const archivedPath = join(archiveDir, `${input.slug}.md`)
  renameSync(filePath, archivedPath)
  return { ok: true, slug: input.slug, archivedPath }
}
