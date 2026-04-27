import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync, cpSync } from 'fs'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import { initProjectDb, closeDb } from '../src/db/init'
import { startSocketServer, stopSocketServer } from '../src/api/socket-server'
import { socketRequest } from '../src/api/socket-client'
import { updateTaskStatus } from '../src/db/operations/tasks'
import { loadBlueprintFromYaml, resolveBlueprintPath } from '../src/core/blueprint-loader'
import { saveBlueprintToYaml } from '../src/core/blueprint-persister'
import { StagingManager } from '../src/core/staging'
import { type Blueprint } from '../src/types/arsenal/blueprint'
import '../src/api/handlers'

const testDir = join(process.cwd(), 'test-temp-mvp-01')
const testSocketPath = join(testDir, '.openxenon', 'test.sock')

const SAMPLE_BLUEPRINT: Blueprint = {
  id: 'bp_001',
  name: 'user-module',
  status: 'CANONICAL',
  stages: [
    {
      id: 's1',
      name: '创建用户模型',
      deps: [],
      proof: {
        target: {
          description: 'User 模型文件必须存在于 src/models/',
          glob: 'src/models/User.ts'
        },
        spec: {
          description: '必须使用 TypeScript class 语法',
          constraints: ['MUST use class User']
        },
        probes: [
          { type: 'fs_exists', pattern: 'src/models/User.ts' }
        ]
      }
    },
    {
      id: 's2',
      name: '创建用户服务',
      deps: ['s1'],
      proof: {
        target: {
          description: 'UserService 文件必须存在',
          glob: 'src/services/UserService.ts'
        },
        spec: {
          description: '必须导出 UserService 类',
          constraints: ['MUST export class UserService']
        },
        probes: [
          { type: 'fs_exists', pattern: 'src/services/UserService.ts' }
        ]
      }
    }
  ]
}

describe('MVP 0.1: Blueprint Storage & Staging', () => {
  let db: Database
  let taskId: string
  let socketPath: string

  beforeAll(async () => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
    mkdirSync(testDir, { recursive: true })
    mkdirSync(join(testDir, '.openxenon'), { recursive: true })
    mkdirSync(join(testDir, 'src', 'models'), { recursive: true })
    mkdirSync(join(testDir, 'src', 'services'), { recursive: true })

    socketPath = testSocketPath
    db = initProjectDb(join(testDir, '.openxenon', 'project.oxn'))
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

  describe('1. StagingManager', () => {
    const stagingTaskId = 'staging-test'
    let staging: StagingManager

    beforeEach(() => {
      mkdirSync(join(testDir, '.openxenon', 'tasks', stagingTaskId), { recursive: true })
      staging = new StagingManager(testDir, stagingTaskId)
    })

    it('should create staging directory on ensureStagingDir', () => {
      expect(existsSync(staging.getStagingPath())).toBe(false)
      staging.ensureStagingDir()
      expect(existsSync(staging.getStagingPath())).toBe(true)
    })

    it('should cleanup staging directory', () => {
      staging.ensureStagingDir()
      writeFileSync(join(staging.getStagingPath(), 'test.txt'), 'test')
      expect(existsSync(join(staging.getStagingPath(), 'test.txt'))).toBe(true)

      staging.cleanup()
      expect(existsSync(staging.getStagingPath())).toBe(false)
    })

    it('should move staging files to src', () => {
      staging.ensureStagingDir()

      mkdirSync(join(staging.getStagingPath(), 'src', 'models'), { recursive: true })
      writeFileSync(
        join(staging.getStagingPath(), 'src', 'models', 'User.ts'),
        'export class User {}'
      )

      staging.moveToSrc()

      const userFile = join(testDir, 'src', 'models', 'User.ts')
      expect(existsSync(userFile)).toBe(true)
      expect(readFileSync(userFile, 'utf-8')).toBe('export class User {}')
    })
  })

  describe('2. Blueprint Loader & Persister', () => {
    const taskIdForBp = 'bp-test-task'

    beforeEach(() => {
      mkdirSync(join(testDir, '.openxenon', 'tasks', taskIdForBp), { recursive: true })
    })

    it('should save and load blueprint from YAML', () => {
      saveBlueprintToYaml(testDir, taskIdForBp, SAMPLE_BLUEPRINT)

      const blueprintPath = resolveBlueprintPath(testDir, taskIdForBp)
      expect(existsSync(blueprintPath)).toBe(true)

      const loaded = loadBlueprintFromYaml(testDir, taskIdForBp)
      expect(loaded.id).toBe('bp_001')
      expect(loaded.name).toBe('user-module')
      expect(loaded.stages).toHaveLength(2)
      expect(loaded.stages[0].proof.target.description).toBe('User 模型文件必须存在于 src/models/')
      expect(loaded.stages[0].proof.probes[0].type).toBe('fs_exists')
    })
  })

  describe('3. API: Task Submit with Blueprint YAML', () => {
    it('should create task and save blueprint YAML', async () => {
      const response = await socketRequest(
        socketPath,
        'POST',
        '/api/v1/task/submit',
        {
          task: 'Test User Module',
          blueprint: SAMPLE_BLUEPRINT
        },
        testDir
      )

      expect(response.status).toBe(200)
      const data = response.body as any
      expect(data.taskId).toBeDefined()
      expect(data.blueprintFile).toContain('blueprint.json')

      taskId = data.taskId

      const blueprint = loadBlueprintFromYaml(testDir, taskId)
      expect(blueprint.name).toBe('user-module')
      expect(blueprint.stages).toHaveLength(2)
    })
  })

  describe('4. API: Task Next (YAML-based)', () => {
    beforeAll(async () => {
      if (!taskId) {
        const response = await socketRequest(
          socketPath,
          'POST',
          '/api/v1/task/submit',
          { task: 'Another Task', blueprint: SAMPLE_BLUEPRINT },
          testDir
        )
        taskId = (response.body as any).taskId
      }
      updateTaskStatus(db, taskId, 'RUNNING')
    })

    it('should return stage info from YAML blueprint', async () => {
      const response = await socketRequest(
        socketPath,
        'GET',
        `/api/v1/task/next?taskId=${taskId}`,
        undefined,
        testDir
      )

      expect(response.status).toBe(200)
      const data = response.body as any
      expect(data.stageId).toBe('s1')
      expect(data.name).toBe('创建用户模型')
      expect(data.spec).toBe('必须使用 TypeScript class 语法')
    })
  })

  describe('5. API: Step Verify with Staging', () => {
    beforeEach(async () => {
      const taskDir = join(testDir, '.openxenon', 'tasks', taskId)
      mkdirSync(taskDir, { recursive: true })
      const stagingPath = join(taskDir, 'staging', 'src', 'models')
      mkdirSync(stagingPath, { recursive: true })
    })

    it('should pass when staging has matching file', async () => {
      const taskDir = join(testDir, '.openxenon', 'tasks', taskId)
      const stagingPath = join(taskDir, 'staging', 'src', 'models')
      writeFileSync(join(stagingPath, 'User.ts'), 'export class User {}')

      const response = await socketRequest(
        socketPath,
        'POST',
        '/api/v1/step/verify',
        { taskId, stageId: 's1' },
        testDir
      )

      expect(response.status).toBe(200)
      const data = response.body as any
      expect(data.success).toBe(true)
      expect(data.stageId).toBe('s1')
    })
  })

  describe('6. End-to-End Flow', () => {
    it('should complete full flow: submit -> next -> write staging -> verify', async () => {
      const submitResponse = await socketRequest(
        socketPath,
        'POST',
        '/api/v1/task/submit',
        { task: 'E2E Test Task', blueprint: SAMPLE_BLUEPRINT },
        testDir
      )

      expect(submitResponse.status).toBe(200)
      const e2eTaskId = (submitResponse.body as any).taskId

      updateTaskStatus(db, e2eTaskId, 'RUNNING')

      const nextResponse = await socketRequest(
        socketPath,
        'GET',
        `/api/v1/task/next?taskId=${e2eTaskId}`,
        undefined,
        testDir
      )

      expect(nextResponse.status).toBe(200)
      expect((nextResponse.body as any).stageId).toBe('s1')

      const taskDir = join(testDir, '.openxenon', 'tasks', e2eTaskId)
      const stagingPath = join(taskDir, 'staging', 'src', 'models')
      mkdirSync(stagingPath, { recursive: true })
      writeFileSync(join(stagingPath, 'User.ts'), 'export class User {}')

      const verifyResponse = await socketRequest(
        socketPath,
        'POST',
        '/api/v1/step/verify',
        { taskId: e2eTaskId, stageId: 's1' },
        testDir
      )

      expect(verifyResponse.status).toBe(200)
      expect((verifyResponse.body as any).success).toBe(true)

      const artifactFile = join(testDir, 'src', 'models', 'User.ts')
      expect(existsSync(artifactFile)).toBe(true)
    })
  })
})
