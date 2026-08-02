// =============================================================================
// work-validator-boundary.test.ts — v0.7.3 P4 (ADR-0061 §D3) probe boundary check
//
// 覆盖：
//   1. extractProbeName: ref 解析 + 兼容
//   2. findSlotForTask: boundary 名匹配 + blueprint 解析
//   3. checkTaskProbesAgainstBoundary:
//      - probe 在 observe[] → ok
//      - probe 不在 observe[] → violations
//      - 无 probe → ok（无内容校验）
//      - 无 boundary → 跳过
//      - slot 不存在 → 跳过（向后兼容）
//      - observe=[] + 有 probe → 全部越界
//   4. collectAndThrowProbeBoundaryViolations: 集成 → throw IAPError
//
// ADR-0088 P6 (2026-08-02 phase 3.4)：从 work-validator.test.ts 拆出 P4 部分
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  extractProbeName,
  findSlotForTask,
  checkTaskProbesAgainstBoundary,
  collectAndThrowProbeBoundaryViolations,
} from '../work-validator'
import type { PerWorkBlueprintsIndex } from '../per-work-blueprints-merger'
import { IAPError } from '../../kernel'

let tmpDir: string
const workName = 'p4-test-work'

function writeTask(name: string, content: string): void {
  const taskDir = join(tmpDir, '.openxenon', 'works', workName, 'tasks', name)
  mkdirSync(taskDir, { recursive: true })
  writeFileSync(join(taskDir, 'task.md'), content)
}

function makeBlueprints(observeBySlot: Record<string, string[]>): PerWorkBlueprintsIndex {
  return {
    schemaVersion: 1,
    workName,
    generatedAt: '2026-07-17T00:00:00.000Z',
    projectRoot: tmpDir,
    sourceHash: 'a'.repeat(64),
    declaredRefs: ['@prj/blueprints/oxn-blueprint'],
    blueprintCount: 1,
    invalidCount: 0,
    blueprints: [
      {
        name: 'oxn-blueprint',
        scope: '@prj',
        file: '.openxenon/assets/blueprints/oxn-blueprint.md',
        status: 'ok',
        version: 1,
        slots: Object.entries(observeBySlot).map(([name, observe]) => ({
          name,
          deps: [],
          observe,
        })),
        errors: [],
        ref: '@prj/blueprints/oxn-blueprint',
        domainRefs: [],
        workflowRefs: [],
        stackRefs: [],
        nestedBlueprintRefs: [],
      },
    ],
  }
}

// ───────── extractProbeName ─────────

describe('extractProbeName — v0.7.3 P4', () => {
  test('@oxn/probes/<name> → name', () => {
    expect(extractProbeName('lint', '@oxn/probes/lint')).toBe('lint')
  })
  test('@oxn/probe/<name> 单数兼容 → name', () => {
    expect(extractProbeName('ts-compiles', '@oxn/probe/ts-compiles')).toBe('ts-compiles')
  })
  test('无 ref → 返回 name 本身', () => {
    expect(extractProbeName('my-probe', undefined)).toBe('my-probe')
  })
  test('ref 不匹配 @oxn/probes/* → 返回 name 本身（pass-through）', () => {
    expect(extractProbeName('my-probe', 'custom-ref')).toBe('my-probe')
  })
})

// ───────── findSlotForTask ─────────

describe('findSlotForTask — v0.7.3 P4', () => {
  test('boundary 名匹配 blueprint slot', () => {
    const idx = makeBlueprints({ design: ['lint-check'] })
    const r = findSlotForTask('design', 'oxn-blueprint', idx)
    expect(r.slot?.name).toBe('design')
    expect(r.slot?.observe).toEqual(['lint-check'])
  })
  test('boundary 不匹配 → slot=null', () => {
    const idx = makeBlueprints({ design: [] })
    const r = findSlotForTask('unknown-boundary', 'oxn-blueprint', idx)
    expect(r.slot).toBeNull()
  })
  test('无 boundary → slot=null', () => {
    const idx = makeBlueprints({ design: [] })
    const r = findSlotForTask(undefined, 'oxn-blueprint', idx)
    expect(r.slot).toBeNull()
  })
  test('无 blueprint → slot=null', () => {
    const empty: PerWorkBlueprintsIndex = {
      ...makeBlueprints({}),
      blueprints: [],
    }
    const r = findSlotForTask('design', 'oxn-blueprint', empty)
    expect(r.slot).toBeNull()
  })
})

// ───────── checkTaskProbesAgainstBoundary ─────────

describe('checkTaskProbesAgainstBoundary — v0.7.3 P4', () => {
  beforeEach(() => {
    tmpDir = join(tmpdir(), `wcb-p4-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })
  })
  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('probe 在 observe[] → ok=true', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/lint-check
`,
    )
    const idx = makeBlueprints({ design: ['lint-check', 'ts-compiles'] })
    const r = checkTaskProbesAgainstBoundary('step1', 'design', 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(true)
  })

  test('probe 不在 observe[] → ok=false + 1 violation', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/non-existent-probe
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const r = checkTaskProbesAgainstBoundary('step1', 'design', 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(false)
    if (r.ok === false) {
      expect(r.violations).toHaveLength(1)
      expect(r.violations[0]).toMatchObject({
        taskName: 'step1',
        boundary: 'design',
        probeName: 'non-existent-probe',
        probeRef: '@oxn/probes/non-existent-probe',
        allowedObserved: ['lint-check'],
      })
    }
  })

  test('多 probe 混合：1 合法 + 1 越界 → 1 violation', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/lint-check
- probe: @oxn/probes/forbidden-probe
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const r = checkTaskProbesAgainstBoundary('step1', 'design', 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(false)
    if (r.ok === false) {
      expect(r.violations).toHaveLength(1)
      expect(r.violations[0]?.probeName).toBe('forbidden-probe')
    }
  })

  test('无 probe → ok=true（无内容校验）', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const r = checkTaskProbesAgainstBoundary('step1', 'design', 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(true)
  })

  test('无 boundary → ok=true（跳过校验）', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/anything
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const r = checkTaskProbesAgainstBoundary('step1', undefined, 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(true)
  })

  test('boundary 不在 blueprint slots → ok=true（向后兼容）', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/anything
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const r = checkTaskProbesAgainstBoundary('step1', 'unknown-boundary', 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(true)
  })

  test('observe=[] + 有 probe → 全部越界', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/anything
`,
    )
    const idx = makeBlueprints({ discuss: [] })
    const r = checkTaskProbesAgainstBoundary('step1', 'discuss', 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(false)
    if (r.ok === false) {
      expect(r.violations).toHaveLength(1)
      expect(r.violations[0]?.allowedObserved).toEqual([])
    }
  })

  test('顶层 ## Probes 段 + part 内 probe 都校验', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/lint-check

## Probes

### my-top-probe
- ref: @oxn/probes/forbidden
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const r = checkTaskProbesAgainstBoundary('step1', 'design', 'oxn-blueprint', tmpDir, workName, idx)
    expect(r.ok).toBe(false)
    if (r.ok === false) {
      expect(r.violations).toHaveLength(1)
      expect(r.violations[0]?.probeName).toBe('forbidden')
    }
  })
})

// ───────── collectAndThrowProbeBoundaryViolations ─────────

describe('collectAndThrowProbeBoundaryViolations — v0.7.3 P4', () => {
  beforeEach(() => {
    tmpDir = join(tmpdir(), `wcb-p4-throw-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
    const workDir = join(tmpDir, '.openxenon', 'works', workName)
    mkdirSync(workDir, { recursive: true })
  })
  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  })

  test('work 含越界 probe → throw IAP_INTENT_PROBE_OUT_OF_BOUNDARY', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/forbidden-probe
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const work = {
      tasks: [
        {
          name: 'step1',
          boundary: 'design',
          blueprint: 'oxn-blueprint',
          deps: [],
        },
      ],
    }
    expect(() => collectAndThrowProbeBoundaryViolations(work as never, tmpDir, workName, idx)).toThrow(IAPError)
    try {
      collectAndThrowProbeBoundaryViolations(work as never, tmpDir, workName, idx)
    } catch (e) {
      expect(e).toBeInstanceOf(IAPError)
      const err = e as IAPError
      expect(err.code).toBe('PROBE_OUT_OF_BOUNDARY')
      expect(err.axis).toBe('INTENT')
      expect(String(err.action)).toBe('YIELD_TO_HUMAN')
      expect((err.context as { violations?: unknown[] }).violations).toBeDefined()
    }
  })

  test('work 全合法 probe → 不 throw', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
- probe: @oxn/probes/lint-check
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const work = {
      tasks: [
        {
          name: 'step1',
          boundary: 'design',
          blueprint: 'oxn-blueprint',
          deps: [],
        },
      ],
    }
    expect(() => collectAndThrowProbeBoundaryViolations(work as never, tmpDir, workName, idx)).not.toThrow()
  })

  test('work 无 probe + 无 boundary → 不 throw（混合场景）', () => {
    writeTask(
      'step1',
      `---
entity: task
version: 0.3.0
name: step1
---
# Task: step1

## Parts

### implement
- skill_context: |
    Do something.
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const work = {
      tasks: [{ name: 'step1', deps: [] }],
    }
    expect(() => collectAndThrowProbeBoundaryViolations(work as never, tmpDir, workName, idx)).not.toThrow()
  })

  test('多 task 越界 → throw 列出全部 violations', () => {
    writeTask(
      'task-a',
      `---
entity: task
version: 0.3.0
name: task-a
---
# Task: task-a

## Parts

### implement
- skill_context: |
    Do A.
- probe: @oxn/probes/forbidden-a
`,
    )
    writeTask(
      'task-b',
      `---
entity: task
version: 0.3.0
name: task-b
---
# Task: task-b

## Parts

### implement
- skill_context: |
    Do B.
- probe: @oxn/probes/forbidden-b
`,
    )
    const idx = makeBlueprints({ design: ['lint-check'] })
    const work = {
      tasks: [
        { name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: [] },
        { name: 'task-b', boundary: 'design', blueprint: 'oxn-blueprint', deps: [] },
      ],
    }
    try {
      collectAndThrowProbeBoundaryViolations(work as never, tmpDir, workName, idx)
      expect.unreachable()
    } catch (e) {
      const err = e as IAPError
      const v = (err.context as { violations: Array<{ taskName: string; probeName: string }> }).violations
      expect(v).toHaveLength(2)
      expect(v.map((x) => x.taskName).sort()).toEqual(['task-a', 'task-b'])
      expect(v.map((x) => x.probeName).sort()).toEqual(['forbidden-a', 'forbidden-b'])
    }
  })
})
