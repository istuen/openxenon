import { defineCommand } from 'citty'
// eslint-disable-next-line no-restricted-imports -- TODO(Phase-2): daemon-status needs socket-based status; probe only covers PID check
import { getDaemonBasicStatus, getRecentLogs, queryDaemonStatus } from '../daemon/status-client'
import { t } from '@openxenon/engine/infra/i18n'
import { output } from './output'

export default defineCommand({
  meta: {
    name: 'daemon-status',
    description: '查看全局 Core 守护进程状态',
  },
  async run(ctx) {
    const { isRunning } = getDaemonBasicStatus()

    if (!isRunning) {
      return output(
        {
          data: {
            isRunning: false,
            pid: 0,
            message: t('daemon.statusNotRunning'),
          },
          human: t('daemon.statusNotRunningHint'),
        },
        getFormatFromArgs(ctx.args),
      )
    }

    const status = await queryDaemonStatus()

    const logs = getRecentLogs()
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : '无'

    return output(
      {
        data: {
          isRunning: status.isRunning,
          pid: status.pid,
          socketPath: status.socketPath,
          logPath: status.logPath,
          uptime: status.uptime,
          recentLogs: logs.slice(-5),
        },
        human: `${t('daemon.statusRunning')}
${t('daemon.statusRunningLine1', { pid: status.pid })}
${t('daemon.statusRunningLine2', { socketPath: status.socketPath })}
${t('daemon.statusRunningLine3', { lastLog })}`,
      },
      getFormatFromArgs(ctx.args),
    )
  },
})

function getFormatFromArgs(args: Record<string, unknown>): 'human' | 'json' | 'yaml' {
  if (args['--json']) return 'json'
  if (args['--yaml']) return 'yaml'
  return 'human'
}
