import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { getTracePath } from './state-io'

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
  const content = require('fs').readFileSync(path, 'utf-8')
  return content
    .split('\n')
    .filter((line: string) => line.trim().length > 0)
    .map((line: string) => JSON.parse(line))
}
