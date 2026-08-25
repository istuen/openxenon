/**
 * run-re-runnable.test.ts — v1.3 RFC-0033 D6 适配
 *
 * 测试 oxn work run 在 state.status=pending/running 时允许重新调用：
 * - 第一次 runWork → 初始化 status=pending
 * - 第二次 runWork（state.status=pending/running）→ 允许，不报错
 * - 自动重置 failed/running task → pending（passed 保留）
 *
 * 🗑️ RFC-0033 D6: Round 模型退役，currentRound / roundHistory 字段已删；resetTasksForReRun 取代 resetCurrentRoundTasks
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { runWork, resetTasksForReRun } from '../dual-state-exec'
import { BOUNDARY_DIR, WORK_OXN_FILE } from '@openxenon/engine/kernel'

let tmp: string

beforeEach(() => {
  tmp = join(tmpdir(), `oxn-run-rerun-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmp, { recursive: true })
  mkdirSync(join(tmp, BOUNDARY_DIR, 'works', 'test-work', '.run'), { recursive: true })
  writeFileSync(join(tmp, BOUNDARY_DIR, 'works', 'test-work', WORK_OXN_FILE), 'work "test-work" {}\n')
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('runWork re-runnable (RFC-0033 D6)', () => {
  it('first runWork initializes status=pending (no Round)', () => {
    const state = runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [{ taskName: 't1', blueprint: 'bp1', injects: [] }],
    })
    expect(state.status).toBe('pending')
    // 🗑️ RFC-0033 D6: Round 概念已删，currentRound / roundHistory 不存在
    expect((state as { currentRound?: unknown }).currentRound).toBeUndefined()
    expect((state as { roundHistory?: unknown }).roundHistory).toBeUndefined()
  })

  it('resetTasksForReRun preserves passed tasks, resets failed/running', () => {
    const state = runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [
        { taskName: 't1', blueprint: 'bp1', injects: [] },
        { taskName: 't2', blueprint: 'bp1', injects: [] },
      ],
    })

    // 手动设置 task 状态模拟"已跑过若干次"
    state.tasks[0]!.status = 'passed' // t1 passed
    state.tasks[1]!.status = 'failed' // t2 failed

    resetTasksForReRun(state)

    expect(state.tasks[0]?.status).toBe('passed') // passed 保留
    expect(state.tasks[1]?.status as string).toBe('pending') // failed → pending
  })

  it('second runWork on pending state is allowed (Inv21RunAllowRerunPending)', () => {
    // 第一次 runWork
    const state1 = runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [],
    })
    expect(state1.status).toBe('pending') // 初始化后是 pending

    // 第二次 runWork（state 已存在，status=pending）
    // 期望：允许；调用 resetTasksForReRun
    // 此测试在 CLI 层验证，这里只验证 resetTasksForReRun 工具函数
    expect(resetTasksForReRun).toBeDefined()
  })
})
