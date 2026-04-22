import { defineCommand } from 'citty'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { cliContext } from '../cli-context'
import { loadProjectContext } from '../api/context'
import { exportTaskToMarkdown } from '../core/export.service'

export default defineCommand({
  meta: {
    name: 'active',
    description: '导出当前活跃的 Task/Blueprint 结构到 active/ 目录'
  },
  args: {
    '--task-id': {
      type: 'string',
      description: 'Task ID（默认为当前活跃的 Task）'
    }
  },
  async run({ args }) {
    const ctx = loadProjectContext(process.cwd())
    if (ctx instanceof Response) {
      console.error('Project not initialized')
      return
    }

    const taskId = args['--task-id'] as string | undefined

    let targetTaskId = taskId

    if (!targetTaskId) {
      // Find active task
      const activeTask = ctx.db.query(`
        SELECT id FROM tasks
        WHERE status = 'RUNNING' OR status = 'PENDING'
        ORDER BY created_at DESC LIMIT 1
      `).get() as { id: string } | undefined

      if (activeTask) {
        targetTaskId = activeTask.id
      }
    }

    if (!targetTaskId) {
      console.error('No task ID provided and no active task found.')
      process.exit(1)
    }

    // Export
    const md = exportTaskToMarkdown(ctx.db, targetTaskId, 'active')
    if (!md) {
      console.error(`Task not found: ${targetTaskId}`)
      process.exit(1)
    }

    // Write to active directory
    const activeDir = join(process.cwd(), '.openxenon', 'active')
    if (!existsSync(activeDir)) {
      mkdirSync(activeDir, { recursive: true })
    }

    const filePath = join(activeDir, `${targetTaskId}.md`)
    writeFileSync(filePath, md)

    if (!cliContext.isJsonMode()) {
      console.log(`\nActive projection exported to: ${filePath}`)
    }
  }
})
