/**
 * Version Engine — v0.6.0 (D5+ 2026-08-07)
 *
 * 概念：Version = 已发布的 Release 单元（取代 Roadmap，吸收进 Version 概念）。
 * CLI：`oxn version {cut,list,show,status}` 4 命令。
 *
 * Work A 范围：CLI 骨架 + 基础 dry-run 实现，不真实 bump package.json，
 * 不实际写 changelog / tag / publish（由 §4.5 release-cut workflow 改造后接管）。
 *
 * 物理：
 *   - cut output：列出当前 active Goals（status=planned）+ 提议 next version
 *   - dry-run：仅打印
 *   - apply：触发 release-cut workflow（v0.6.x D5+ followup，本 Work 不实现）
 */

import { listGoals, type GoalListItem } from '../Goal'

export interface VersionInput {
  projectRoot: string
  trigger?: 'done' | 'change' | 'schedule'
  dryRun?: boolean
}

export interface VersionCutResult {
  ok: true
  trigger: string
  /** 提议的 next version（仅基于 Goal 数量 + existing version；不实际写文件） */
  proposedVersion: string
  /** 当前 active Goals */
  activeGoals: GoalListItem[]
  /** 聚合统计 */
  summary: {
    byPriority: Record<string, number>
    byStatus: Record<string, number>
    total: number
  }
  /** Next steps / human ack */
  nextSteps: string[]
  dryRun: boolean
}

export interface VersionCutError {
  ok: false
  code: 'OXN_VERSION_INVALID_TRIGGER'
  message: string
  suggestion?: string
}

const VALID_TRIGGERS = ['done', 'change', 'schedule'] as const

/**
 * 提议 next version：
 * - 读现有 .changes/ 最新 version 号
 * - bump patch（0.0.X）：Work A 最小版本号；正式语义由 release-cut workflow 接管
 */
export async function readCurrentVersion(projectRoot: string): Promise<string> {
  const fs = await import('node:fs/promises')
  try {
    const pkgRaw = await fs.readFile(`${projectRoot}/package.json`, 'utf-8')
    const pkg = JSON.parse(pkgRaw) as { version: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export function proposeNextVersion(current: string): string {
  const parts = current.split('.').map((p) => parseInt(p, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return '0.1.0'
  }
  const maj = parts[0] ?? 0
  const min = parts[1] ?? 0
  const pat = parts[2] ?? 0
  return `${maj}.${min}.${pat + 1}`
}

export function cutVersion(input: VersionInput): VersionCutResult | VersionCutError {
  const trigger = input.trigger ?? 'done'
  if (!(VALID_TRIGGERS as readonly string[]).includes(trigger)) {
    return {
      ok: false,
      code: 'OXN_VERSION_INVALID_TRIGGER',
      message: `--trigger="${trigger}" is invalid. Valid: ${VALID_TRIGGERS.join(', ')}`,
      suggestion: 'Use --trigger done (Goal all DONE), change (forced), or schedule (time-based).',
    }
  }
  const listResult = listGoals({ projectRoot: input.projectRoot })
  const activeGoals = listResult.goals.filter((g) => g.status === 'planned')
  const byPriority: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  for (const g of listResult.goals) {
    byPriority[g.priority] = (byPriority[g.priority] ?? 0) + 1
    byStatus[g.status] = (byStatus[g.status] ?? 0) + 1
  }
  // 用 sync 版（async 已经 deprecated，这里用 sync 简化 Work A）
  let currentVersion = '0.0.0'
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    const pkgRaw = fs.readFileSync(`${input.projectRoot}/package.json`, 'utf-8') as string
    const pkg = JSON.parse(pkgRaw) as { version: string }
    currentVersion = pkg.version ?? '0.0.0'
  } catch {
    currentVersion = '0.0.0'
  }
  const proposedVersion = proposeNextVersion(currentVersion)
  const nextSteps = [
    `Trigger: ${trigger}`,
    input.dryRun
      ? '--dry-run: 仅打印计划，未修改任何文件'
      : 'apply 模式: 调用 release-cut workflow（v0.6.x D5+ followup 接管）',
    `提议 version: ${proposedVersion}（当前 ${currentVersion}）`,
    `active Goals: ${activeGoals.length}`,
    'Next: 人工 ack 然后 release-cut workflow 接管（bump-version → gen-changelog → tag → verify-build → publish）',
  ]
  if (!input.dryRun) {
    nextSteps.push(
      '[STUB] apply 模式未真触发 release-cut；见 design-version-iteration-redesign.md §4.5 + Work B (d-meta-rollout)',
    )
  }
  return {
    ok: true,
    trigger,
    proposedVersion,
    activeGoals,
    summary: {
      byPriority,
      byStatus,
      total: listResult.total,
    },
    nextSteps,
    dryRun: !!input.dryRun,
  }
}

export interface VersionListResult {
  ok: true
  currentVersion: string
  proposedVersion: string
  source: 'package.json' | 'fallback'
}

export function listVersions(input: { projectRoot: string }): VersionListResult {
  let currentVersion = '0.0.0'
  let source: 'package.json' | 'fallback' = 'fallback'
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs')
    const pkgRaw = fs.readFileSync(`${input.projectRoot}/package.json`, 'utf-8') as string
    const pkg = JSON.parse(pkgRaw) as { version: string }
    currentVersion = pkg.version ?? '0.0.0'
    source = 'package.json'
  } catch {
    source = 'fallback'
  }
  return {
    ok: true,
    currentVersion,
    proposedVersion: proposeNextVersion(currentVersion),
    source,
  }
}

export interface VersionShowInput {
  projectRoot: string
  version: string
}

export interface VersionShowResult {
  ok: true
  version: string
  matchedGoals: GoalListItem[]
  count: number
}

export interface VersionShowError {
  ok: false
  code: 'OXN_VERSION_NOT_FOUND'
  message: string
  suggestion?: string
}

export function showVersion(input: VersionShowInput): VersionShowResult | VersionShowError {
  const all = listGoals({ projectRoot: input.projectRoot }).goals
  // Work A 最小：仅按 scheduled-version 字段匹配
  const matched = all.filter((g) => g.scheduledVersion === input.version)
  return {
    ok: true,
    version: input.version,
    matchedGoals: matched,
    count: matched.length,
  }
}

export interface VersionStatusResult {
  ok: true
  currentVersion: string
  /** Goals by status */
  byStatus: Record<string, GoalListItem[]>
  /** Active planned goals */
  activePlanned: GoalListItem[]
  /** Goals needing attention (no branch or no scheduled-version) */
  needsAttention: GoalListItem[]
}

export function versionStatus(input: { projectRoot: string }): VersionStatusResult {
  const listResult = listGoals({ projectRoot: input.projectRoot })
  const goals = listResult.goals
  const byStatus: Record<string, GoalListItem[]> = {}
  const needsAttention: GoalListItem[] = []
  for (const g of goals) {
    if (!byStatus[g.status]) byStatus[g.status] = []
    byStatus[g.status]!.push(g)
    if (!g.branch || !g.scheduledVersion || g.scheduledVersion === '~') {
      needsAttention.push(g)
    }
  }
  return {
    ok: true,
    currentVersion: 'package.json read goes here in D5+',
    byStatus,
    activePlanned: byStatus['planned'] ?? [],
    needsAttention,
  }
}
