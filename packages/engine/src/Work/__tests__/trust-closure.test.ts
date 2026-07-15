// =============================================================================
// trust-closure.test.ts — ADR-0058 D2/D3/D4 闭合测试 + v0.6.1 信任链闭环
//
// 覆盖本次会话实现的三层确定性闭环：
//   A3 (D2): submitTaskWithProbes 调真实 executeProbe 写入 probeResults
//   A1 (D3): finalizeWork 写 work-level frozen.json（含 roundHistory + taskFrozenPaths）
//   A2 (D4): boundaryViolations 注入 frozen.json
//   v0.6.1: verdict.md 生成 + evidence-collector + collectWorkDomainProofs
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { finalizeWork, submitTaskWithProbes, runWork, runTask } from '../dual-state-exec'
import { collectEvidence, writeWorkVerdictMd } from '@openxenon/engine/Proof'
import { collectWorkDomainProofs } from '@openxenon/engine/infra/frozen/work-domains'

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
  test('finalizeWork 写 .run/frozen.json 含 finalVerdict + roundHistory + taskFrozenPaths', () => {
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
      verdict: 'PASSED',
    })

    const frozenPath = join(tmpDir, '.openxenon', 'works', workName, '.run', 'frozen.json')
    expect(existsSync(frozenPath)).toBe(true)
    const frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(frozen.workName).toBe(workName)
    expect(frozen.finalVerdict).toBe('PASSED')
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
        verdict: 'FAIL',
        failureMessage: 'simulated boundary violation',
      },
    ]
    finalizeWork({
      projectRoot: tmpDir,
      workName,
      verdict: 'FAILED',
      boundaryViolations: violations,
    })

    const frozenPath = join(tmpDir, '.openxenon', 'works', workName, '.run', 'frozen.json')
    const frozen = JSON.parse(readFileSync(frozenPath, 'utf-8'))
    expect(frozen.boundaryViolations).toEqual(violations)
  })
})

// ───────── v0.6.1: verdict.md 信任链闭环 ─────────

describe('verdict.md 信任链闭环 (v0.6.1)', () => {
  test('finalizeWork 生成 verdict.md 文件', () => {
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

    finalizeWork({
      projectRoot: tmpDir,
      workName,
      verdict: 'PASSED',
    })

    const verdictPath = join(tmpDir, '.openxenon', 'works', workName, '.run', 'verdict.md')
    expect(existsSync(verdictPath)).toBe(true)
  })

  test('verdict.md 包含信任链节点和 content_hash', () => {
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

    finalizeWork({
      projectRoot: tmpDir,
      workName,
      verdict: 'PASSED',
    })

    const verdictPath = join(tmpDir, '.openxenon', 'works', workName, '.run', 'verdict.md')
    const content = readFileSync(verdictPath, 'utf-8')

    // 检查信任链节点
    expect(content).toContain('# Verdict:')
    expect(content).toContain('## Work')
    expect(content).toContain('## Tasks & Probes')
    expect(content).toContain('## Boundary Violations')
    expect(content).toContain('## Summary')
    expect(content).toContain('content_hash:')
  })
})

// ───────── evidence-collector 测试 ─────────

describe('evidence-collector', () => {
  test('collectEvidence 读取 Work 证据', () => {
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

    const evidence = collectEvidence(tmpDir, workName)
    expect(evidence).toBeDefined()
    expect(evidence.work).toBeDefined()
    expect(evidence.taskEvidence).toBeDefined()
    expect(evidence.boundaryViolations).toEqual([])
  })
})

// ───────── collectWorkDomainProofs 测试 ─────────

describe('collectWorkDomainProofs', () => {
  test('从 work.md ## Use 提取 domain 引用', () => {
    const worksDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(worksDir, { recursive: true })
    writeFileSync(
      join(worksDir, 'work.md'),
      `---
entity: work
version: 0.7.0
name: ${workName}
---

# Work: ${workName}

## Context
- goal: test goal

## Use
### test-domain
- kind: domain
- ref: @prj/domains/test-domain

### test-bp
- kind: blueprint
- ref: @prj/blueprints/test-bp
`,
    )

    // 创建 domain 文件（含 invariants）
    const domainsDir = join(tmpDir, '.openxenon', 'domains')
    mkdirSync(domainsDir, { recursive: true })
    writeFileSync(
      join(domainsDir, 'test-domain.md'),
      `---
entity: domain
version: 0.7.0
name: test-domain
---

# Domain: test-domain

## Invariants
### invariant-1
- value: test invariant
`,
    )

    const result = collectWorkDomainProofs(tmpDir, workName, 'md')
    expect(result.length).toBe(1)
    expect(result[0]!.domain).toBe('test-domain')
    expect(result[0]!.invariant).toBe('test invariant')
  })

  test('无 domain 引用时返回空数组', () => {
    const worksDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(worksDir, { recursive: true })
    writeFileSync(
      join(worksDir, 'work.md'),
      `---
entity: work
version: 0.7.0
name: ${workName}
---

# Work: ${workName}

## Context
- goal: test goal

## Use
### test-bp
- kind: blueprint
- ref: @prj/blueprints/test-bp
`,
    )

    const result = collectWorkDomainProofs(tmpDir, workName, 'md')
    expect(result.length).toBe(0)
  })
})
