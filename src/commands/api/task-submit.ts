import { defineCommand } from 'citty'
import { getTaskBlueprintPath } from '../../core/task-blueprint'
import { getProjectBoundaryPath } from '../../core/project'
import { CORE_DB_PATH } from '../../core/global'
import { createCoreTask, getCoreTaskById, updateCoreTaskStatus } from '../../db/operations/core-tasks'
import { initCoreDb } from '../../db/init'
import { existsSync } from 'fs'
import { resolve } from 'path'

export default defineCommand({
  meta: {
    name: 'task-submit',
    description: '提交任务到 Core 进行追踪'
  },
  args: {
    taskId: {
      type: 'positional',
      required: true,
      description: '任务 ID'
    },
    project: {
      type: 'string',
      default: '.',
      description: '项目路径'
    }
  },
  async run(ctx) {
    const { taskId, project } = ctx.args
    const projectRoot = resolve(project)

    const projectBoundary = getProjectBoundaryPath(projectRoot)
    if (!existsSync(projectBoundary)) {
      console.error(`Error: Project boundary not found at ${projectBoundary}`)
      console.error('Please run `oxn init` first to initialize the project.')
      return
    }

    const blueprintPath = getTaskBlueprintPath(projectRoot, taskId)
    if (!existsSync(blueprintPath)) {
      console.error(`Error: Blueprint not found for task: ${taskId}`)
      console.error(`Please create the task first with 'oxn task new ${taskId}'.`)
      return
    }

    const db = initCoreDb(CORE_DB_PATH)

    try {
      const existingTask = getCoreTaskById(db, taskId)

      if (existingTask) {
        updateCoreTaskStatus(db, taskId, 'IN_PROGRESS')
        console.log(`Task ${taskId} status updated to IN_PROGRESS`)
        return
      }

      const task = createCoreTask(db, projectRoot, blueprintPath)
      console.log(`Task ${taskId} submitted to Core successfully`)
      console.log(`  Project: ${projectRoot}`)
      console.log(`  Blueprint: ${blueprintPath}`)
      console.log(`  Status: ${task.status}`)
    } finally {
      db.close()
    }
  }
})