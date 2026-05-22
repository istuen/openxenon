import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { taskSubmit, taskNext, taskVerify, taskStatus, taskNew } from '../../src/cli/task-filesystem'
import { join } from 'path'
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { resetOxnServices } from '../../src/oxn-dsl/langium/oxn-services'

const TEST_WORKDIR = '/tmp/oxn-task-test'

const SAMPLE_OXN = `
blueprint "test-task" {
  version = 1

  stage "part-1" {
    run = "part.p1.run"
    deps = []
  }

  stage "part-2" {
    run = "part.p2.run"
    deps = ["part-1"]
  }
}
`

describe('CLI Task Filesystem Operations', () => {
  let blueprintPath: string

  beforeEach(() => {
    resetOxnServices()
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
    mkdirSync(TEST_WORKDIR, { recursive: true })
    blueprintPath = join(TEST_WORKDIR, 'blueprint.oxn')
    writeFileSync(blueprintPath, SAMPLE_OXN)
    writeFileSync(join(TEST_WORKDIR, 'package.json'), '{}')
  })

  afterEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
  })

  describe('taskSubmit', () => {
    it('创建任务并返回 kebab-case task-id', () => {
      const result = taskSubmit(blueprintPath, TEST_WORKDIR)

      expect(result.taskId).toBe('test-task')
      expect(result.status).toBe('RUNNING')
      expect(result.partsCount).toBe(2)
      expect(result.message).toBe('Task created successfully')
    })

    it('创建必要的文件', () => {
      const result = taskSubmit(blueprintPath, TEST_WORKDIR)
      const taskDir = join(TEST_WORKDIR, '.openxenon', 'tasks', result.taskId)

      expect(existsSync(join(taskDir, 'blueprint.oxn'))).toBe(true)
      expect(existsSync(join(taskDir, 'state.json'))).toBe(true)
      expect(existsSync(join(taskDir, 'task-trace.jsonl'))).toBe(true)
    })

    it('Blueprint 文件不存在时抛出错误', () => {
      expect(() => taskSubmit('/nonexistent.oxn', TEST_WORKDIR)).toThrow()
    })

    it('nameOverride 参数覆盖 Blueprint 名称', () => {
      const result = taskSubmit(blueprintPath, TEST_WORKDIR, 'custom-task-name')
      expect(result.taskId).toBe('custom-task-name')
    })

    it('重复 task 名称抛出错误', () => {
      taskSubmit(blueprintPath, TEST_WORKDIR)
      expect(() => taskSubmit(blueprintPath, TEST_WORKDIR)).toThrow('already exists')
    })

    it('state.json 包含正确的初始状态', () => {
      const result = taskSubmit(blueprintPath, TEST_WORKDIR)
      const statePath = join(TEST_WORKDIR, '.openxenon', 'tasks', result.taskId, 'state.json')
      const state = JSON.parse(readFileSync(statePath, 'utf-8'))

      expect(state.taskId).toBe(result.taskId)
      expect(state.taskName).toBe('test-task')
      expect(state.status).toBe('RUNNING')
      expect(state.currentPartId).toBeNull()
      expect(state.parts['part-1'].name).toBeDefined()
      expect(state.parts['part-1'].status).toBe('PENDING')
      expect(state.parts['part-2'].name).toBeDefined()
      expect(state.parts['part-2'].status).toBe('PENDING')
    })
  })

  describe('taskNext', () => {
    it('返回下一个 PENDING 的 part', () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      const nextResult = taskNext(submitResult.taskId, TEST_WORKDIR)

      expect(nextResult.partId).toBe('part-1')
      expect(nextResult.message).toBe('Part started')
    })

    it('更新 state.json 中的 part 状态为 RUNNING', () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      taskNext(submitResult.taskId, TEST_WORKDIR)

      const statePath = join(TEST_WORKDIR, '.openxenon', 'tasks', submitResult.taskId, 'state.json')
      const state = JSON.parse(readFileSync(statePath, 'utf-8'))

      expect(state.parts['part-1'].status).toBe('RUNNING')
      expect(state.currentPartId).toBe('part-1')
    })

    it('所有 part 完成后返回 COMPLETED', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)

      taskNext(submitResult.taskId, TEST_WORKDIR)
      await taskVerify(submitResult.taskId, 'part-1', TEST_WORKDIR)

      taskNext(submitResult.taskId, TEST_WORKDIR)
      await taskVerify(submitResult.taskId, 'part-2', TEST_WORKDIR)

      const finalNext = taskNext(submitResult.taskId, TEST_WORKDIR)
      expect(finalNext.status).toBe('COMPLETED')
      expect(finalNext.partId).toBeNull()
    })

    it('Task 不存在时抛出错误', () => {
      expect(() => taskNext('nonexistent', TEST_WORKDIR)).toThrow()
    })
  })

  describe('taskVerify', () => {
    it('验证通过时 part 状态更新为 PASSED，probeResults 写入 state.json', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      taskNext(submitResult.taskId, TEST_WORKDIR)

      const verifyResult = await taskVerify(submitResult.taskId, 'part-1', TEST_WORKDIR)

      expect(verifyResult.passed).toBe(true)
      expect(verifyResult.partId).toBe('part-1')

      const statePath = join(TEST_WORKDIR, '.openxenon', 'tasks', submitResult.taskId, 'state.json')
      const state = JSON.parse(readFileSync(statePath, 'utf-8'))
      expect(state.parts['part-1'].status).toBe('PASSED')
      expect(state.parts['part-1'].probeResults).toBeDefined()
      expect(state.parts['part-1'].probeResults[0].result).toBe('PASSED')
    })

    it('state.json 不写入独立的 step-manifest.json', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      taskNext(submitResult.taskId, TEST_WORKDIR)

      await taskVerify(submitResult.taskId, 'part-1', TEST_WORKDIR)

      const manifestPath = join(TEST_WORKDIR, '.openxenon', 'tasks', submitResult.taskId, 'step-manifest.json')
      expect(existsSync(manifestPath)).toBe(false)
    })

    it('Task 不存在时抛出错误', async () => {
      await expect(taskVerify('nonexistent', 'part-1', TEST_WORKDIR)).rejects.toThrow()
    })

    it('Part 不存在时抛出错误', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      await expect(taskVerify(submitResult.taskId, 'nonexistent-part', TEST_WORKDIR)).rejects.toThrow()
    })
  })

  describe('taskStatus', () => {
    it('返回当前任务状态', () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      const status = taskStatus(submitResult.taskId, TEST_WORKDIR)

      expect(status.taskId).toBe(submitResult.taskId)
      expect(status.taskName).toBe('test-task')
      expect(status.status).toBe('RUNNING')
      expect(status.parts['part-1'].status).toBe('PENDING')
      expect(status.parts['part-2'].status).toBe('PENDING')
    })

    it('Task 不存在时抛出错误', () => {
      expect(() => taskStatus('nonexistent', TEST_WORKDIR)).toThrow()
    })
  })

  describe('taskNew', () => {
    it('创建新任务返回 PENDING 状态', () => {
      const result = taskNew('my-new-task', '我的新任务', TEST_WORKDIR)

      expect(result.taskId).toBe('my-new-task')
      expect(result.taskName).toBe('我的新任务')
      expect(result.status).toBe('PENDING')
      expect(result.message).toContain('submit --blueprint')
    })

    it('创建任务后生成 state.json', () => {
      taskNew('task-with-state', '带状态的任务', TEST_WORKDIR)
      const statePath = join(TEST_WORKDIR, '.openxenon', 'tasks', 'task-with-state', 'state.json')
      const state = JSON.parse(readFileSync(statePath, 'utf-8'))

      expect(state.taskId).toBe('task-with-state')
      expect(state.taskName).toBe('带状态的任务')
      expect(state.status).toBe('PENDING')
      expect(state.currentPartId).toBeNull()
      expect(state.parts).toEqual({})
    })

    it('创建任务后生成 task-trace.jsonl', () => {
      taskNew('task-with-trace', '带追踪的任务', TEST_WORKDIR)
      const tracePath = join(TEST_WORKDIR, '.openxenon', 'tasks', 'task-with-trace', 'task-trace.jsonl')
      expect(existsSync(tracePath)).toBe(true)

      const content = readFileSync(tracePath, 'utf-8')
      expect(content).toContain('TASK_CREATED')
      expect(content).toContain('task-with-trace')
    })

    it('重复 taskId 抛出错误', () => {
      taskNew('duplicate-task', '重复任务', TEST_WORKDIR)
      expect(() => taskNew('duplicate-task', '另一个任务', TEST_WORKDIR)).toThrow('already exists')
    })

    it('无效 taskId 格式抛出错误', () => {
      expect(() => taskNew('InvalidTask', '无效任务', TEST_WORKDIR)).toThrow('Invalid task name')
      expect(() => taskNew('has_space', '有空格的任务', TEST_WORKDIR)).toThrow('Invalid task name')
    })

    it('默认 taskName 与 taskId 相同', () => {
      const result = taskNew('default-name-task', '', TEST_WORKDIR)
      expect(result.taskName).toBe('default-name-task')
    })
  })

  describe('完整流程', () => {
    it('submit → next → verify → status', async () => {
      const submitResult = taskSubmit(blueprintPath, TEST_WORKDIR)
      expect(submitResult.status).toBe('RUNNING')

      const nextResult = taskNext(submitResult.taskId, TEST_WORKDIR)
      expect(nextResult.partId).toBe('part-1')

      const verifyResult = await taskVerify(submitResult.taskId, 'part-1', TEST_WORKDIR)
      expect(verifyResult.passed).toBe(true)

      const status = taskStatus(submitResult.taskId, TEST_WORKDIR)
      expect(status.parts['part-1'].status).toBe('PASSED')
      expect(status.currentPartId).toBeNull()

      const nextResult2 = taskNext(submitResult.taskId, TEST_WORKDIR)
      expect(nextResult2.partId).toBe('part-2')
    })
  })
})
