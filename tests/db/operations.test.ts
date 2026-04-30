import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { initProjectDb, closeDb } from '../../src/db/init'
import { getTaskDirectory, ensureTaskDirectory, TASK_BLUEPRINT_FILE, TASK_TRACE_FILE } from '../../src/lib/task-dir'
import { createTaskTrace, readTaskTrace, updateTaskStatus, addStageTrace, createStageTrace } from '../../src/lib/task-trace'
import { randomUUID } from 'crypto'

describe('Filesystem Operations (Task Trace)', () => {
  const testDir = join(process.cwd(), 'test-temp-fs')
  let db: ReturnType<typeof initProjectDb>

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
    db = initProjectDb(join(testDir, 'project.oxn'))
  })

  afterEach(() => {
    if (db) closeDb(db)
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Task Directory', () => {
    it('should create task directory', () => {
      const taskId = 'test-' + randomUUID().slice(0, 8)
      const taskDir = getTaskDirectory(testDir, taskId)

      expect(existsSync(taskDir.root)).toBe(false)

      ensureTaskDirectory(taskDir)

      expect(existsSync(taskDir.root)).toBe(true)
      expect(taskDir.blueprintPath).toContain(TASK_BLUEPRINT_FILE)
      expect(taskDir.tracePath).toContain(TASK_TRACE_FILE)
    })
  })

  describe('Task Trace Operations', () => {
    it('should create a task trace', () => {
      const taskId = 'test-' + randomUUID().slice(0, 8)
      const taskDir = getTaskDirectory(testDir, taskId)
      ensureTaskDirectory(taskDir)

      const trace = createTaskTrace(taskDir, taskId, 'Test Task')

      expect(trace.taskId).toBe(taskId)
      expect(trace.taskName).toBe('Test Task')
      expect(trace.status).toBe('RUNNING')
      expect(trace.stages).toEqual([])
      expect(existsSync(taskDir.tracePath)).toBe(true)
    })

    it('should read task trace', () => {
      const taskId = 'test-' + randomUUID().slice(0, 8)
      const taskDir = getTaskDirectory(testDir, taskId)
      ensureTaskDirectory(taskDir)

      createTaskTrace(taskDir, taskId, 'Test Task')

      const read = readTaskTrace(taskDir)

      expect(read).not.toBeNull()
      expect(read!.taskId).toBe(taskId)
      expect(read!.taskName).toBe('Test Task')
    })

    it('should update task status', () => {
      const taskId = 'test-' + randomUUID().slice(0, 8)
      const taskDir = getTaskDirectory(testDir, taskId)
      ensureTaskDirectory(taskDir)

      createTaskTrace(taskDir, taskId, 'Test Task')

      updateTaskStatus(taskDir, 'COMPLETED')

      const read = readTaskTrace(taskDir)
      expect(read!.status).toBe('COMPLETED')
      expect(read!.completedAt).toBeDefined()
    })

    it('should add stage trace', () => {
      const taskId = 'test-' + randomUUID().slice(0, 8)
      const taskDir = getTaskDirectory(testDir, taskId)
      ensureTaskDirectory(taskDir)

      createTaskTrace(taskDir, taskId, 'Test Task')

      const stageTrace = createStageTrace('stage-1', 'Stage One')
      addStageTrace(taskDir, stageTrace)

      const read = readTaskTrace(taskDir)
      expect(read!.stages).toHaveLength(1)
      expect(read!.stages[0].stageId).toBe('stage-1')
      expect(read!.stages[0].stageName).toBe('Stage One')
      expect(read!.stages[0].status).toBe('PENDING')
    })
  })
})

describe('Config Table', () => {
  const testDir = join(process.cwd(), 'test-temp-config')
  let db: ReturnType<typeof initProjectDb>

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
    db = initProjectDb(join(testDir, 'project.oxn'))
  })

  afterEach(() => {
    if (db) closeDb(db)
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should still support config table', () => {
    db.run('INSERT INTO config (key, value) VALUES (?, ?)', ['test.key', 'test.value'])

    const result = db.query('SELECT * FROM config WHERE key = ?').get('test.key') as { key: string; value: string } | undefined

    expect(result).toBeDefined()
    expect(result!.key).toBe('test.key')
    expect(result!.value).toBe('test.value')
  })
})