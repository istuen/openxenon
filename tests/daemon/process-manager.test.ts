import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { ProcessManager } from '../../src/daemon/process-manager'
import { spawn } from 'child_process'

describe('ProcessManager', () => {
  let processManager: ProcessManager

  beforeEach(() => {
    processManager = new ProcessManager()
  })

  afterEach(() => {
    processManager.killAll()
  })

  describe('spawn', () => {
    it('spawns a process and tracks it', () => {
      const proc = processManager.spawn('task-1', 'stage-1', 'sleep', ['10'])
      expect(proc).not.toBeNull()
      expect(proc!.taskId).toBe('task-1')
      expect(proc!.stageId).toBe('stage-1')
      expect(proc!.status).toBe('running')
      expect(proc!.pid).toBeGreaterThan(0)
    })

    it('returns null if process already running', () => {
      processManager.spawn('task-1', 'stage-1', 'sleep', ['10'])
      const second = processManager.spawn('task-1', 'stage-1', 'sleep', ['10'])
      expect(second).toBeNull()
    })
  })

  describe('kill', () => {
    it('kills a running process', async () => {
      const proc = processManager.spawn('task-1', 'stage-1', 'sleep', ['30'])
      expect(proc).not.toBeNull()

      const killed = processManager.kill('task-1', 'stage-1')
      expect(killed).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 100))

      const retrieved = processManager.get('task-1', 'stage-1')
      expect(retrieved?.status).toBe('stopped')
    })

    it('returns false if no process found', () => {
      const killed = processManager.kill('nonexistent', 'stage')
      expect(killed).toBe(false)
    })
  })

  describe('killAll', () => {
    it('kills all tracked processes', () => {
      processManager.spawn('task-1', 'stage-1', 'sleep', ['30'])
      processManager.spawn('task-2', 'stage-2', 'sleep', ['30'])

      processManager.killAll()

      const all = processManager.getAll()
      expect(all.length).toBe(0)
    })
  })

  describe('get', () => {
    it('returns process by taskId and stageId', () => {
      processManager.spawn('task-1', 'stage-1', 'sleep', ['10'])
      const proc = processManager.get('task-1', 'stage-1')
      expect(proc).not.toBeUndefined()
      expect(proc!.taskId).toBe('task-1')
    })

    it('returns undefined for non-existent', () => {
      const proc = processManager.get('nonexistent', 'stage')
      expect(proc).toBeUndefined()
    })
  })

  describe('markTimeout', () => {
    it('kills process when marking timeout', async () => {
      processManager.spawn('task-1', 'stage-1', 'sleep', ['30'])

      const marked = processManager.markTimeout('task-1', 'stage-1')
      expect(marked).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 200))

      const proc = processManager.get('task-1', 'stage-1')
      expect(proc?.status).toMatch(/stopped|timeout/)
    })

    it('returns false for non-existent process', () => {
      const marked = processManager.markTimeout('nonexistent', 'stage')
      expect(marked).toBe(false)
    })
  })

  describe('remove', () => {
    it('removes process from tracking', () => {
      processManager.spawn('task-1', 'stage-1', 'sleep', ['10'])
      const removed = processManager.remove('task-1', 'stage-1')
      expect(removed).toBe(true)

      const retrieved = processManager.get('task-1', 'stage-1')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('returns all tracked processes', () => {
      processManager.spawn('task-1', 'stage-1', 'sleep', ['10'])
      processManager.spawn('task-2', 'stage-2', 'sleep', ['10'])

      const all = processManager.getAll()
      expect(all.length).toBe(2)
    })

    it('returns empty array when no processes', () => {
      const all = processManager.getAll()
      expect(all).toEqual([])
    })
  })
})