import { defineCommand } from 'citty'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { cliContext } from '../cli-context'
import { loadProjectContext } from '../api/context'
import { exportTaskToMarkdown } from '../core/export.service'

export default defineCommand({
  meta: {
    name: 'archive',
    description: '导出已终结或废弃的 Task/Blueprint 结构到 archive/ 目录'
  },
  args: {
    '--task-id': {
      type: 'string',
      description: 'Task ID'
    },
    '--all': {
      type: 'boolean',
      description: '导出所有已终结的任务'
    }
  },
  async run({ args }) {
    const ctx = loadProjectContext(process.cwd())
    if (ctx instanceof Response) {
      console.error('Project not initialized')
      return
    }

    const taskId = args['--task-id'] as string | undefined
    const exportAll = args['--all'] as boolean

    if (!taskId && !exportAll) {
      console.error('Provide --task-id or use --all to export all completed tasks.')
      process.exit(1)
    }

    const archiveDir = join(process.cwd(), '.openxenon', 'archive')
    if (!existsSync(archiveDir)) {
      mkdirSync(archiveDir, { recursive: true })
    }

    if (exportAll) {
      // Export all completed/terminated tasks
      const completedTasks = ctx.db.query(`
        SELECT id FROM tasks
        WHERE status IN ('COMPLETED', 'TERMINATED')
        ORDER BY created_at DESC
      `).all() as { id: string }[]

      let exported = 0
      for (const task of completedTasks) {
        const md = exportTaskToMarkdown(ctx.db, task.id, 'archive')
        if (md) {
          const filePath = join(archiveDir, `${task.id}.md`)
          writeFileSync(filePath, md)
          exported++
        }
      }

      if (!cliContext.isJsonMode()) {
        console.log(`\nArchived ${exported} tasks to ${archiveDir}`)
      }
    } else {
      // Export specific task
      const md = exportTaskToMarkdown(ctx.db, taskId!, 'archive')
      if (!md) {
        console.error(`Task not found: ${taskId}`)
        process.exit(1)
      }

      const filePath = join(archiveDir, `${taskId}.md`)
      writeFileSync(filePath, md)

      if (!cliContext.isJsonMode()) {
        console.log(`\nArchive projection exported to: ${filePath}`)
      }
    }
  }
})
