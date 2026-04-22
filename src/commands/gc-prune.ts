import { defineCommand } from 'citty'
import { cliContext } from '../cli-context'
import { loadProjectContext } from '../api/context'

export default defineCommand({
  meta: {
    name: 'prune',
    description: '清理已终结的任务及其关联数据'
  },
  args: {
    '--task-id': {
      type: 'string',
      description: '指定要清理的 Task ID'
    },
    '--before': {
      type: 'string',
      description: '清理指定日期之前完成的任务 (YYYY-MM-DD)'
    },
    '--dry-run': {
      type: 'boolean',
      description: '仅显示将要清理的内容，不实际删除'
    }
  },
  async run({ args }) {
    const ctx = loadProjectContext(process.cwd())
    if (ctx instanceof Response) {
      console.error('Project not initialized')
      return
    }

    const taskId = args['--task-id'] as string | undefined
    const beforeDate = args['--before'] as string | undefined
    const dryRun = args['--dry-run'] as boolean

    let query = 'SELECT id, name, status, completed_at FROM tasks WHERE 1=1'
    const params: string[] = []

    if (taskId) {
      query += ' AND id = ?'
      params.push(taskId)
    }

    if (beforeDate) {
      const timestamp = Math.floor(new Date(beforeDate).getTime() / 1000)
      query += ' AND completed_at < ?'
      params.push(String(timestamp))
    }

    const stmt = ctx.db.query(query)
    const tasks = stmt.all(...params) as {
      id: string
      name: string
      status: string
      completed_at: number | null
    }[]

    if (tasks.length === 0) {
      if (!cliContext.isJsonMode()) {
        console.log('No tasks to prune.')
      }
      return
    }

    if (!cliContext.isJsonMode()) {
      console.log(`\nTasks to prune (${tasks.length}):`)
      for (const task of tasks) {
        const completedAt = task.completed_at
          ? new Date(task.completed_at * 1000).toISOString()
          : 'unknown'
        console.log(`  - ${task.id}: ${task.name} (${task.status}, completed: ${completedAt})`)
      }
    }

    if (dryRun) {
      if (!cliContext.isJsonMode()) {
        console.log('\n[Dry-run] No changes made.')
      }
      return
    }

    // Actually delete
    let deleted = 0
    for (const task of tasks) {
      // Delete associated stages first (cascade)
      ctx.db.run('DELETE FROM stages WHERE blueprint_id IN (SELECT id FROM blueprints WHERE task_id = ?)', [task.id])
      // Delete blueprints
      ctx.db.run('DELETE FROM blueprints WHERE task_id = ?', [task.id])
      // Delete task
      ctx.db.run('DELETE FROM tasks WHERE id = ?', [task.id])
      deleted++
    }

    if (!cliContext.isJsonMode()) {
      console.log(`\nPruned ${deleted} tasks.`)
    }
  }
})
