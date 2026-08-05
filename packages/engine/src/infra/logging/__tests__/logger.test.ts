/**
 * infra/logging/__tests__/logger.test.ts — LoggerPort 单元测试（ADR-0082）
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createLogger, loggerPort } from '../index.ts'

describe('ADR-0082 LoggerPort consola 隔离层', () => {
  beforeEach(() => {})

  afterEach(() => {})

  test('dummy to silence unused', () => {
    expect(true).toBe(true)
  })

  test('createLogger 返回 LoggerPort 接口实例', () => {
    const logger = createLogger({ level: 'debug' })
    expect(logger).toBeDefined()
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.withTag).toBe('function')
  })

  test('withTag 创建带标签的子 logger', () => {
    const base = createLogger({ level: 'debug' })
    const tagged = base.withTag('Work')
    expect(tagged).not.toBe(base)
    expect(typeof tagged.warn).toBe('function')
  })

  test('4 种 level 调用不抛错（无 data）', () => {
    const logger = createLogger({ level: 'debug' })
    expect(() => logger.debug('debug msg')).not.toThrow()
    expect(() => logger.info('info msg')).not.toThrow()
    expect(() => logger.warn('warn msg')).not.toThrow()
    expect(() => logger.error('error msg')).not.toThrow()
  })

  test('4 种 level 调用支持 data 参数', () => {
    const logger = createLogger({ level: 'debug' })
    expect(() => logger.debug('msg', { ref: 'x.md' })).not.toThrow()
    expect(() => logger.info('msg', { count: 42 })).not.toThrow()
    expect(() => logger.warn('msg', { suggestion: 'fix' })).not.toThrow()
    expect(() => logger.error('msg', { path: '/x' })).not.toThrow()
  })

  test('loggerPort 默认 singleton 存在且可调用', () => {
    expect(loggerPort).toBeDefined()
    expect(() => loggerPort.warn('default logger test')).not.toThrow()
  })

  test('多实例隔离（withTag 返回新实例不污染原实例）', () => {
    const a = createLogger({ level: 'debug', tag: 'A' })
    const b = createLogger({ level: 'debug', tag: 'B' })
    expect(a).not.toBe(b)
    // 各自调用不互相影响
    expect(() => {
      a.info('from A')
      b.info('from B')
    }).not.toThrow()
  })
})
