import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DaemonSupervisor } from '../../../src/daemon/supervisor'
import { DAEMON_PID_PATH } from '@openxenon/engine/infra/global'

const TEST_PID_PATH = '/tmp/oxn-supervisor-test.pid'
const TEST_STATE_PATH = '/tmp/oxn-supervisor-state.json'

describe('DaemonSupervisor', () => {
  let supervisor: DaemonSupervisor

  beforeEach(() => {
    if (existsSync(TEST_PID_PATH)) {
      unlinkSync(TEST_PID_PATH)
    }
    if (existsSync(TEST_STATE_PATH)) {
      unlinkSync(TEST_STATE_PATH)
    }
    supervisor = new DaemonSupervisor({ maxRestartAttempts: 3, restartDelayMs: 100 })
  })

  afterEach(() => {
    supervisor.destroy()
    if (existsSync(TEST_PID_PATH)) {
      unlinkSync(TEST_PID_PATH)
    }
    if (existsSync(TEST_STATE_PATH)) {
      unlinkSync(TEST_STATE_PATH)
    }
  })

  describe('initial state', () => {
    beforeEach(() => {
      const statePath = DAEMON_PID_PATH.replace('pid', 'supervisor-state')
      if (existsSync(statePath)) {
        unlinkSync(statePath)
      }
    })

    it('starts with isRunning false', () => {
      expect(supervisor.getState().isRunning).toBe(false)
    })

    it('starts with restartCount 0', () => {
      expect(supervisor.getState().restartCount).toBe(0)
    })
  })

  describe('isProcessRunning', () => {
    it('returns false for non-existent PID', () => {
      expect(supervisor.isProcessRunning(999999)).toBe(false)
    })

    it('returns true for current process', () => {
      expect(supervisor.isProcessRunning(process.pid)).toBe(true)
    })
  })

  describe('getState', () => {
    it('returns complete state', () => {
      const state = supervisor.getState()

      expect(state).toHaveProperty('isRunning')
      expect(state).toHaveProperty('pid')
      expect(state).toHaveProperty('restartCount')
      expect(state).toHaveProperty('lastRestartTime')
    })
  })

  describe('resetRestartCount', () => {
    it('resets restart count to 0', () => {
      supervisor.startDaemon('./src/server.ts')

      const state = supervisor.getState()
      expect(state.restartCount).toBeGreaterThanOrEqual(1)

      supervisor.resetRestartCount()
      expect(supervisor.getState().restartCount).toBe(0)
    })
  })

  describe('destroy', () => {
    it('cleans up health check timer without error', () => {
      supervisor.startDaemon('./src/server.ts')
      supervisor.destroy()
    })
  })
})
