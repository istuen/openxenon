import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { RecoveryManager } from '../../src/daemon/recovery'
import { join } from 'path'
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { getProjectBoundaryPath } from '../../src/kernel'

const TEST_WORKDIR = '/tmp/oxn-recovery-test'

describe('RecoveryManager', () => {
  let recoveryManager: RecoveryManager

  beforeEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
    mkdirSync(TEST_WORKDIR, { recursive: true })
    mkdirSync(join(TEST_WORKDIR, '.openxenon', 'tasks', 'test-task'), { recursive: true })

    writeFileSync(join(TEST_WORKDIR, '.openxenon', 'tasks', 'test-task', 'state.json'), JSON.stringify({
      taskId: 'test-task',
      status: 'RUNNING'
    }))
    writeFileSync(join(TEST_WORKDIR, '.openxenon', 'tasks', 'test-task', 'artifact.json'), JSON.stringify({}))

    process.chdir(TEST_WORKDIR)
    recoveryManager = new RecoveryManager({ maxRecoveryPoints: 3 })
  })

  afterEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
    process.chdir('/Users/issac/pro/openxenon')
  })

  describe('createRecoveryPoint', () => {
    it('creates recovery point for task', () => {
      const recoveryPoint = recoveryManager.createRecoveryPoint('test-task', 'stage-1', { test: true })

      expect(recoveryPoint).not.toBeNull()
      expect(recoveryPoint!.taskId).toBe('test-task')
      expect(recoveryPoint!.stageId).toBe('stage-1')
      expect(recoveryPoint!.id).toMatch(/^rp-/)
    })

    it('returns null when state.json does not exist', () => {
      rmSync(join(TEST_WORKDIR, '.openxenon', 'tasks', 'test-task', 'state.json'))
      const result = recoveryManager.createRecoveryPoint('test-task', 'stage-1')
      expect(result).toBeNull()
    })
  })

  describe('getRecoveryPoints', () => {
    it('returns empty array for non-existent task', () => {
      const points = recoveryManager.getRecoveryPoints('nonexistent-task')
      expect(points).toEqual([])
    })

    it('returns recovery points for task', () => {
      recoveryManager.createRecoveryPoint('test-task', 'stage-1')
      recoveryManager.createRecoveryPoint('test-task', 'stage-2')

      const points = recoveryManager.getRecoveryPoints('test-task')
      expect(points.length).toBe(2)
    })
  })

  describe('getLatestRecoveryPoint', () => {
    it('returns null when no recovery points exist', () => {
      const latest = recoveryManager.getLatestRecoveryPoint('test-task')
      expect(latest).toBeNull()
    })

    it('returns the most recent recovery point', () => {
      recoveryManager.createRecoveryPoint('test-task', 'stage-1')
      recoveryManager.createRecoveryPoint('test-task', 'stage-2')

      const latest = recoveryManager.getLatestRecoveryPoint('test-task')
      expect(latest!.stageId).toBe('stage-2')
    })
  })

  describe('maxRecoveryPoints limit', () => {
    it('removes oldest when exceeding maxRecoveryPoints', () => {
      for (let i = 0; i < 5; i++) {
        recoveryManager.createRecoveryPoint('test-task', `stage-${i}`)
      }

      const points = recoveryManager.getRecoveryPoints('test-task')
      expect(points.length).toBe(3)
    })
  })
})