/**
 * dev-pool-migrate.ts — D4 一次性 CLI 命令
 *
 * 职责：D4 迁移落地——给 dev/pool/<slug>.md 加 frontmatter 字段：
 *   - branch: feat/goal-<slug>
 *   - source: direct
 */

import { defineCommand } from 'citty'
import { planMigration, applyMigration } from '@openxenon/engine/Goal'
import { getFormatFromArgs, output } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

export default defineCommand({
  meta: {
    name: 'dev-pool-migrate',
    description:
      '[v0.6.0 D4 2026-08-07] 给 dev/pool/<slug>.md 加 frontmatter 字段（branch=feat/goal-<slug> + source=direct）。idempotent 可重跑；--dry-run 仅打印计划。',
  },
  args: {
    'dry-run': { type: 'boolean', description: '仅打印计划，不写文件（推荐先跑一遍）' },
    verbose: { type: 'boolean', description: '输出每个 entry 的变更详情' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const isJson = format === 'json'
    const dryRun = ctx.args['dry-run'] === true
    const verbose = ctx.args.verbose === true
    const projectRoot = getProjectRoot()

    const plan = planMigration({ projectRoot, dryRun: true })
    if (!plan.ok) {
      if (isJson) {
        return output({
          ok: false,
          error: { code: plan.code, message: plan.message, suggestion: plan.suggestion },
        })
      }
      console.error(`✗ ${plan.code}: ${plan.message}`)
      if (plan.suggestion) console.error(`  ${plan.suggestion}`)
      return
    }

    if (isJson) {
      return output({
        ok: true,
        data: {
          plan: plan.entries.map((e) => ({
            slug: e.slug,
            existingBranch: e.existingBranch ?? null,
            existingSource: e.existingSource ?? null,
            needsBranch: e.needsBranch,
            needsSource: e.needsSource,
          })),
          summary: {
            total: plan.entries.length,
            changed: plan.changedCount,
            unchanged: plan.unchangedCount,
            dryRun,
          },
        },
        human: dryRun
          ? `Plan: ${plan.changedCount} entries need migration, ${plan.unchangedCount} unchanged (dry-run)`
          : `✓ Migrated: ${plan.changedCount} entries (${plan.unchangedCount} unchanged)`,
      })
    }

    console.log(
      `Plan summary: ${plan.entries.length} entries (${plan.changedCount} need migration, ${plan.unchangedCount} already migrated)`,
    )
    if (verbose || plan.changedCount > 0) {
      for (const e of plan.entries) {
        const status = !e.needsBranch && !e.needsSource ? '✓ already migrated' : '✎ will update'
        const branchInfo = e.existingBranch ? `(existing: ${e.existingBranch})` : '(missing)'
        const sourceInfo = e.existingSource ? `(existing: ${e.existingSource})` : '(missing)'
        console.log(`  ${status} ${e.slug}`)
        console.log(`    branch: ${branchInfo} ${e.needsBranch ? `→ feat/goal-${e.slug}` : ''}`)
        console.log(`    source: ${sourceInfo} ${e.needsSource ? '→ direct' : ''}`)
      }
    }

    if (dryRun) {
      console.log('\n→ --dry-run: no files changed. Re-run without --dry-run to apply.')
      return
    }

    if (plan.changedCount === 0) {
      console.log('\n✓ All entries already migrated; no changes needed.')
      return
    }

    const result = applyMigration({ projectRoot })
    if (!result.ok) {
      if (isJson) {
        return output(
          {
            ok: false,
            error: { code: result.code, message: result.message, suggestion: result.suggestion },
          },
          format,
        )
      }
      console.error(`✗ ${result.code}: ${result.message}`)
      return
    }

    console.log(`\n✓ Migrated ${result.changedCount} entries (${result.unchangedCount} unchanged).`)
    console.log('  Each entry now has:')
    console.log('    branch: feat/goal-<slug>   (Goal 一致分支名)')
    console.log('    source: direct              (区别于 D2 promote 路径的 source=draft)')
  },
})
