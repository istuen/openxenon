import { defineCommand } from 'citty'
import { existsSync } from 'fs'
import { getTaskDirectory } from '../../lib/task-dir'
import { readTaskTrace } from '../../lib/task-trace'

export default defineCommand({
  meta: {
    name: 'task-status',
    description: '查询任务状态（文件系统优先模式）'
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

    console.log(JSON.stringify({
      taskId: trace.taskId,
      name: trace.taskName,
      status: trace.status,
      startedAt: trace.startedAt,
      completedAt: trace.completedAt,
      stages: Array.from(trace.stages.values()).map(s => ({
        stageId: s.stageId,
        stageName: s.stageName,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt
      }))
    }, null, 2))
  }
})