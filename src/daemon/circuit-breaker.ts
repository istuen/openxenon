import { daemonLogger } from './logger'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeoutMs: number
  halfOpenMaxAttempts: number
}

export interface CircuitBreakerStats {
  failureCount: number
  successCount: number
  state: CircuitState
  lastFailureTime: number | null
  lastSuccessTime: number | null
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 60000,
  halfOpenMaxAttempts: 1,
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig
  private state: CircuitState = 'CLOSED'
  private failureCount: number = 0
  private successCount: number = 0
  private lastFailureTime: number | null = null
  private lastSuccessTime: number | null = null
  private halfOpenAttempts: number = 0
  private resetTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  getState(): CircuitState {
    return this.state
  }

  getStats(): CircuitBreakerStats {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      state: this.state,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    }
  }

  recordSuccess(): void {
    this.lastSuccessTime = Date.now()

    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.config.halfOpenMaxAttempts) {
        this.close()
        daemonLogger.info('Circuit breaker closed after successful recovery')
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = Math.max(0, this.failureCount - 1)
    }
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now()
    this.failureCount++
    this.successCount = 0

    daemonLogger.warn(`Circuit breaker recorded failure #${this.failureCount}`)

    if (this.state === 'CLOSED') {
      if (this.failureCount >= this.config.failureThreshold) {
        this.trip()
      }
    } else if (this.state === 'HALF_OPEN') {
      this.trip()
    }
  }

  private trip(): void {
    this.state = 'OPEN'
    this.halfOpenAttempts = 0
    daemonLogger.error(`Circuit breaker tripped to OPEN state`)

    this.resetTimer = setTimeout(() => {
      this.state = 'HALF_OPEN'
      this.halfOpenAttempts++
      this.failureCount = 0
      this.successCount = 0
      daemonLogger.info(`Circuit breaker entering HALF_OPEN state (attempt ${this.halfOpenAttempts})`)
    }, this.config.resetTimeoutMs)
  }

  private close(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenAttempts = 0

    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }

    daemonLogger.info('Circuit breaker reset to CLOSED state')
  }

  isOpen(): boolean {
    return this.state === 'OPEN'
  }

  allowRequest(): boolean {
    return this.state !== 'OPEN'
  }

  forceClose(): void {
    this.close()
    daemonLogger.info('Circuit breaker force-closed')
  }

  forceOpen(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    this.state = 'OPEN'
    daemonLogger.info('Circuit breaker force-opened')
  }
}

export const taskCircuitBreaker = new CircuitBreaker()
