import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { DAEMON_LOG_PATH, GLOBAL_BOUNDARY_PATH } from '../core/global'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface Logger {
  debug(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

function ensureLogDirectory(): void {
  if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
    mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
  }
}

export function log(level: LogLevel, message: string): void {
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] ${level}: ${message}\n`
  
  console.log(logLine.trimEnd())
  
  try {
    ensureLogDirectory()
    appendFileSync(DAEMON_LOG_PATH, logLine, 'utf-8')
  } catch (error) {
    console.error(`Failed to write to log file: ${error}`)
  }
}

export function createLogger(prefix: string): Logger {
  return {
    debug(message: string): void {
      log('DEBUG', `[${prefix}] ${message}`)
    },
    info(message: string): void {
      log('INFO', `[${prefix}] ${message}`)
    },
    warn(message: string): void {
      log('WARN', `[${prefix}] ${message}`)
    },
    error(message: string): void {
      log('ERROR', `[${prefix}] ${message}`)
    }
  }
}

export const daemonLogger = createLogger('Daemon')
