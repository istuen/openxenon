import { describe, it, expect, beforeEach } from 'bun:test'
import { CircuitBreaker } from '../../src/daemon/circuit-breaker'

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      halfOpenMaxAttempts: 2
    })
  })

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })

    it('allows requests when closed', () => {
      expect(circuitBreaker.allowRequest()).toBe(true)
    })

    it('is not open initially', () => {
      expect(circuitBreaker.isOpen()).toBe(false)
    })
  })

  describe('recordSuccess', () => {
    it('decrements failure count in CLOSED state', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getStats().failureCount).toBe(2)

      circuitBreaker.recordSuccess()
      expect(circuitBreaker.getStats().failureCount).toBe(1)
    })

    it('records lastSuccessTime', () => {
      circuitBreaker.recordSuccess()
      expect(circuitBreaker.getStats().lastSuccessTime).not.toBeNull()
    })
  })

  describe('recordFailure', () => {
    it('increments failure count', () => {
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getStats().failureCount).toBe(1)

      circuitBreaker.recordFailure()
      expect(circuitBreaker.getStats().failureCount).toBe(2)
    })

    it('records lastFailureTime', () => {
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getStats().lastFailureTime).not.toBeNull()
    })

    it('trips to OPEN after failureThreshold', () => {
      circuitBreaker.recordFailure()
      circuitBreaker.recordFailure()
      expect(circuitBreaker.getState()).toBe('CLOSED')

      circuitBreaker.recordFailure()
      expect(circuitBreaker.getState()).toBe('OPEN')
    })

    it('blocks requests when OPEN', () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }
      expect(circuitBreaker.allowRequest()).toBe(false)
      expect(circuitBreaker.isOpen()).toBe(true)
    })
  })

  describe('HALF_OPEN state', () => {
    it('transitions to HALF_OPEN after resetTimeout', async () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }
      expect(circuitBreaker.getState()).toBe('OPEN')

      await new Promise(resolve => setTimeout(resolve, 1100))
      expect(circuitBreaker.getState()).toBe('HALF_OPEN')
    })

    it('closes after successful recovery in HALF_OPEN', async () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }

      await new Promise(resolve => setTimeout(resolve, 1100))

      circuitBreaker.recordSuccess()
      circuitBreaker.recordSuccess()
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })

    it('trips again if failure in HALF_OPEN', async () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }

      await new Promise(resolve => setTimeout(resolve, 1100))

      circuitBreaker.recordFailure()
      expect(circuitBreaker.getState()).toBe('OPEN')
    })
  })

  describe('forceClose', () => {
    it('resets to CLOSED state', () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure()
      }
      expect(circuitBreaker.isOpen()).toBe(true)

      circuitBreaker.forceClose()
      expect(circuitBreaker.getState()).toBe('CLOSED')
      expect(circuitBreaker.allowRequest()).toBe(true)
    })
  })

  describe('forceOpen', () => {
    it('opens the circuit immediately', () => {
      circuitBreaker.forceOpen()
      expect(circuitBreaker.getState()).toBe('OPEN')
      expect(circuitBreaker.allowRequest()).toBe(false)
    })
  })

  describe('getStats', () => {
    it('returns complete stats', () => {
      const stats = circuitBreaker.getStats()

      expect(stats).toHaveProperty('failureCount')
      expect(stats).toHaveProperty('successCount')
      expect(stats).toHaveProperty('state')
      expect(stats).toHaveProperty('lastFailureTime')
      expect(stats).toHaveProperty('lastSuccessTime')
    })
  })
})