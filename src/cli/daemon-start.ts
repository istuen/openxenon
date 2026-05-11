import { defineCommand } from 'citty'
import { startDaemonWithHealthCheck, isDaemonRunning } from '../daemon/process'
import { DAEMON_SOCK_PATH } from '../infra/global'

export default defineCommand({
  meta: {
    name: 'daemon-start',
    description: '启动全局 Core 守护进程'
  },
  async run() {
    const { isRunning, pid } = isDaemonRunning()

    if (isRunning) {
      console.log(JSON.stringify({
        ok: true,
        data: { message: `Daemon 已运行 (PID ${pid})`, pid }
      }))
      return
    }

    const result = await startDaemonWithHealthCheck('./src/server.ts')

    if (result.success) {
      console.log(JSON.stringify({
        ok: true,
        data: {
          message: `Daemon 启动成功 (PID ${result.pid})`,
          pid: result.pid,
          healthCheckMs: result.healthCheckMs
        }
      }))
    } else {
      console.log(JSON.stringify({
        ok: false,
        error: {
          code: 'OXN_DAEMON_START_FAILED',
          message: result.error || '启动失败',
          suggestion: `检查 ${DAEMON_SOCK_PATH} 是否可访问`
        }
      }))
    }
  }
})
