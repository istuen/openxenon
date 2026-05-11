import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { taskSubmit, taskNext, taskVerify, taskStatus } from '../../src/cli/task-filesystem'
import { join } from 'path'
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs'

const TEST_WORKDIR = '/tmp/oxn-task-test'

const SAMPLE_BLUEPRINT = `
name: test-task
stages:
  - id: stage-1
    name: 第一阶段
    description: 测试阶段
    proof:
      probeRefs:
        - type: fs_exists
          params:
            pattern: package.json
  - id: stage-2
    name: 第二阶段
    description: 第二测试阶段
    deps:
      - stage-1
    proof:
      probeRefs:
        - type: exec_exit_zero
          params:
            command: echo "hello"
`

describe('CLI Task Filesystem Operations', () => {
  let blueprintPath: string

  beforeEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
    mkdirSync(TEST_WORKDIR, { recursive: true })
    blueprintPath = join(TEST_WORKDIR, 'blueprint.yaml')
    writeFileSync(blueprintPath, SAMPLE_BLUEPRINT)
    writeFileSync(join(TEST_WORKDIR, 'package.json'), '{}')
  })

  afterEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
  })

  describe('taskSubmit', () => {
    it('创建任务并返回 task-id', () => {
      const result = taskSubmit(blueprintPath, TEST_WORKDIR)

      expect(result.taskId).toBeDefined()
      expect(result.taskId.length).toBeGreaterThan(0)
      expect(result.status).toBe('RUNNING')
      expect(result.stagesCount).toBe(2)
      expect(result.message).toBe('Task created successfully')
    })

    it('创建必要的文件', () => {
      const result = taskSubmit(blueprintPath, TEST_WORKDIR)
      const taskDir = join(TEST_WORKDIR, '.openxenon', 'tasks', result.taskId)

      expect(existsSync(join(taskDir, 'blueprint.yaml'))).toBe(true)
      expect(existsSync(join(taskDir, 'state.json'))).toBe(true)
      expect(existsSync(join(taskDir, 'task-trace.yaml'))).toBe(true)
    })

    it('Blueprint 文件不存在时抛出错误', () => {
      expect(() => taskSubmit('/nonexistent.yaml', TEST_WORKDIR)).toThrow()
    })

    it('state.json 包含正确的初始状态', () => {
      const result = taskSubmit(blueprintPath, TEST_WORKDIR)
      const statePath = join(TEST_WORKDIR, '.openxenon', 'tasks', result.taskId, 'state.json')
      const state = JSON.parse(readFileSync(statePath, 'utf-8'))

      expect(state.taskId).toBe(result.taskId)
      expect(state.taskName).toBe('test-task')
      expect(state.status).toBe('RUNNING')
      expect(state.currentStage).toBeNull()
      expect(state.stages['第一阶段']).toBe('PENDING')
      expect(state.stages['第二阶段']).toBe('PENDING')
    })
  })

  describe('taskNext', () => {
    it('返回下一个 PENDING 的 stage', () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      const nextResult = taskNext(submitResult.taskId, TEST_WORKDIR)

      expect(nextResult.stageId).toBe('stage-1')
      expect(nextResult.name).toBe('第一阶段')
      expect(nextResult.message).toBe('Stage started')
    })

    it('更新 state.json 中的 stage 状态为 RUNNING', () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      taskNext(submitResult.taskId, TEST_WORKDIR)

      const statePath = join(TEST_WORKDIR, '.openxenon', 'tasks', submitResult.taskId, 'state.json')
      const state = JSON.parse(readFileSync(statePath, 'utf-8'))

      expect(state.stages['第一阶段']).toBe('RUNNING')
      expect(state.currentStage).toBe('第一阶段')
    })

    it('所有 stage 完成后返回 COMPLETED', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)

      taskNext(submitResult.taskId, TEST_WORKDIR)
      await taskVerify(submitResult.taskId, 'stage-1', TEST_WORKDIR)

      taskNext(submitResult.taskId, TEST_WORKDIR)
      await taskVerify(submitResult.taskId, 'stage-2', TEST_WORKDIR)

      const finalNext = taskNext(submitResult.taskId, TEST_WORKDIR)
      expect(finalNext.status).toBe('COMPLETED')
      expect(finalNext.stageId).toBeNull()
    })

    it('Task 不存在时抛出错误', () => {
      expect(() => taskNext('nonexistent', TEST_WORKDIR)).toThrow()
    })
  })

  describe('taskVerify', () => {
    it('验证通过时 stage 状态更新为 PASSED', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      taskNext(submitResult.taskId, TEST_WORKDIR)

      const verifyResult = await taskVerify(submitResult.taskId, 'stage-1', TEST_WORKDIR)

      expect(verifyResult.passed).toBe(true)
      expect(verifyResult.stageId).toBe('stage-1')

      const statePath = join(TEST_WORKDIR, '.openxenon', 'tasks', submitResult.taskId, 'state.json')
      const state = JSON.parse(readFileSync(statePath, 'utf-8'))
      expect(state.stages['第一阶段']).toBe('PASSED')
    })

    it('写入 step-manifest.json', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      taskNext(submitResult.taskId, TEST_WORKDIR)

      await taskVerify(submitResult.taskId, 'stage-1', TEST_WORKDIR)

      const manifestPath = join(TEST_WORKDIR, '.openxenon', 'tasks', submitResult.taskId, 'step-manifest.json')
      expect(existsSync(manifestPath)).toBe(true)

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(manifest.stages['第一阶段']).toBeDefined()
      expect(manifest.stages['第一阶段'].status).toBe('PASSED')
    })

    it('Task 不存在时抛出错误', async () => {
      await expect(taskVerify('nonexistent', 'stage-1', TEST_WORKDIR)).rejects.toThrow()
    })

    it('Stage 不存在时抛出错误', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      await expect(taskVerify(submitResult.taskId, 'nonexistent-stage', TEST_WORKDIR)).rejects.toThrow()
    })
  })

  describe('taskStatus', () => {
    it('返回当前任务状态', () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      const status = taskStatus(submitResult.taskId, TEST_WORKDIR)

      expect(status.taskId).toBe(submitResult.taskId)
      expect(status.taskName).toBe('test-task')
      expect(status.status).toBe('RUNNING')
      expect(status.stages).toEqual({
        '第一阶段': 'PENDING',
        '第二阶段': 'PENDING'
      })
    })

    it('Task 不存在时抛出错误', () => {
      expect(() => taskStatus('nonexistent', TEST_WORKDIR)).toThrow()
    })
  })

  describe('完整流程', () => {
    it('submit → next → verify → status', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      expect(submitResult.status).toBe('RUNNING')

      const nextResult = taskNext(submitResult.taskId, TEST_WORKDIR)
      expect(nextResult.stageId).toBe('stage-1')
      expect(nextResult.name).toBe('第一阶段')

      const verifyResult = await taskVerify(submitResult.taskId, 'stage-1', TEST_WORKDIR)
      expect(verifyResult.passed).toBe(true)

      const status = taskStatus(submitResult.taskId, TEST_WORKDIR)
      expect(status.stages['第一阶段']).toBe('PASSED')
      expect(status.currentStage).toBeNull()

      const nextResult2 = taskNext(submitResult.taskId, TEST_WORKDIR)
      expect(nextResult2.stageId).toBe('stage-2')
      expect(nextResult2.name).toBe('第二阶段')
    })
  })
})