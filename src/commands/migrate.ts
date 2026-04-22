import { defineCommand } from 'citty'
import { loadProjectContext } from '../api/context'
import { isOldSchema, migrateAllOldData, type MigrationResult } from '../core/legacy-migration'

export default defineCommand({
  meta: {
    name: 'migrate',
    description: '迁移旧版本数据库到新 Schema'
  },
  args: {
    '--task-id': {
      type: 'string',
      description: '指定要迁移的任务 ID（默认全部）'
    },
    '--dry-run': {
      type: 'boolean',
      description: '仅显示将要迁移的内容，不实际执行'
    }
  },
  async run({ args }) {
    const ctx = loadProjectContext(process.cwd())
    if (ctx instanceof Response) {
      console.error('Project not initialized')
      return
    }

    const taskId = args['--task-id'] as string | undefined
    const dryRun = args['--dry-run'] as boolean

    // Check if this is old schema
    if (!isOldSchema(ctx.db)) {
      console.log('Database is already using the new schema. No migration needed.')
      return
    }

    console.log('Detected old schema (tasks.playbook JSON blob).')
    console.log('')

    if (dryRun) {
      console.log('[Dry-run] Would migrate all old data:')
      const oldTasks = ctx.db.query('SELECT * FROM tasks').all() as { id: string; name: string; playbook: string }[]
      console.log(`  Tasks: ${oldTasks.length}`)
      for (const task of oldTasks) {
        const playbook = JSON.parse(task.playbook)
        console.log(`  - ${task.name}: ${playbook.stages?.length || 0} stages`)
      }
      console.log('')
      console.log('No changes made.')
      return
    }

    // Perform migration
    const result: MigrationResult = migrateAllOldData(ctx.db)

    console.log('')
    console.log('Migration complete:')
    console.log(`  Tasks migrated: ${result.tasksMigrated}`)
    console.log(`  Blueprints created: ${result.blueprintsCreated}`)
    console.log(`  Stages created: ${result.stagesCreated}`)

    if (result.errors.length > 0) {
      console.log('')
      console.log('Errors:')
      for (const err of result.errors) {
        console.log(`  - ${err}`)
      }
    }
  }
})
