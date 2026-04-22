import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import { createServer } from 'net'
import { initProjectDb, closeDb } from '../../src/db/init'
import { startSocketServer, stopSocketServer } from '../../src/api/socket-server'
import { updateTaskStatus } from '../../src/db/operations/tasks'
import type { Blueprint } from '../../src/types'
import { socketRequest } from '../../src/api/socket-client'
import { DAEMON_SOCK_PATH } from '../../src/core/global'
import '../../src/api/handlers'

const testDir = join(process.cwd(), 'test-temp-socket')
const testSocketPath = join(testDir, '.openxenon', 'test.sock')

describe('Task Execution API (Socket)', () => {
  let db: Database
  let taskId: string
  let socketPath: string

  beforeAll(async () => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
      mkdirSync(join(testDir, '.openxenon'), { recursive: true })
    }
    
    socketPath = testSocketPath
    
    db = initProjectDb(join(testDir, '.openxenon', 'project.oxn'))

    const dbPath = join(testDir, '.openxenon', 'project.oxn')
    console.log('DB path:', dbPath, 'exists:', existsSync(dbPath))
    
    startSocketServer(socketPath)
    
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(() => {
    stopSocketServer()
    if (db) closeDb(db)
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const response = await socketRequest(socketPath, 'GET', '/api/v1/health')
      
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: 'ok' })
    })
  })

  describe('Task Submit', () => {
    it('should create task and stages', async () => {
      const blueprint: Blueprint = {
        task: 'Test Task',
        stages: [
          { id: 'stage-1', name: 'Stage 1', spec: { constraints: ['Spec 1'] }, proof: 'proof-1' },
          { id: 'stage-2', name: 'Stage 2', spec: { constraints: ['Spec 2'] }, proof: 'proof-2' }
        ]
      }

      const response = await socketRequest(
        socketPath,
        'POST',
        '/api/v1/task/submit',
        { task: blueprint.task, steps: blueprint.stages },
        testDir
      )

      const data: any = response.body
      
      if (response.status !== 200) {
        console.log('Error:', data)
      }

      expect(response.status).toBe(200)
      expect(data.taskId).toBeDefined()
      taskId = data.taskId
    })
  })

  describe('Task Start', () => {
    it('should start a task', async () => {
      if (!taskId) return

      const response = await socketRequest(
        socketPath,
        'POST',
        '/api/v1/task/start',
        { taskId: taskId },
        testDir
      )

      const data: any = response.body
      
      expect(response.status).toBe(200)
      expect(data.taskId).toBe(taskId)
      expect(data.status).toBe('RUNNING')
    })
  })

  describe('Task Status', () => {
    it('should return task status', async () => {
      if (!taskId) return

      const response = await socketRequest(
        socketPath,
        'GET',
        `/api/v1/task/status?taskId=${taskId}`,
        undefined,
        testDir
      )

      const data: any = response.body
      
      expect(response.status).toBe(200)
      expect(data.taskId).toBe(taskId)
      expect(data.status).toBe('RUNNING')
    })
  })

  describe('Task Next', () => {
    it('should return next pending stage', async () => {
      if (!taskId) return

      const response = await socketRequest(
        socketPath,
        'GET',
        `/api/v1/task/next?taskId=${taskId}`,
        undefined,
        testDir
      )

      const data: any = response.body
      
      expect(response.status).toBe(200)
      expect(data.stage).toBeDefined()
    })
  })

  describe('Stage Start', () => {
    it('should start a stage by ID', async () => {
      if (!taskId) return

      const response = await socketRequest(
        socketPath,
        'POST',
        '/api/v1/step/start',
        { taskId, stepId: `${taskId}-1` },
        testDir
      )

      const data: any = response.body
      
      expect(response.status).toBe(200)
      expect(data.stepId).toBe(`${taskId}-1`)
    })
  })
})