/**
 * LoggerPort — L0-Contract 接口（ADR-0082 Diagnostic 统一）
 *
 * LoggerPort 是 L0-Kernel 暴露给 L1/L2/L3 的统一日志接口。
 * L1-Infra（infra/logging/logger.ts）实现此接口，封装 consola。
 * 业务代码（L2 Work / Asset 等）只 import 此接口，不直接 import consola。
 *
 * 设计原则：
 *   - Error 与 Log 分家（ADR-0081 vs ADR-0082）：
 *     - Error 是 throw + machine routing（IAPErrorCode）
 *     - Log 是 stdout/stderr/file 记录（无 code，仅 message + tag + data）
 *   - 无 code 字段：code 是 Error 体系专属概念
 *   - withTag：创建带模块标签的子 logger（追溯代码位置）
 *   - LogLevel 四档：debug / info / warn / error
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  tag?: string
  data?: Record<string, unknown>
  date?: Date
}

export interface LoggerPort {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  withTag(tag: string): LoggerPort
}
