import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { taskNew, taskSubmit } from '../../src/cli/task-filesystem'
import { resetOxnServices } from '../../src/oxn-dsl/langium/oxn-services'

const TEST_WORKDIR = '/tmp/oxn-task-test'

describe('CLI Task Filesystem Operations', () => {
  beforeEach(() => {
    resetOxnServices()
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
    mkdirSync(TEST_WORKDIR, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_WORKDIR, { recursive: true, force: true })
  })

  describe('taskNew', () => {
    it('创建新任务返回 PENDING 状态', () => {
      const result = taskNew('my-new-task', '我的新任务', TEST_WORKDIR)

      expect(result.taskId).toBe('my-new-task')
      expect(result.taskName).toBe('我的新任务')
      expect(result.status).toBe('PENDING')
      expect(result.message).toContain('submit')
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
      expect(content).toContain('TASK_START')
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

    it('创建任务时指定 blueprint 引用', () => {
      taskNew('task-with-bp', '带 blueprint 的任务', TEST_WORKDIR, 'new-task-flow')

      const taskOxnPath = join(TEST_WORKDIR, '.openxenon', 'tasks', 'task-with-bp', 'task.oxn')
      expect(existsSync(taskOxnPath)).toBe(true)

      const content = readFileSync(taskOxnPath, 'utf-8')
      expect(content).toContain('blueprint "new-task-flow"')
    })
  })

  describe('taskSubmit', () => {
    it('task.oxn 不存在时抛出错误', () => {
      expect(() => taskSubmit('nonexistent', TEST_WORKDIR)).toThrow('Task file not found')
    })
  })
})
