/**
 * `oxn version` — Version 体系 v0.6.0 D5+ (2026-08-07)
 *
 * 4 子命令：cut / list / show / status
 * 设计：design-version-iteration-redesign.md §4.3 + §4.5 release-cut 改造
 * 后端：packages/engine/src/Version/manager.ts
 *
 * Work A 范围：CLI 骨架 + dry-run；apply 模式仅 stub 输出（待 §4.5 release-cut workflow 接管）。
 */

import { defineCommand } from 'citty'
import { cutVersion, listVersions, showVersion, versionStatus } from '@openxenon/engine/Version'
import { getFormatFromArgs, output, outputUserInputError } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

export default defineCommand({
  meta: {
    name: 'version',
    description:
      'Version 体系（v0.6.0 D5+ 2026-08-07）：4 子命令 cut/list/show/status；cut 当前仅列 dry-run 输出 + 提议 version，由 §4.5 release-cut workflow 接管 apply',
  },
  subCommands: {
    cut: defineCommand({
      meta: {
        name: 'cut',
        description: '提议 next version + 列 active Goals。Apply 由 release-cut workflow 接管（§4.5）',
      },
      args: {
        trigger: {
          type: 'string',
          description: 'cut trigger（done | change | schedule）。默认 done',
        },
        'dry-run': { type: 'boolean', description: '仅打印提议，不变更任何文件。默认 true' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const isJson = format === 'json'
        const trigger = (ctx.args.trigger as 'done' | 'change' | 'schedule' | undefined) ?? 'done'
        const dryRun = ctx.args['dry-run'] !== false // 默认 true
        const r = cutVersion({ projectRoot: getProjectRoot(), trigger, dryRun })
        if (!r.ok) {
          if (isJson) {
            return output({ ok: false, error: { code: r.code, message: r.message } })
          }
          outputUserInputError(r.code, r.message, { suggestion: r.suggestion })
          return
        }
        if (isJson) {
          return output({
            ok: true,
            data: {
              trigger: r.trigger,
              proposedVersion: r.proposedVersion,
              activeGoals: r.activeGoals,
              summary: r.summary,
              nextSteps: r.nextSteps,
              dryRun: r.dryRun,
            },
          })
        }
        console.log(`Trigger: ${r.trigger}`)
        console.log(`Proposed version: ${r.proposedVersion}`)
        console.log(`Active Goals: ${r.activeGoals.length}`)
        if (r.activeGoals.length > 0) {
          for (const g of r.activeGoals) {
            console.log(`  - ${g.slug} [${g.priority}] ${g.theme}`)
          }
        }
        console.log('')
        for (const step of r.nextSteps) console.log(`• ${step}`)
      },
    }),

    list: defineCommand({
      meta: { name: 'list', description: '读 package.json version + 提议 next version' },
      async run() {
        const format = getFormatFromArgs({})
        const isJson = format === 'json'
        const r = listVersions({ projectRoot: getProjectRoot() })
        if (isJson) {
          return output({ ok: true, data: r })
        }
        console.log(`Current: ${r.currentVersion} (source: ${r.source})`)
        console.log(`Proposed: ${r.proposedVersion}`)
      },
    }),

    show: defineCommand({
      meta: { name: 'show', description: '按 scheduled-version 字段显示匹配 Goals' },
      args: {
        version: { type: 'positional', required: true, description: 'version 字符串（如 0.7.0）' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const isJson = format === 'json'
        const version = ctx.args.version as string
        const r = showVersion({ projectRoot: getProjectRoot(), version })
        if (!r.ok) {
          if (isJson) {
            return output({
              ok: false,
              error: { code: r.code, message: r.message },
            })
          }
          outputUserInputError(r.code, r.message)
          return
        }
        if (isJson) {
          return output({ ok: true, data: r })
        }
        console.log(`Version ${r.version}: ${r.count} goal(s)`)
        for (const g of r.matchedGoals) {
          console.log(`  - ${g.slug} [${g.priority}] ${g.theme}`)
        }
      },
    }),

    status: defineCommand({
      meta: { name: 'status', description: '按 status 聚合 Goals + needsAttention 检测' },
      async run() {
        const format = getFormatFromArgs({})
        const isJson = format === 'json'
        const r = versionStatus({ projectRoot: getProjectRoot() })
        if (isJson) {
          return output({ ok: true, data: r })
        }
        console.log(`Current version: ${r.currentVersion}`)
        for (const [status, goals] of Object.entries(r.byStatus)) {
          console.log(`\n[${status}] ${goals.length} goal(s)`)
          for (const g of goals) {
            console.log(`  - ${g.slug} [${g.priority}] ${g.theme}`)
          }
        }
        if (r.needsAttention.length > 0) {
          console.log(`\n⚠ Needs Attention: ${r.needsAttention.length}`)
          for (const g of r.needsAttention) {
            console.log(
              `  - ${g.slug} branch=${g.branch || 'MISSING'} scheduled-version=${g.scheduledVersion || 'MISSING'}`,
            )
          }
        }
      },
    }),
  },
})
