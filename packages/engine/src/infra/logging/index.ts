/**
 * infra/logging/index.ts — Barrel export（ADR-0082 D2）
 */

export { createLogger, loggerPort } from './logger.ts'
export type { CreateLoggerOptions } from './logger.ts'
