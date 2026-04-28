import { defineCommand } from 'citty'
import { resolve } from 'path'
import { readdirSync, statSync, rmSync, existsSync } from 'fs'

export default defineCommand({
  meta: {
    name: 'gc',
    description: '清理已完成任务的旧资产'
  },
  args: {
    dryRun: {
      alias: 'd',
      type: 'boolean',
      description: '预览模式 - 仅显示将要删除的内容',
      default: false
    },
    keep: {
      alias: 'k',
      type: 'string',
      description: '保留天数（默认: 7）',
      default: '7'
    }
  },
  async run(ctx) {
    const dryRun = ctx.args.dryRun as boolean
    const keepDays = parseInt(ctx.args.keep as string, 10) || 7

    const tasksDir = resolve(process.cwd(), '.openxenon', 'tasks')

    if (!existsSync(tasksDir)) {
      console.log('没有任务目录需要清理')
      return
    }

    const now = Date.now()
    const keepMs = keepDays * 24 * 60 * 60 * 1000
    const cutoffTime = now - keepMs

    let deletedCount = 0
    let totalSize = 0

    try {
      const taskIds = readdirSync(tasksDir)

      for (const taskId of taskIds) {
        const taskPath = resolve(tasksDir, taskId)
        const stat = statSync(taskPath)

        if (stat.mtime.getTime() < cutoffTime) {
          const size = stat.size
          if (dryRun) {
            console.log(`将删除: ${taskId} (${Math.round(size / 1024)}KB, ${keepDays}天前)`)
          } else {
            rmSync(taskPath, { recursive: true, force: true })
            console.log(`已删除: ${taskId}`)
          }
          deletedCount++
          totalSize += size
        }
      }

      if (deletedCount === 0) {
        console.log('没有需要清理的任务')
      } else if (dryRun) {
        console.log(`\n共 ${deletedCount} 个任务待删除 (${Math.round(totalSize / 1024)}KB)`)
        console.log('使用 --dry-run 预览，或不使用 -d 参数实际删除')
      } else {
        console.log(`\n已清理 ${deletedCount} 个任务 (${Math.round(totalSize / 1024)}KB)`)
      }
    } catch (error) {
      console.error('清理失败:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }
})
