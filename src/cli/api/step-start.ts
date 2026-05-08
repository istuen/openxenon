import { defineCommand } from 'citty'
import { socketRequest } from '../../api/socket-client'
import { DAEMON_SOCK_PATH } from '../../core/global'
import { isDaemonRunning } from '../../daemon/process'

export default defineCommand({
  meta: {
    name: 'step-start',
    description: '开始执行步骤'
  },
  args: {
    'task-id': {
      type: 'string',
      description: '任务 ID',
      required: true
    },
    'step-id': {
      type: 'string',
      description: '步骤 ID',
      required: true
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
      const response = await socketRequest(
        DAEMON_SOCK_PATH,
        'POST',
        '/api/v1/step/start',
        { taskId: args['task-id'], stepId: args['step-id'] },
        process.cwd()
      )

      console.log(JSON.stringify(response.body, null, 2))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${errorMessage}`)
      process.exit(1)
    }
  }
})