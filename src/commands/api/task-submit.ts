import { defineCommand } from 'citty'
import { getTaskBlueprintPath } from '../../core/task-blueprint'
import { getProjectBoundaryPath } from '../../core/project'
import { existsSync } from 'fs'
import { resolve } from 'path'

export default defineCommand({
  meta: {
    name: 'task-submit',
    description: '提交任务到 Core 进行追踪 (已废弃 - 使用文件系统)'
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

    console.log(`Task ${taskId} is now managed by filesystem.`)
    console.log(`  Project: ${projectRoot}`)
    console.log(`  Blueprint: ${blueprintPath}`)
    console.log(`Use 'oxn task start --task-id ${taskId}' to start execution.`)
  }
})