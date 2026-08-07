/**
 * dev-pool-migrator.ts — D4 migration engine (recovered v0.6.0 2026-08-07)
 *
 * 一次性脚本（保留 idempotent 能力以便二次运行）：
 *   - 扫 dev/pool/<slug>.md（跳过 README.md）
 *   - 给每个 entry 的 frontmatter 加：
 *       branch: feat/goal-<slug>   （若缺失）
 *       source: direct             （若缺失；区别于 D2 promote 路径的 source=draft）
 *   - 已知字段不动
 *   - body 内容不动
 *
 * 失败安全：写失败整批回滚（已写文件 unlink）
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface MigrateInput {
  projectRoot: string
  dryRun?: boolean
}

export interface MigratorEntry {
  slug: string
  filePath: string
  existingBranch: string | undefined
  existingSource: string | undefined
  needsBranch: boolean
  needsSource: boolean
}

export interface MigrateResult {
  ok: true
  entries: MigratorEntry[]
  changedCount: number
  unchangedCount: number
  dryRun: boolean
}

export interface MigrateError {
  ok: false
  code: 'OXN_DEV_POOL_MIGRATOR_NOENT' | 'OXN_DEV_POOL_MIGRATOR_BODY_INVALID' | 'OXN_DEV_POOL_MIGRATOR_WRITE_FAILED'
  message: string
  suggestion?: string
}

const POOL_DIR = 'dev/pool'
const README = 'README.md'

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
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`)
  return `---\n${lines.join('\n')}\n---`
}

function listEntries(projectRoot: string): string[] {
  const poolDir = join(projectRoot, POOL_DIR)
  if (!existsSync(poolDir)) return []
  return readdirSync(poolDir).filter((f) => f.endsWith('.md') && f !== README)
}

export function planMigration(input: MigrateInput): MigrateResult | MigrateError {
  const poolDir = join(input.projectRoot, POOL_DIR)
  if (!existsSync(poolDir)) {
    return {
      ok: false,
      code: 'OXN_DEV_POOL_MIGRATOR_NOENT',
      message: `dev/pool/ not found at ${poolDir}`,
      suggestion: 'Run `oxn init` or initialize project structure first.',
    }
  }

  const slugs = listEntries(input.projectRoot)
  const entries: MigratorEntry[] = []
  let changedCount = 0
  let unchangedCount = 0

  for (const filename of slugs) {
    const slug = filename.replace(/\.md$/, '')
    const filePath = join(poolDir, filename)

    if (!existsSync(filePath)) continue

    const raw = readFileSync(filePath, 'utf-8')
    const parsed = parseFrontmatter(raw)
    if (!parsed) {
      return {
        ok: false,
        code: 'OXN_DEV_POOL_MIGRATOR_BODY_INVALID',
        message: `Failed to parse frontmatter at ${filePath}`,
        suggestion: 'Ensure entry starts with `---\\n` frontmatter block + closing `---\\n`.',
      }
    }

    const existingBranch = parsed.fm.branch
    const existingSource = parsed.fm.source
    const desiredBranch = `feat/goal-${slug}`
    const desiredSource = 'direct'

    const needsBranch = existingBranch !== desiredBranch
    const needsSource = existingSource !== desiredSource

    if (needsBranch || needsSource) changedCount++
    else unchangedCount++

    entries.push({
      slug,
      filePath,
      existingBranch,
      existingSource,
      needsBranch,
      needsSource,
    })
  }

  return {
    ok: true,
    entries,
    changedCount,
    unchangedCount,
    dryRun: !!input.dryRun,
  }
}

export function applyMigration(input: MigrateInput): MigrateResult | MigrateError {
  const plan = planMigration(input)
  if (!plan.ok) return plan

  if (plan.dryRun) {
    return plan
  }

  const written: Array<{ path: string; original: string }> = []

  for (const entry of plan.entries) {
    if (!entry.needsBranch && !entry.needsSource) continue

    const raw = readFileSync(entry.filePath, 'utf-8')
    const parsed = parseFrontmatter(raw)
    if (!parsed) {
      return {
        ok: false,
        code: 'OXN_DEV_POOL_MIGRATOR_BODY_INVALID',
        message: `Failed to re-parse frontmatter at ${entry.filePath}`,
      }
    }

    const fm = { ...parsed.fm }
    if (entry.needsBranch) fm.branch = `feat/goal-${entry.slug}`
    if (entry.needsSource) fm.source = 'direct'

    const newContent = `${serializeFrontmatter(fm)}\n${parsed.body.startsWith('\n') ? '' : '\n'}${parsed.body}`
    try {
      writeFileSync(entry.filePath, newContent, 'utf-8')
      written.push({ path: entry.filePath, original: raw })
    } catch (err) {
      for (const w of written) {
        try {
          writeFileSync(w.path, w.original, 'utf-8')
        } catch {
          // ignore cleanup
        }
      }
      return {
        ok: false,
        code: 'OXN_DEV_POOL_MIGRATOR_WRITE_FAILED',
        message: `Failed to write ${entry.filePath}: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  return {
    ok: true,
    entries: plan.entries,
    changedCount: plan.changedCount,
    unchangedCount: plan.unchangedCount,
    dryRun: false,
  }
}
