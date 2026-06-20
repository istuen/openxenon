// src/cli/daemon-kill.ts — v0.2 T14 Daemon PR-3 kill command
import { defineCommand } from 'citty'
import { readFileSync } from '../infra/filesystem'
import { join } from 'node:path'
import { output } from './output'

export default defineCommand({
  meta: { name: 'daemon-kill', description: 'Force-kill the OXN daemon process' },
  async run() {
    const pidPath = join(process.cwd(), '.openxenon', 'daemon', 'daemon.pid')
    let pid: number | null = null
    try {
      pid = Number(readFileSync(pidPath, 'utf-8').trim())
    } catch {
      pid = null
    }

    if (pid && pid > 0) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* already dead */
      }
      output({ ok: true, message: `Killed daemon PID ${pid}` })
    } else {
      output({ ok: true, message: 'No running daemon found' })
    }
  },
})
