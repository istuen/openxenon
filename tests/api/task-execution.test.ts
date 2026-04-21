import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import { initProjectDb, closeDb } from '../../src/db/init'
import { startApiServer, stopApiServer } from '../../src/api/server'
import { updateTaskStatus } from '../../src/db/operations/tasks'
import type { Blueprint } from '../../src/types'
import '../../src/api/handlers'

const TEST_PORT = 8421
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`

describe('Task Execution API', () => {
  const testDir = join(process.cwd(), 'test-temp-api')
  let db: Database
  let taskId: string

  beforeAll(async () => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
      mkdirSync(join(testDir, '.xenonix'), { recursive: true })
    }
    
    db = initProjectDb(join(testDir, '.xenonix', 'project.db'))
    
    startApiServer({ port: TEST_PORT, hostname: '127.0.0.1' })
    
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(() => {
    stopApiServer()
    if (db) closeDb(db)
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/health`)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toEqual({ status: 'ok' })
    })
  })

  describe('Task Submit', () => {
    it('should create task and steps', async () => {
      const blueprint: Blueprint = {
        task: 'Test Task',
        steps: [
          { id: 'step-1', name: 'Step 1', spec: 'Spec 1', proof: 'proof-1' },
          { id: 'step-2', name: 'Step 2', spec: 'Spec 2', proof: 'proof-2' }
        ]
      }

      const response = await fetch(`${BASE_URL}/api/v1/task/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Path': testDir
        },
        body: JSON.stringify(blueprint)
      })

      const data: any = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.taskId).toBeDefined()
      expect(data.status).toBe('pending')
      expect(data.stepsCount).toBe(2)

      taskId = data.taskId
    })
  })

  describe('Task Start', () => {
    it('should start a pending task', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/task/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Path': testDir
        },
        body: JSON.stringify({ taskId })
      })

      const data: any = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('running')
    })
  })

  describe('Task Next', () => {
    it('should return next pending step', async () => {
      const response = await fetch(`${BASE_URL}/api/v1/task/next?taskId=${taskId}`, {
        headers: { 'X-Project-Path': testDir }
      })

      const data: any = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.stepId).toBeDefined()
      expect(data.name).toBe('Step 1')
      expect(data.status).toBe('pending')
    })
  })

  describe('Step Start', () => {
    it('should start a step by ID', async () => {
      const stepId = `${taskId}-1`
      
      const response = await fetch(`${BASE_URL}/api/v1/step/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Path': testDir
        },
        body: JSON.stringify({ stepId })
      })

      const data: any = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('running')
    })

    it('should start a step by name', async () => {
      updateTaskStatus(db, taskId, 'running')
      
      const response = await fetch(`${BASE_URL}/api/v1/step/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Path': testDir
        },
        body: JSON.stringify({ taskId, stepName: 'Step 2' })
      })

      const data: any = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('running')
    })
  })
})
