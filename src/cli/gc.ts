import { defineCommand } from 'citty'
import { existsSync, readdirSync, rmSync, statSync } from 'fs'
import { resolve } from 'path'
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
          data: { message: '没有任务目录需要清理' },
          human: '没有任务目录需要清理',
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
            data: { message: '没有需要清理的任务' },
            human: '没有需要清理的任务',
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
            human: `共 ${deletedCount} 个任务待删除 (${Math.round(totalSize / 1024)}KB)\n使用 --dry-run 预览，或不使用 -d 参数实际删除`,
          },
          format,
        )
      }

      return output(
        {
          data: result,
          human: `已清理 ${deletedCount} 个任务 (${Math.round(totalSize / 1024)}KB)`,
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
