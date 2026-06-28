import { defineCommand } from 'citty'
import { existsSync, readdirSync, rmSync, statSync } from '@openxenon/engine/infra/filesystem'
import { resolve } from 'path'
import { t } from '@openxenon/engine/infra/i18n'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'gc',
    description: '清理已完成任务的旧资产',
  },
  args: {
    dryRun: {
      alias: 'd',
      type: 'boolean',
      description: '预览模式 - 仅显示将要删除的内容',
      default: false,
    },
    keep: {
      alias: 'k',
      type: 'string',
      description: '保留天数（默认: 7）',
      default: '7',
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const dryRun = ctx.args.dryRun as boolean
    const keepDays = parseInt(ctx.args.keep as string, 10) || 7

    const tasksDir = resolve(process.cwd(), '.openxenon', 'tasks')

    if (!existsSync(tasksDir)) {
      return output(
        {
          data: { message: t('gc.noTaskDirs') },
          human: t('gc.noTaskDirs'),
        },
        format,
      )
    }

    const now = Date.now()
    const keepMs = keepDays * 24 * 60 * 60 * 1000
    const cutoffTime = now - keepMs

    const toDelete: { taskId: string; size: number; age: number }[] = []
    const toKeep: { taskId: string; size: number; age: number }[] = []

    try {
      const taskIds = readdirSync(tasksDir)

      for (const taskId of taskIds) {
        const taskPath = resolve(tasksDir, taskId)
        const stat = statSync(taskPath)

        if (stat.mtime.getTime() < cutoffTime) {
          toDelete.push({
            taskId,
            size: stat.size,
            age: Math.round((now - stat.mtime.getTime()) / (24 * 60 * 60 * 1000)),
          })
        } else {
          toKeep.push({
            taskId,
            size: stat.size,
            age: Math.round((now - stat.mtime.getTime()) / (24 * 60 * 60 * 1000)),
          })
        }
      }

      if (toDelete.length === 0) {
        return output(
          {
            data: { message: t('gc.noTasks') },
            human: t('gc.noTasks'),
          },
          format,
        )
      }

      let deletedCount = 0
      let totalSize = 0

      if (!dryRun) {
        for (const task of toDelete) {
          rmSync(resolve(tasksDir, task.taskId), { recursive: true, force: true })
          deletedCount++
          totalSize += task.size
        }
      }

      const result = {
        deleted: deletedCount,
        totalSize: `${Math.round(totalSize / 1024)}KB`,
        tasks: toDelete.map((t) => ({ taskId: t.taskId, size: t.size, age: t.age })),
      }

      if (dryRun) {
        return output(
          {
            data: result,
            human: t('gc.dryRunResult', {
              count: deletedCount,
              size: Math.round(totalSize / 1024),
            }),
          },
          format,
        )
      }

      return output(
        {
          data: result,
          human: t('gc.clearedResult', {
            count: deletedCount,
            size: Math.round(totalSize / 1024),
          }),
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError(
        {
          code: 'OXN_GC_FAILED',
          message: errorMsg,
        },
        format,
      )
    }
  },
})
