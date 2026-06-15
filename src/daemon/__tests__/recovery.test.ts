import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createRecoveryManager } from '../../../src/daemon/trace/recovery'

const TEST_WORKDIR = '/tmp/oxn-recovery-test'

describe('RecoveryManager', () => {
  let recoveryManager: ReturnType<typeof createRecoveryManager>
  let taskId: string

  beforeEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
    mkdirSync(join(TEST_WORKDIR, '.openxenon', 'tasks', 'test-task'), { recursive: true })
    writeFileSync(
      join(TEST_WORKDIR, '.openxenon', 'tasks', 'test-task', 'state.json'),
      JSON.stringify({ status: 'RUNNING' }),
    )
    writeFileSync(join(TEST_WORKDIR, '.openxenon', 'tasks', 'test-task', 'artifact.json'), JSON.stringify({}))

    taskId = 'test-task'
    recoveryManager = createRecoveryManager(
      {
        maxRecoveryPoints: 5,
        autoCheckpointIntervalMs: 1000,
      },
      TEST_WORKDIR,
    )
  })

  afterEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
  })

  describe('createRecoveryPoint', () => {
    it('creates a recovery point and saves to disk', () => {
      const rp = recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      expect(rp).not.toBeNull()
      expect(rp!.taskId).toBe(taskId)
      expect(rp!.partId).toBe('stage-1')
      expect(existsSync(join(TEST_WORKDIR, '.openxenon', 'tasks', taskId, 'recovery', 'index.json'))).toBe(true)
    })

    it('returns null when state.json does not exist', () => {
      rmSync(join(TEST_WORKDIR, '.openxenon', 'tasks', taskId, 'state.json'), { force: true })
      const rp = recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      expect(rp).toBeNull()
    })

    it('limits recovery points to maxRecoveryPoints', () => {
      for (let i = 0; i < 7; i++) {
        recoveryManager.createRecoveryPoint(taskId, `stage-${i}`)
      }
      const points = recoveryManager.getRecoveryPoints(taskId)
      expect(points.length).toBe(5)
    })
  })

  describe('getRecoveryPoints', () => {
    it('returns empty array when no recovery points exist', () => {
      const points = recoveryManager.getRecoveryPoints(taskId)
      expect(points).toEqual([])
    })

    it('loads existing recovery points from disk', () => {
      recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      const freshManager = createRecoveryManager({}, TEST_WORKDIR)
      const points = freshManager.getRecoveryPoints(taskId)
      expect(points.length).toBe(1)
    })
  })

  describe('getLatestRecoveryPoint', () => {
    it('returns the most recent recovery point', () => {
      recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      recoveryManager.createRecoveryPoint(taskId, 'stage-2')
      const latest = recoveryManager.getLatestRecoveryPoint(taskId)
      expect(latest!.partId).toBe('stage-2')
    })

    it('returns null when no recovery points exist', () => {
      const latest = recoveryManager.getLatestRecoveryPoint(taskId)
      expect(latest).toBeNull()
    })
  })

  describe('rollbackTo', () => {
    it('rolls back state.json to target recovery point', () => {
      recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      const points = recoveryManager.getRecoveryPoints(taskId)
      const targetId = points[0].id

      writeFileSync(
        join(TEST_WORKDIR, '.openxenon', 'tasks', taskId, 'state.json'),
        JSON.stringify({ status: 'MODIFIED' }),
      )

      const success = recoveryManager.rollbackTo(taskId, targetId)
      expect(success).toBe(true)
      const restoredContent = JSON.parse(
        readFileSync(join(TEST_WORKDIR, '.openxenon', 'tasks', taskId, 'state.json'), 'utf-8'),
      )
      expect(restoredContent.status).toBe('RUNNING')
    })

    it('returns false when recovery point does not exist', () => {
      const success = recoveryManager.rollbackTo(taskId, 'nonexistent-id')
      expect(success).toBe(false)
    })
  })

  describe('retry', () => {
    it('returns true and logs retry info when recovery points exist', () => {
      recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      const success = recoveryManager.retry(taskId)
      expect(success).toBe(true)
    })

    it('returns false when no recovery points exist', () => {
      const success = recoveryManager.retry(taskId)
      expect(success).toBe(false)
    })

    it('returns false when task is already completed', () => {
      recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      writeFileSync(
        join(TEST_WORKDIR, '.openxenon', 'tasks', taskId, 'state.json'),
        JSON.stringify({ status: 'COMPLETED' }),
      )
      const success = recoveryManager.retry(taskId)
      expect(success).toBe(false)
    })

    it('returns false when task has failed', () => {
      recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      writeFileSync(
        join(TEST_WORKDIR, '.openxenon', 'tasks', taskId, 'state.json'),
        JSON.stringify({ status: 'FAILED' }),
      )
      const success = recoveryManager.retry(taskId)
      expect(success).toBe(false)
    })
  })

  describe('clearRecoveryPoints', () => {
    it('removes all recovery points for a task', () => {
      recoveryManager.createRecoveryPoint(taskId, 'stage-1')
      recoveryManager.createRecoveryPoint(taskId, 'stage-2')
      recoveryManager.clearRecoveryPoints(taskId)
      const points = recoveryManager.getRecoveryPoints(taskId)
      expect(points).toEqual([])
    })
  })
})
