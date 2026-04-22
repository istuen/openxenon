import { defineCommand } from 'citty'
import { loadProjectContext } from '../api/context'
import { isOldSchema, migrateAllOldData, getMigrationStats, type MigrationResult } from '../core/legacy-migration'

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

    const dryRun = args['--dry-run'] as boolean

    if (!isOldSchema(ctx.db)) {
      console.log('Database is already using the new schema. No migration needed.')
      return
    }

    console.log('Detected old schema (tasks.playbook JSON blob).')
    console.log('')

    if (dryRun) {
      const stats = getMigrationStats(ctx.db)
      console.log('[Dry-run] Would migrate:')
      console.log(`  Tasks: ${stats.totalTasks}`)
      console.log(`  Blueprints: ${stats.totalBlueprints}`)
      console.log(`  Stages: ${stats.totalStages}`)
      console.log('')
      console.log('No changes made. Run without --dry-run to execute migration.')
      return
    }

    const result: MigrationResult = migrateAllOldData(ctx.db)

    console.log('')
    if (result.success) {
      console.log('Migration complete:')
      console.log(`  Tasks migrated: ${result.tasksMigrated}`)
      console.log(`  Blueprints created: ${result.blueprintsCreated}`)
      console.log(`  Stages created: ${result.stagesCreated}`)
    } else {
      console.log('Migration completed with errors:')
      console.log(`  Tasks migrated: ${result.tasksMigrated}`)
      console.log(`  Errors: ${result.errors.length}`)
    }

    if (result.errors.length > 0) {
      console.log('')
      console.log('Errors:')
      for (const err of result.errors) {
        console.log(`  - ${err}`)
      }
    }
  }
})