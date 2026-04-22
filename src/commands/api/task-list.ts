import { defineCommand } from 'citty'
import { socketRequest } from '../../api/socket-client'
import { DAEMON_SOCK_PATH } from '../../core/global'
import { isDaemonRunning } from '../../daemon/process'
import { cliContext } from '../../cli-context'

export default defineCommand({
  meta: {
    name: 'task-list',
    description: '列出所有任务'
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
        '/api/v1/task/list',
        undefined,
        process.cwd()
      )

      if (cliContext.isJsonMode()) {
        console.log(JSON.stringify(response.body, null, 2))
        return
      }

      const { tasks, total } = response.body as { tasks: any[]; total: number }

      console.log(`\n任务列表 (共 ${total} 个)\n`)
      console.log('='.repeat(60))

      if (tasks.length === 0) {
        console.log('暂无任务')
      } else {
        for (const task of tasks) {
          console.log(`ID: ${task.id}`)
          console.log(`名称: ${task.name}`)
          console.log(`状态: ${task.status}`)
          console.log(`创建时间: ${new Date(task.createdAt).toLocaleString()}`)
          console.log('-'.repeat(40))
        }
      }

      console.log()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${errorMessage}`)
      process.exit(1)
    }
  }
})
