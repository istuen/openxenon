import { defineCommand } from 'citty'
import { socketRequest } from '../../daemon/api/socket-client'
import { DAEMON_SOCK_PATH } from '../../core/global'
import { isDaemonRunning } from '../../daemon/process'

export default defineCommand({
  meta: {
    name: 'task-trace',
    description: '获取任务执行轨迹'
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
        `/api/v1/task/trace?taskId=${args['task-id']}`,
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