import { defineCommand } from 'citty'
import { loadTaskBlueprint, getTaskBlueprintPath } from '../../core/task-blueprint'
import { getProjectBoundaryPath } from '../../core/project'
import { existsSync } from 'fs'

export default defineCommand({
  meta: {
    name: 'task-show',
    description: '查看指定任务的 Blueprint 内容'
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
    const projectRoot = project

    const projectBoundary = getProjectBoundaryPath(projectRoot)
    if (!existsSync(projectBoundary)) {
      console.error(`Error: Project boundary not found at ${projectBoundary}`)
      console.error('Please run `oxn init` first to initialize the project.')
      return
    }

    const blueprintPath = getTaskBlueprintPath(projectRoot, taskId)

    if (!existsSync(blueprintPath)) {
      console.error(`Error: Blueprint not found for task: ${taskId}`)
      console.error(`Expected path: ${blueprintPath}`)
      return
    }

    const content = loadTaskBlueprint(projectRoot, taskId)
    console.log(content)
  }
})