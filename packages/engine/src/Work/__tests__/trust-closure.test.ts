// =============================================================================
// trust-closure.test.ts — ADR-0058 D2/D3/D4 闭合测试
//
// 覆盖本次会话实现的三层确定性闭环：
//   A3 (D2): submitTaskWithProbes 调真实 executeProbe 写入 probeResults
//   A1 (D3): finalizeWork 写 work-level frozen.json（含 roundHistory + taskFrozenPaths）
//   A2 (D4): boundaryViolations 注入 frozen.json
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { finalizeWork, submitTaskWithProbes, runWork, runTask } from '../dual-state-exec'

let tmpDir: string
const workName = 'closure-test'

beforeEach(() => {
  tmpDir = join(tmpdir(), `trust-closure-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

function writeTask(name: string, content: string): void {
  const dir = join(tmpDir, '.openxenon', 'works', workName, 'tasks', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'task.md'), content)
}

// ───────── A3 (D2): submitTaskWithProbes 真实 Probe 执行 ─────────

describe('submitTaskWithProbes (A3 / D2)', () => {
  test('执行 task.md ## Probes 声明的 shell-exec，真实 verdict 写入 probeResults', async () => {
    // setup: runWork + runTask 让 submitTask 可推进 part
    runWork({
      projectRoot: tmpDir,
      workName,
      blueprintNames: ['test-bp'],
      domainNames: ['test-domain'],
      tasks: [{ taskName: 'task-a', blueprint: 'test-bp', injects: [] }],
    })
    runTask({
      projectRoot: tmpDir,
      workName,
      taskName: 'task-a',
      blueprint: 'test-bp',
      injects: [],
      partNames: ['p1'],
    })
    writeTask(
      'task-a',
      `---
entity: task
version: 0.7.0
name: task-a
---

# Task: task-a

## Parts
### p1

## Probes
### echo
- ref: @oxn/probes/shell-exec
- params:
  - command: echo closure

## Refs
- blueprint: test-bp
`,
    )

    const result = await submitTaskWithProbes({
      projectRoot: tmpDir,
      workName,
      taskName: 'task-a',
      runProbes: true,
    })

    expect(result.probeResults.length).toBeGreaterThan(0)
    const echoProbe = result.probeResults.find((p) => p.probe === 'echo')
    expect(echoProbe).toBeDefined()
    expect(echoProbe!.passed).toBe(true)
    expect(echoProbe!.output).toBeDefined()
  })

  test('无 ## Probes 声明 → 退回合成行为（probeResults 来自 state-machine）', async () => {
    runWork({
      projectRoot: tmpDir,
      workName,
      blueprintNames: ['test-bp'],
      domainNames: [],
      tasks: [{ taskName: 'task-no-probe', blueprint: 'test-bp', injects: [] }],
    })
    runTask({
      projectRoot: tmpDir,
      workName,
      taskName: 'task-no-probe',
      blueprint: 'test-bp',
      injects: [],
      partNames: ['p1'],
    })
    writeTask(
      'task-no-probe',
      `---
entity: task
version: 0.7.0
name: task-no-probe
---

# Task: task-no-probe

## Parts
### p1

## Refs
- blueprint: test-bp
`,
    )

    const result = await submitTaskWithProbes({
      projectRoot: tmpDir,
      workName,
      taskName: 'task-no-probe',
      runProbes: true,
    })

    // 无真实 probe 声明 → 退回 base.submitTask 的合成结果（state-machine）
    expect(result.probeResults.length).toBeGreaterThan(0)
    expect(result.probeResults.some((p) => p.probe === 'state-machine')).toBe(true)
  })
})

// ───────── A1 (D3): finalizeWork 写 work-level frozen.json ─────────

describe('finalizeWork frozen.json (A1 / D3)', () => {
  test('finalizeWork 写 .run/frozen.json 含 finalOutcome + roundHistory + taskFrozenPaths', () => {
    runWork({
      projectRoot: tmpDir,
      workName,
      blueprintNames: ['test-bp'],
      domainNames: [],
      tasks: [{ taskName: 'task-a', blueprint: 'test-bp', injects: [] }],
    })
    runTask({
      projectRoot: tmpDir,
      workName,
      taskName: 'task-a',
      blueprint: 'test-bp',
      injects: [],
      partNames: ['p1'],
    })
    // 写一个 task-level frozen.json 以测试 taskFrozenPaths 索引
    const tDir = join(tmpDir, '.openxenon', 'works', workName, '.run', 'tasks', 'task-a')
    mkdirSync(tDir, { recursive: true })
    writeFileSync(join(tDir, 'frozen.json'), JSON.stringify({ taskName: 'task-a', probeResults: [] }))

    finalizeWork({
      projectRoot: tmpDir,
      workName,
      outcome: 'COMPLETED',
    })

    const frozenPath = join(tmpDir, '.openxenon', 'works', workName, '.run', 'frozen.json')
    expect(existsSync(frozenPath)).toBe(true)
    const frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(frozen.workName).toBe(workName)
    expect(frozen.finalOutcome).toBe('COMPLETED')
    expect(frozen.totalRounds).toBeGreaterThan(0)
    expect(Array.isArray(frozen.roundHistory)).toBe(true)
    expect(Array.isArray(frozen.taskFrozenPaths)).toBe(true)
    expect(frozen.taskFrozenPaths.length).toBeGreaterThan(0)
  })

  test('boundaryViolations 注入 frozen.json（D4 记录）', () => {
    runWork({
      projectRoot: tmpDir,
      workName,
      blueprintNames: ['test-bp'],
      domainNames: [],
      tasks: [{ taskName: 'task-a', blueprint: 'test-bp', injects: [] }],
    })
    runTask({
      projectRoot: tmpDir,
      workName,
      taskName: 'task-a',
      blueprint: 'test-bp',
      injects: [],
      partNames: ['p1'],
    })

    const violations = [
      {
        domain: 'test-domain',
        invariant: 'invariant-1',
        outcome: 'DEVIATED',
        failureMessage: 'simulated boundary violation',
      },
    ]
    finalizeWork({
      projectRoot: tmpDir,
      workName,
      outcome: 'DEVIATED',
      boundaryViolations: violations,
    })

    const frozenPath = join(tmpDir, '.openxenon', 'works', workName, '.run', 'frozen.json')
    const frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(frozen.boundaryViolations).toEqual(violations)
  })
})
