// FROZEN v0.7+: not actively developed; retained for compatibility (cli-convergence Work decision 2026-08-07)
/**
 * `oxn goal` — Goal 体系 v0.6.0 D5+ (2026-08-07)
 *
 * 5 子命令：create / list / show / work / archive
 * 设计：design-version-iteration-redesign.md §3 D2 + §4.3
 * 后端：packages/engine/src/Goal/manager.ts
 */

import { defineCommand } from 'citty'
import { createGoal, listGoals, showGoal, createWorkFromGoal, archiveGoal } from '@openxenon/engine/Goal'
import { getFormatFromArgs, output, outputUserInputError } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

export default defineCommand({
  meta: {
    name: 'goal',
    description: 'Goal 体系（v0.6.0 D5+ 2026-08-07）：5 子命令 create/list/show/work/archive',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: '创建 Goal' },
      args: {
        slug: { type: 'positional', required: true, description: 'Goal slug（kebab-case）' },
        theme: { type: 'string', required: true, description: 'Goal theme' },
        priority: {
          type: 'string',
          description: 'low | medium | high | critical',
        },
        source: {
          type: 'string',
          description: 'direct | draft',
        },
        'source-ref': { type: 'string', description: 'source=draft 时记录源 Draft 路径' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const isJson = format === 'json'
        const slug = ctx.args.slug as string
        const theme = ctx.args.theme as string
        const priority = (ctx.args.priority as 'low' | 'medium' | 'high' | 'critical' | undefined) ?? 'medium'
        const source = (ctx.args.source as 'direct' | 'draft' | undefined) ?? 'direct'
        const sourceRef = ctx.args['source-ref'] as string | undefined

        const result = createGoal({
          projectRoot: getProjectRoot(),
          slug,
          theme,
          priority,
          source,
          sourceRef,
        })
        if (!result.ok) {
          if (isJson) {
            return output({
              ok: false,
              error: { code: result.code, message: result.message, suggestion: result.suggestion },
            })
          }
          outputUserInputError(result.code, result.message, { suggestion: result.suggestion })
          return
        }
        if (isJson) {
          return output({
            ok: true,
            data: { slug: result.slug, filePath: result.filePath, branch: result.branch },
            human: `Created ${result.filePath}`,
          })
        }
        console.log(`Created: ${result.filePath}`)
        console.log(`  branch: ${result.branch}`)
      },
    }),

    list: defineCommand({
      meta: { name: 'list', description: '列出所有 Goal（按 priority 排序）' },
      args: {
        status: { type: 'string', description: '按 status 过滤' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const isJson = format === 'json'
        const statusFilter = ctx.args.status as string | undefined
        const r = listGoals({ projectRoot: getProjectRoot() })
        let goals = r.goals
        if (statusFilter) goals = goals.filter((g) => g.status === statusFilter)
        if (isJson) {
          return output({ ok: true, data: { goals, count: goals.length } })
        }
        if (goals.length === 0) {
          console.log('(no goals)')
          return
        }
        for (const g of goals) {
          console.log(`${g.slug.padEnd(30)} [${g.priority.padEnd(8)}] ${g.theme}`)
        }
      },
    }),

    show: defineCommand({
      meta: { name: 'show', description: '显示 Goal 全文' },
      args: {
        slug: { type: 'positional', required: true, description: 'Goal slug' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const isJson = format === 'json'
        const slug = ctx.args.slug as string
        const r = showGoal({ projectRoot: getProjectRoot(), slug })
        if (!r.ok) {
          if (isJson) {
            return output({
              ok: false,
              error: { code: r.code, message: r.message, suggestion: r.suggestion },
            })
          }
          outputUserInputError(r.code, r.message)
          return
        }
        if (isJson) {
          return output({ ok: true, data: { goal: r.goal, body: r.body } })
        }
        console.log(`# Goal: ${r.goal.theme}`)
        console.log(`slug:     ${r.goal.slug}`)
        console.log(`priority: ${r.goal.priority}`)
        console.log(`status:   ${r.goal.status}`)
        console.log(`branch:   ${r.goal.branch}`)
        console.log(`source:   ${r.goal.source}`)
        console.log('')
        console.log(r.body.trim())
      },
    }),

    work: defineCommand({
      meta: {
        name: 'work',
        description: '[D5+ stub] 从 Goal 创建 Work IAP',
      },
      args: {
        slug: { type: 'positional', required: true, description: 'Goal slug' },
        blueprint: { type: 'string', description: '目标 Blueprint 名称' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const isJson = format === 'json'
        const slug = ctx.args.slug as string
        const blueprint = ctx.args.blueprint as string | undefined
        const r = createWorkFromGoal({ projectRoot: getProjectRoot(), slug, blueprint })
        if (isJson) {
          return output({ ok: true, data: r })
        }
        console.log(`Proposed work for goal "${slug}":`)
        console.log(`  proposedWorkId:     ${r.proposedWorkId}`)
        console.log(`  proposedWorkPath:   ${r.proposedWorkPath}`)
        console.log(`  proposedBlueprint:  ${r.proposedBlueprint}`)
        console.log(`Note: ${r.note}`)
      },
    }),

    archive: defineCommand({
      meta: { name: 'archive', description: '归档 Goal' },
      args: {
        slug: { type: 'positional', required: true, description: 'Goal slug' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const isJson = format === 'json'
        const slug = ctx.args.slug as string
        const r = archiveGoal({ projectRoot: getProjectRoot(), slug })
        if (isJson) {
          return output({ ok: true, data: { slug: r.slug, archivedPath: r.archivedPath } })
        }
        console.log(`Archived: ${r.archivedPath}`)
      },
    }),
  },
})
