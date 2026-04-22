import { defineCommand } from 'citty'
import { socketRequest } from '../../api/socket-client'
import { DAEMON_SOCK_PATH } from '../../core/global'
import { isDaemonRunning } from '../../daemon/process'

export default defineCommand({
  meta: {
    name: 'task-next',
    description: '获取下一步任务'
  },
  args: {
    'task-id': {
      type: 'string',
      description: '任务 ID',
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
        'GET',
        `/api/v1/task/next?taskId=${args['task-id']}`,
        undefined,
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