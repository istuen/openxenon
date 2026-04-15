import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { initProjectDb, closeDb } from '../../src/db/init'
import { createTask, getTaskById, updateTaskStatus, deleteTask } from '../../src/db/operations/tasks'
import { createStep, getStepsByTaskId, updateStepStatus } from '../../src/db/operations/steps'
import type { Playbook } from '../../src/types'

describe('Database Operations', () => {
  const testDir = join(process.cwd(), 'test-temp')
  let db: Database

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
    db = initProjectDb(join(testDir, 'project.db'))
  })

  afterEach(() => {
    if (db) closeDb(db)
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Tasks Operations', () => {
    it('should create a task', () => {
      const playbook: Playbook = {
        task: 'Test Task',
        steps: []
      }
      
      const task = createTask(db, 'Test Task', playbook)
      
      expect(task.id).toBeDefined()
      expect(task.name).toBe('Test Task')
      expect(task.status).toBe('pending')
    })

    it('should get task by id', () => {
      const playbook: Playbook = { task: 'Test', steps: [] }
      const created = createTask(db, 'Test Task', playbook)
      
      const found = getTaskById(db, created.id)
      
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test Task')
    })

    it('should update task status', () => {
      const playbook: Playbook = { task: 'Test', steps: [] }
      const created = createTask(db, 'Test Task', playbook)
      
      const updated = updateTaskStatus(db, created.id, 'running')
      
      expect(updated?.status).toBe('running')
    })

    it('should delete a task', () => {
      const playbook: Playbook = { task: 'Test', steps: [] }
      const created = createTask(db, 'Test Task', playbook)
      
      const result = deleteTask(db, created.id)
      
      expect(result).toBe(true)
      expect(getTaskById(db, created.id)).toBeNull()
    })
  })

  describe('Steps Operations', () => {
    it('should create a step', () => {
      const playbook: Playbook = { task: 'Test', steps: [] }
      const task = createTask(db, 'Test Task', playbook)
      
      const step = createStep(db, 'step-1', task.id, 'Step 1', 'Do something', 'proof-1')
      
      expect(step.id).toBe('step-1')
      expect(step.taskId).toBe(task.id)
      expect(step.status).toBe('pending')
    })

    it('should get steps by task id', () => {
      const playbook: Playbook = { task: 'Test', steps: [] }
      const task = createTask(db, 'Test Task', playbook)
      
      createStep(db, 'step-1', task.id, 'Step 1', 'Spec 1', 'proof-1')
      createStep(db, 'step-2', task.id, 'Step 2', 'Spec 2', 'proof-2')
      
      const steps = getStepsByTaskId(db, task.id)
      
      expect(steps.length).toBe(2)
    })

    it('should update step status', () => {
      const playbook: Playbook = { task: 'Test', steps: [] }
      const task = createTask(db, 'Test Task', playbook)
      const step = createStep(db, 'step-1', task.id, 'Step 1', 'Spec 1', 'proof-1')
      
      const updated = updateStepStatus(db, step.id, 'passed')
      
      expect(updated?.status).toBe('passed')
      expect(updated?.completedAt).toBeDefined()
    })
  })
})
