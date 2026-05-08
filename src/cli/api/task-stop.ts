import { defineCommand } from 'citty'
import { existsSync } from 'fs'
import { getTaskDirectory } from '../../lib/task-dir'
import { readTaskTrace, appendTaskStatus } from '../../lib/task-trace'

export default defineCommand({
  meta: {
    name: 'task-stop',
    description: '停止执行任务（文件系统优先模式）'
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

    if (trace.status === 'COMPLETED' || trace.status === 'FAILED' || trace.status === 'ESCAPED') {
      console.error(`Error: Task '${taskId}' has already ${trace.status.toLowerCase()}`)
      process.exit(1)
    }

    appendTaskStatus(taskDir, taskId, 'TERMINATED')

    console.log(JSON.stringify({
      taskId,
      status: 'TERMINATED',
      message: 'Task stopped successfully'
    }))
  }
})