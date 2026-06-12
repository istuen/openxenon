import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { CircuitBreaker, type CircuitBreakerConfig } from '../../../src/daemon/circuit-breaker'

// 5ms reset window keeps wall-time low while still exercising the actual
// setTimeout in trip().  1100ms (the prior value) was spending 4×~1.1s = 4.4s
// of real time across the trip-recovery suite.
const FAST_RESET_MS = 5

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: FAST_RESET_MS,
      halfOpenMaxAttempts: 2,
    })
  })

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })

    it('has zero failure count', () => {
      expect(circuitBreaker.getStats().failureCount).toBe(0)
    })
  })

  describe('recordSuccess', () => {
    it('decrements failure count in CLOSED state', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordSuccess()
      expect(circuitBreaker.getStats().failureCount).toBe(1)
    })

    it('does not decrement below zero', () => {
      circuitBreaker.recordSuccess()
      expect(circuitBreaker.getStats().failureCount).toBe(0)
    })

    it('updates lastSuccessTime', () => {
      const before = Date.now()
      circuitBreaker.recordSuccess()
      const after = Date.now()
      const lastSuccess = circuitBreaker.getStats().lastSuccessTime
      expect(lastSuccess!).toBeGreaterThanOrEqual(before)
      expect(lastSuccess!).toBeLessThanOrEqual(after)
    })
  })

  describe('recordFailure', () => {
    it('increments failure count', () => {
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getStats().failureCount).toBe(1)
    })

    it('resets success count', () => {
      circuitBreaker.recordSuccess()
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getStats().successCount).toBe(0)
    })

    it('trips to OPEN when threshold reached', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getState()).toBe('OPEN')
    })
  })

  describe('trip recovery', () => {
    it('transitions to HALF_OPEN after reset timeout', async () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()

      expect(circuitBreaker.getState()).toBe('OPEN')

      await new Promise((resolve) => setTimeout(resolve, FAST_RESET_MS + 5))
      expect(circuitBreaker.getState()).toBe('HALF_OPEN')
    })

    it('returns to CLOSED after successful recovery in HALF_OPEN', async () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()

      await new Promise((resolve) => setTimeout(resolve, FAST_RESET_MS + 5))
      expect(circuitBreaker.getState()).toBe('HALF_OPEN')

      circuitBreaker.recordSuccess()
      circuitBreaker.recordSuccess()
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })

    it('trips back to OPEN on failure in HALF_OPEN', async () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()

      await new Promise((resolve) => setTimeout(resolve, FAST_RESET_MS + 5))
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getState()).toBe('OPEN')
    })
  })

  describe('allowRequest', () => {
    it('allows request in CLOSED state', () => {
      expect(circuitBreaker.allowRequest()).toBe(true)
    })

    it('allows request in HALF_OPEN state', async () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()

      await new Promise((resolve) => setTimeout(resolve, FAST_RESET_MS + 5))
      expect(circuitBreaker.allowRequest()).toBe(true)
    })

    it('denies request in OPEN state', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      expect(circuitBreaker.allowRequest()).toBe(false)
    })
  })

  describe('forceClose', () => {
    it('resets to CLOSED state', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getState()).toBe('OPEN')

      circuitBreaker.forceClose()
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })

    it('resets failure count', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.forceClose()
      expect(circuitBreaker.getStats().failureCount).toBe(0)
    })
  })

  describe('forceOpen', () => {
    it('immediately opens the circuit', () => {
      circuitBreaker.forceOpen()
      expect(circuitBreaker.getState()).toBe('OPEN')
      expect(circuitBreaker.allowRequest()).toBe(false)
    })
  })

  describe('isOpen', () => {
    it('returns true when OPEN', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      expect(circuitBreaker.isOpen()).toBe(true)
    })

    it('returns false when CLOSED', () => {
      expect(circuitBreaker.isOpen()).toBe(false)
    })

    it('returns false when HALF_OPEN', async () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()

      await new Promise((resolve) => setTimeout(resolve, FAST_RESET_MS + 5))
      expect(circuitBreaker.isOpen()).toBe(false)
    })
  })
})
