// src/cli/daemon-logs.ts — v0.2 T14 Daemon PR-3 logs command
import { defineCommand } from 'citty'
import { existsSync, readFileSync } from '../infra/filesystem'
import { join } from 'node:path'
import { output } from './output'

export default defineCommand({
  meta: { name: 'daemon-logs', description: 'Show daemon logs' },
  args: { lines: { type: 'string', default: '50', description: 'Number of tail lines' } },
  async run({ args }) {
    const logPath = join(process.cwd(), '.openxenon', 'daemon', 'daemon.log')
    if (!existsSync(logPath)) {
      output({ ok: true, message: 'No daemon log file found' })
      return
    }
    const limit = Number(args.lines ?? 50)
    // Simple tail: read file, return last N lines
    const content = readFileSync(logPath, 'utf-8')
    const lines = content.split('\n').slice(-limit)
    output({ ok: true, lines, count: lines.length, path: logPath })
  },
})
