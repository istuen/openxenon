/**
 * infra/logging/logger.ts — LoggerPort consola 隔离层实现（ADR-0082 D2）
 *
 * 职责：
 *   - 代码库中**唯一** import consola 的文件
 *   - 将 LoggerPort 方法委托到 consola 的 debug/info/warn/error
 *   - 提供 createLogger 工厂 + 默认 loggerPort singleton
 *
 * 隔离层保证：切换 pino/winston 等其他日志库只需修改本文件
 */

import { createConsola, type ConsolaInstance } from 'consola'
import type { LoggerPort, LogLevel } from '../../kernel/index.ts'

const LEVEL_MAP: Record<LogLevel, number> = {
  debug: 5,
  info: 3,
  warn: 1,
  error: 0,
}

export interface CreateLoggerOptions {
  level?: LogLevel
  tag?: string
  consolaInstance?: ConsolaInstance
}

let sharedConsola: ConsolaInstance | null = null

function getConsola(level: LogLevel): ConsolaInstance {
  if (!sharedConsola) {
    sharedConsola = createConsola({
      level: LEVEL_MAP[level],
    })
  }
  return sharedConsola
}

export function createLogger(options: CreateLoggerOptions = {}): LoggerPort {
  const { level = 'warn', tag, consolaInstance } = options

  function emit(methodLevel: LogLevel, message: string, data?: Record<string, unknown>): void {
    const consola = consolaInstance ?? getConsola(level)
    const tagged = tag ? consola.withTag(tag) : consola
    const payload = data ?? {}
    switch (methodLevel) {
      case 'debug':
        tagged.debug(message, payload)
        break
      case 'info':
        tagged.info(message, payload)
        break
      case 'warn':
        tagged.warn(message, payload)
        break
      case 'error':
        tagged.error(message, payload)
        break
    }
  }

  return {
    debug: (message, data) => emit('debug', message, data),
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),
    error: (message, data) => emit('error', message, data),
    withTag: (newTag) => createLogger({ ...options, tag: newTag }),
  }
}

/**
 * 默认 loggerPort singleton（L2 函数未注入 logger 时使用）
 * 默认 level='warn'，可通过 OXN_LOG_LEVEL 环境变量覆盖
 */
export const loggerPort: LoggerPort = (() => {
  const envLevel = (process.env.OXN_LOG_LEVEL ?? 'warn') as LogLevel
  return createLogger({ level: envLevel })
})()
