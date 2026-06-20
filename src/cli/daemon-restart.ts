// src/cli/daemon-restart.ts — v0.2 T14 Daemon PR-3 restart command
import { defineCommand } from 'citty'
import { spawn } from 'child_process'
import { output } from './output'

export default defineCommand({
  meta: { name: 'daemon-restart', description: 'Restart the OXN daemon' },
  async run() {
    // 1. stop existing
    const stop = spawn('bun', ['src/daemon/server.ts', '--stop'], { cwd: process.cwd(), timeout: 10_000 })
    await new Promise<void>((resolve) => stop.on('close', () => resolve()))

    // 2. start new
    const start = spawn('bun', ['src/daemon/server.ts'], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
    })
    start.unref()

    output({ ok: true, message: 'Daemon restarted' })
  },
})
