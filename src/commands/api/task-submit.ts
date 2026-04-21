import { defineCommand } from 'citty'
import { socketRequest } from '../../api/socket-client'
import { DAEMON_SOCK_PATH } from '../../core/global'
import { isDaemonRunning } from '../../daemon/process'

export default defineCommand({
  meta: {
    name: 'task-submit',
    description: '提交新任务'
  },
  args: {
    task: {
      type: 'string',
      description: '任务描述',
      required: true
    },
    steps: {
      type: 'string',
      description: '步骤列表 (JSON 数组)',
      default: '[]'
    }
  },
  async run({ args }) {
    const { isRunning } = isDaemonRunning()

    if (!isRunning) {
      console.error('Error: Daemon is not running')
      console.error('Start it with: oxn daemon start')
      process.exit(1)
    }

    try {
      let steps = []
      if (args.steps && args.steps !== '[]') {
        steps = JSON.parse(args.steps)
      }

      const response = await socketRequest(
        DAEMON_SOCK_PATH,
        'POST',
        '/api/v1/task/submit',
        { task: args.task, stages: steps }
      )

      console.log(JSON.stringify(response.body, null, 2))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${errorMessage}`)
      process.exit(1)
    }
  }
})