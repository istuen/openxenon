import { defineCommand } from 'citty'
import { getDaemonBasicStatus, queryDaemonStatus, getRecentLogs } from '../daemon/status-client'
import { output } from './output'

export default defineCommand({
  meta: {
    name: 'daemon-status',
    description: '查看全局 Core 守护进程状态'
  },
  async run(ctx) {
    const { isRunning } = getDaemonBasicStatus()

    if (!isRunning) {
      return output({
        data: {
          isRunning: false,
          pid: 0,
          message: 'Daemon 未运行'
        },
        human: 'Daemon 状态: 未运行\n使用 `oxn daemon start` 启动 Daemon'
      }, getFormatFromArgs(ctx.args))
    }

    const status = await queryDaemonStatus()

    const logs = getRecentLogs()
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : '无'

    return output({
      data: {
        isRunning: status.isRunning,
        pid: status.pid,
        socketPath: status.socketPath,
        logPath: status.logPath,
        uptime: status.uptime,
        recentLogs: logs.slice(-5)
      },
      human: `Daemon 状态: 运行中
PID: ${status.pid}
Socket: ${status.socketPath}
最近日志: ${lastLog}`
    }, getFormatFromArgs(ctx.args))
  }
})

function getFormatFromArgs(args: Record<string, unknown>): 'human' | 'json' | 'yaml' {
  if (args['--json']) return 'json'
  if (args['--yaml']) return 'yaml'
  return 'human'
}