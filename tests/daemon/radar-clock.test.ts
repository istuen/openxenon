import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { RadarClock } from '../../src/daemon/radar/clock'

const TEST_WORKDIR = '/tmp/oxn-radar-test'

describe('RadarClock', () => {
  let radarClock: RadarClock

  beforeEach(() => {
    radarClock = new RadarClock()
    mkdirSync(TEST_WORKDIR, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
  })

  describe('startMonitor', () => {
    it('creates a radar entry for the given task and stage', () => {
      radarClock.startMonitor('task-1', 'stage-1', 5000)
      expect(radarClock.isTimeout('task-1', 'stage-1')).toBe(false)
    })

    it('overwrites existing entry with same task:stage key', () => {
      radarClock.startMonitor('task-1', 'stage-1', 5000)
      radarClock.startMonitor('task-1', 'stage-1', 10000)
      expect(radarClock.getRemaining('task-1', 'stage-1')).toBeGreaterThanOrEqual(9000)
    })
  })

  describe('stopMonitor', () => {
    it('removes the radar entry', () => {
      radarClock.startMonitor('task-1', 'stage-1', 5000)
      radarClock.stopMonitor('task-1', 'stage-1')
      expect(radarClock.isTimeout('task-1', 'stage-1')).toBe(false)
    })
  })

  describe('isTimeout', () => {
    it('returns false before timeout expires', () => {
      radarClock.startMonitor('task-1', 'stage-1', 5000)
      expect(radarClock.isTimeout('task-1', 'stage-1')).toBe(false)
    })

    it('returns true after timeout expires', async () => {
      radarClock.startMonitor('task-1', 'stage-1', 50)
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(radarClock.isTimeout('task-1', 'stage-1')).toBe(true)
    })

    it('returns false for non-existent entry', () => {
      expect(radarClock.isTimeout('nonexistent', 'stage')).toBe(false)
    })
  })

  describe('getElapsed', () => {
    it('returns elapsed time in milliseconds', async () => {
      radarClock.startMonitor('task-1', 'stage-1', 10000)
      await new Promise((resolve) => setTimeout(resolve, 100))
      const elapsed = radarClock.getElapsed('task-1', 'stage-1')
      expect(elapsed).toBeGreaterThanOrEqual(100)
    })

    it('returns 0 for non-existent entry', () => {
      expect(radarClock.getElapsed('nonexistent', 'stage')).toBe(0)
    })
  })

  describe('getRemaining', () => {
    it('returns remaining time before timeout', async () => {
      radarClock.startMonitor('task-1', 'stage-1', 5000)
      await new Promise((resolve) => setTimeout(resolve, 100))
      const remaining = radarClock.getRemaining('task-1', 'stage-1')
      expect(remaining).toBeLessThanOrEqual(4900)
    })

    it('returns 0 for non-existent entry', () => {
      expect(radarClock.getRemaining('nonexistent', 'stage')).toBe(0)
    })

    it('returns 0 after timeout expired', async () => {
      radarClock.startMonitor('task-1', 'stage-1', 50)
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(radarClock.getRemaining('task-1', 'stage-1')).toBe(0)
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      radarClock.startMonitor('task-1', 'stage-1', 5000)
      radarClock.startMonitor('task-2', 'stage-2', 5000)
      radarClock.clear()
      expect(radarClock.getRemaining('task-1', 'stage-1')).toBe(0)
      expect(radarClock.getRemaining('task-2', 'stage-2')).toBe(0)
    })
  })
})
