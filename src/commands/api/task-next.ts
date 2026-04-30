import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { getTaskDirectory } from '../../lib/task-dir'
import { readTaskTrace, getNextPendingStage } from '../../lib/task-trace'
import { parseBlueprintYaml } from '../../lib/blueprint-parser'

export default defineCommand({
  meta: {
    name: 'task-next',
    description: '获取下一步任务（文件系统优先模式）'
  },
  args: {
    'task-id': {
      type: 'string',
      description: '任务 ID',
      required: true
    }
  },
  async run({ args }) {
    const projectRoot = process.cwd()
    const taskId = args['task-id']
    const taskDir = getTaskDirectory(projectRoot, taskId)

    if (!existsSync(taskDir.root)) {
      console.error(`Error: Task '${taskId}' not found`)
      process.exit(1)
    }

    const trace = readTaskTrace(taskDir)

    if (!trace) {
      console.error(`Error: Task trace not found for '${taskId}'`)
      process.exit(1)
    }

    if (trace.status !== 'RUNNING') {
      console.log(JSON.stringify({
        stepId: null,
        message: `Task is not running (status: ${trace.status})`
      }))
      return
    }

    const pendingStage = getNextPendingStage(taskDir)

    if (!pendingStage) {
      const allComplete = trace.stages.every(s => s.status === 'PASSED' || s.status === 'FAILED')
      if (allComplete) {
        console.log(JSON.stringify({
          stepId: null,
          message: 'All stages completed'
        }))
      } else {
        console.log(JSON.stringify({
          stepId: null,
          message: 'No pending stages found'
        }))
      }
      return
    }

    const blueprintContent = readFileSync(taskDir.blueprintPath, 'utf-8')
    const parsedBlueprint = parseBlueprintYaml(blueprintContent)
    const stageBlueprint = parsedBlueprint.stages.find(s => s.id === pendingStage.stageId)

    console.log(JSON.stringify({
      stepId: pendingStage.stageId,
      name: pendingStage.stageName,
      status: pendingStage.status,
      proof: stageBlueprint?.proof || null
    }))
  }
})