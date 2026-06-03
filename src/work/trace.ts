import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { getTracePath } from './state-io'

// =============================================================================
// Unified work trace (decision C1: mvp-style JSONL + probe events).
//
// Each line is a JSON object with at least { event, at }. Supported events:
//   work-started    — emitted by `oxn leader run`
//   submit          — emitted by `oxn leader submit` (advances state machine)
//   part-started    — emitted when a part begins execution
//   part-completed  — emitted when a part finishes
//   probe-run       — emitted when a probe is launched (reference parity)
//   probe-result    — emitted when a probe finishes (reference parity)
// =============================================================================

export type TraceEvent = {
  event: string
  at: string
  [key: string]: unknown
}

export function appendTrace(projectRoot: string, workName: string, event: TraceEvent): void {
  const path = getTracePath(projectRoot, workName)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const line = `${JSON.stringify({ ...event, at: event.at || new Date().toISOString() })}\n`
  appendFileSync(path, line, 'utf-8')
}

export function readTrace(projectRoot: string, workName: string): TraceEvent[] {
  const path = getTracePath(projectRoot, workName)
  if (!existsSync(path)) return []
  const { readFileSync } = require('fs') as typeof import('fs')
  const content = readFileSync(path, 'utf-8')
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
}
