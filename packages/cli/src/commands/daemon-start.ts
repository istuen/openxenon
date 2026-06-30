import { defineCommand } from 'citty'
// eslint-disable-next-line no-restricted-imports -- TODO(Phase-2): daemon-start is the daemon entry point, must fork process directly; switch to Bun.spawn via infra
import { isDaemonRunning, startDaemonWithHealthCheck } from '../../../../src/daemon/process'
import { DAEMON_SOCK_PATH } from '@openxenon/engine/infra/global'
import { t } from '@openxenon/engine/infra/i18n'

export default defineCommand({
  meta: {
    name: 'daemon-start',
    description: '启动全局 Core 守护进程',
  },
  async run() {
    const { isRunning, pid } = isDaemonRunning()

    if (isRunning) {
      console.log(
        JSON.stringify({
          ok: true,
          data: { message: t('daemon.startAlreadyRunning', { pid }), pid },
        }),
      )
      return
    }

    const result = await startDaemonWithHealthCheck('./src/server.ts')

    if (result.success) {
      console.log(
        JSON.stringify({
          ok: true,
          data: {
            message: t('daemon.startSuccess', { pid: result.pid }),
            pid: result.pid,
            healthCheckMs: result.healthCheckMs,
          },
        }),
      )
    } else {
      console.log(
        JSON.stringify({
          ok: false,
          error: {
            code: 'OXN_DAEMON_START_FAILED',
            message: result.error || t('daemon.startFailed'),
            suggestion: t('daemon.startCheckSocket', { socketPath: DAEMON_SOCK_PATH }),
          },
        }),
      )
    }
  },
})
