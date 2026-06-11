import { appendFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, DEBUG_LOG_FILE } from '../kernel/index'

export function getDebugLogPath(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR, DEBUG_LOG_FILE)
}

export function isDebugEnabled(projectRoot: string): boolean {
  const configPath = join(projectRoot, BOUNDARY_DIR, 'config.json')
  try {
    if (!existsSync(configPath)) return false
    const content = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(content)
    return config.debug === true
  } catch {
    return false
  }
}

export function debugLog(projectRoot: string, message: string): void {
  if (!isDebugEnabled(projectRoot)) return

  const logPath = getDebugLogPath(projectRoot)
  const timestamp = new Date().toISOString()
  const entry = `[${timestamp}] ${message}\n`

  try {
    appendFileSync(logPath, entry, 'utf-8')
  } catch (err) {
    console.error(`Failed to write debug log: ${err}`)
  }
}

export function debugLogStart(projectRoot: string, taskId: string, partId: string): void {
  debugLog(projectRoot, `TASK_START taskId=${taskId} partId=${partId}`)
}

export function debugLogEnd(projectRoot: string, taskId: string, partId: string, success: boolean): void {
  debugLog(projectRoot, `TASK_END taskId=${taskId} partId=${partId} success=${success}`)
}

export function debugLogError(projectRoot: string, err: unknown): void {
  const errorMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
  debugLog(projectRoot, `ERROR ${errorMsg}`)
}
