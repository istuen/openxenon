// =============================================================================
// work-validator.test.ts — v0.7.3 P4 (ADR-0061 §D3) probe boundary check
//                       + P5 (ADR-0061 §D4) Workflow slot DAG closure check
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
//   5. P5 buildSlotDAG: 合并多 Blueprint slots
//   6. P5 computeSlotAncestors: 链式 / 菱形 / 自环
//   7. P5 checkTaskDepsClosure:
//      - 全部 deps 在闭包 → ok
//      - deps 引用 unknown → violation 'dep_unknown'
//      - deps 引用非 ancestor → violation 'dep_slot_not_in_task_slot_closure'
//      - 同 slot 内 task 互相依赖 → 通过
//      - task 无 boundary + 有 deps → violation 'task_has_no_boundary'
//   8. P5 collectAndThrowDagClosureViolations: opts.skip 跳过 throw
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
  buildSlotDAG,
  computeSlotAncestors,
  checkTaskDepsClosure,
  collectAndThrowDagClosureViolations,
  detectLegacyDomainRefs,
  legacyDomainRefsToWarnings,
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

/**
 * 🆕 P5: 构造支持 deps 的 blueprints index。
 * slots: { [slotName]: { deps, observe } }
 */
function makeBlueprintsWithDeps(
  slots: Record<string, { deps?: string[]; observe?: string[] }>,
): PerWorkBlueprintsIndex {
  return {
    schemaVersion: 1,
    workName,
    generatedAt: '2026-07-17T00:00:00.000Z',
    projectRoot: tmpDir,
    sourceHash: 'b'.repeat(64),
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
        slots: Object.entries(slots).map(([name, v]) => ({
          name,
          deps: v.deps ?? [],
          observe: v.observe ?? [],
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

/**
 * 🆕 P5: 构造多 Blueprint 合并场景。
 */
function makeMultiBlueprintBlueprints(
  blueprints: Array<{
    name: string
    slots: Record<string, { deps?: string[]; observe?: string[] }>
  }>,
): PerWorkBlueprintsIndex {
  return {
    schemaVersion: 1,
    workName,
    generatedAt: '2026-07-17T00:00:00.000Z',
    projectRoot: tmpDir,
    sourceHash: 'c'.repeat(64),
    declaredRefs: blueprints.map((b) => `@prj/blueprints/${b.name}`),
    blueprintCount: blueprints.length,
    invalidCount: 0,
    blueprints: blueprints.map((b) => ({
      name: b.name,
      scope: '@prj',
      file: `.openxenon/assets/blueprints/${b.name}.md`,
      status: 'ok',
      version: 1,
      slots: Object.entries(b.slots).map(([name, v]) => ({
        name,
        deps: v.deps ?? [],
        observe: v.observe ?? [],
      })),
      errors: [],
      ref: `@prj/blueprints/${b.name}`,
      domainRefs: [],
      workflowRefs: [],
      stackRefs: [],
      nestedBlueprintRefs: [],
    })),
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
    const r = checkTaskProbesAgainstBoundary(
      'step1',
      undefined, // no boundary
      'oxn-blueprint',
      tmpDir,
      workName,
      idx,
    )
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
    const r = checkTaskProbesAgainstBoundary(
      'step1',
      'unknown-boundary', // 不在 blueprint slots
      'oxn-blueprint',
      tmpDir,
      workName,
      idx,
    )
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
      tasks: [
        { name: 'step1', deps: [] }, // no boundary, no blueprint
      ],
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

// =============================================================================
// 🆕 v0.7.3 P5 (ADR-0061 §D4): Workflow slot DAG closure check
// =============================================================================

// ───────── buildSlotDAG ─────────

describe('buildSlotDAG — v0.7.3 P5', () => {
  test('单 Blueprint 多 slot → DAG 含所有 slot', () => {
    const idx = makeBlueprintsWithDeps({
      discuss: { deps: [] },
      explore: { deps: ['discuss'] },
      design: { deps: ['explore'] },
      compass: { deps: ['design'] },
    })
    const dag = buildSlotDAG(idx)
    expect(dag.size).toBe(4)
    expect(dag.get('explore')).toEqual(['discuss'])
    expect(dag.get('design')).toEqual(['explore'])
    expect(dag.get('compass')).toEqual(['design'])
  })

  test('多 Blueprint slots 合并（同名 slot 后者覆盖）', () => {
    const idx = makeMultiBlueprintBlueprints([
      {
        name: 'bp-a',
        slots: {
          design: { deps: ['explore'] },
        },
      },
      {
        name: 'bp-b',
        slots: {
          explore: { deps: ['discuss'] },
          design: { deps: ['compass'] }, // 同名 slot 后覆盖
        },
      },
    ])
    const dag = buildSlotDAG(idx)
    expect(dag.size).toBe(2)
    expect(dag.get('explore')).toEqual(['discuss'])
    // bp-b 的 design 覆盖 bp-a 的
    expect(dag.get('design')).toEqual(['compass'])
  })

  test('无 slot Blueprint → 空 DAG', () => {
    const idx = makeBlueprintsWithDeps({})
    const dag = buildSlotDAG(idx)
    expect(dag.size).toBe(0)
  })
})

// ───────── computeSlotAncestors ─────────

describe('computeSlotAncestors — v0.7.3 P5', () => {
  test('链式 DAG: A→B→C→D, D 的祖先 = {A,B,C}', () => {
    const dag = new Map([
      ['a', []],
      ['b', ['a']],
      ['c', ['b']],
      ['d', ['c']],
    ])
    const ancestors = computeSlotAncestors('d', dag)
    expect(ancestors).toEqual(new Set(['a', 'b', 'c']))
  })

  test('菱形 DAG: D 依赖 B,C; B,C 都依赖 A → D 的祖先 = {A,B,C}', () => {
    const dag = new Map([
      ['a', []],
      ['b', ['a']],
      ['c', ['a']],
      ['d', ['b', 'c']],
    ])
    const ancestors = computeSlotAncestors('d', dag)
    expect(ancestors).toEqual(new Set(['a', 'b', 'c']))
  })

  test('自环防护: A → A 不应导致无限循环', () => {
    const dag = new Map([['a', ['a']]])
    const ancestors = computeSlotAncestors('a', dag)
    // A 自环：A 的祖先不应含 A 自身（visited 防环）
    expect(ancestors.has('a')).toBe(false)
  })

  test('间接自环: A → B → A 不死循环', () => {
    const dag = new Map([
      ['a', ['b']],
      ['b', ['a']],
    ])
    const ancestors = computeSlotAncestors('a', dag)
    // 有限集合
    expect(ancestors.size).toBeLessThanOrEqual(2)
  })

  test('不存在 slot → 空 ancestors', () => {
    const dag = new Map([['a', []]])
    const ancestors = computeSlotAncestors('nonexistent', dag)
    expect(ancestors.size).toBe(0)
  })

  test('entry slot（无 deps）→ 空 ancestors', () => {
    const dag = new Map([
      ['a', []],
      ['b', ['a']],
    ])
    expect(computeSlotAncestors('a', dag).size).toBe(0)
  })
})

// ───────── checkTaskDepsClosure ─────────

describe('checkTaskDepsClosure — v0.7.3 P5', () => {
  test('全部 deps 在闭包 → ok', () => {
    const idx = makeBlueprintsWithDeps({
      discuss: {},
      explore: { deps: ['discuss'] },
      design: { deps: ['explore'] },
    })
    const work = {
      tasks: [
        { name: 'task-a', boundary: 'explore', blueprint: 'oxn-blueprint', deps: ['discuss'] },
        { name: 'task-b', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['explore'] },
      ],
    }
    const r = checkTaskDepsClosure(work as never, idx)
    expect(r.ok).toBe(true)
  })

  test('task.deps 引用 slot 名（不是 task 名）→ 解析为 slot 闭包', () => {
    const idx = makeBlueprintsWithDeps({
      discuss: {},
      design: { deps: ['discuss', 'explore'] },
    })
    const work = {
      tasks: [{ name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['discuss'] }],
    }
    const r = checkTaskDepsClosure(work as never, idx)
    expect(r.ok).toBe(true)
  })

  test('task.deps 引用 unknown 名 → violation dep_unknown', () => {
    const idx = makeBlueprintsWithDeps({
      design: {},
    })
    const work = {
      tasks: [{ name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['nonexistent-task'] }],
    }
    const r = checkTaskDepsClosure(work as never, idx)
    if (r.ok) expect.unreachable()
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0]!.reason).toBe('dep_unknown')
    expect(r.violations[0]!.depName).toBe('nonexistent-task')
  })

  test('task.deps 引用非 ancestor slot → violation dep_slot_not_in_task_slot_closure', () => {
    const idx = makeBlueprintsWithDeps({
      discuss: {},
      explore: { deps: ['discuss'] },
      design: { deps: ['explore'] },
      compass: { deps: ['design'] },
    })
    const work = {
      tasks: [{ name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['compass'] }],
    }
    // compass 是 design 的下游，不在祖先闭包中
    const r = checkTaskDepsClosure(work as never, idx)
    if (r.ok) expect.unreachable()
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0]!.reason).toBe('dep_slot_not_in_task_slot_closure')
    expect(r.violations[0]!.boundary).toBe('design')
    expect(r.violations[0]!.depResolvedSlot).toBe('compass')
  })

  test('同 slot 内 task 互相依赖 → 通过（validSlots 包含自身）', () => {
    const idx = makeBlueprintsWithDeps({
      design: {},
    })
    const work = {
      tasks: [
        { name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: [] },
        { name: 'task-b', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['task-a'] },
        { name: 'task-c', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['task-b'] },
      ],
    }
    const r = checkTaskDepsClosure(work as never, idx)
    expect(r.ok).toBe(true)
  })

  test('task 无 boundary + 有 deps → violation task_has_no_boundary', () => {
    const idx = makeBlueprintsWithDeps({ design: {} })
    const work = {
      tasks: [{ name: 'task-a', boundary: '', blueprint: 'oxn-blueprint', deps: ['design'] }],
    }
    const r = checkTaskDepsClosure(work as never, idx)
    if (r.ok) expect.unreachable()
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0]!.reason).toBe('task_has_no_boundary')
  })

  test('task 无 boundary + 无 deps → 跳过（不产生违规）', () => {
    const idx = makeBlueprintsWithDeps({ design: {} })
    const work = {
      tasks: [{ name: 'task-a', boundary: '', blueprint: 'oxn-blueprint', deps: [] }],
    }
    const r = checkTaskDepsClosure(work as never, idx)
    expect(r.ok).toBe(true)
  })

  test('混合: 部分 deps 合规 + 部分越界 → 列出所有 violations', () => {
    const idx = makeBlueprintsWithDeps({
      discuss: {},
      explore: { deps: ['discuss'] },
      design: { deps: ['explore'] },
      compass: { deps: ['design'] },
    })
    const work = {
      tasks: [
        {
          name: 'task-a',
          boundary: 'design',
          blueprint: 'oxn-blueprint',
          deps: ['explore', 'nonexistent', 'compass'], // 合规 / unknown / 越界
        },
      ],
    }
    const r = checkTaskDepsClosure(work as never, idx)
    if (r.ok) expect.unreachable()
    expect(r.violations).toHaveLength(2)
    const reasons = r.violations.map((v) => v.reason).sort()
    expect(reasons).toEqual(['dep_slot_not_in_task_slot_closure', 'dep_unknown'])
  })
})

// ───────── collectAndThrowDagClosureViolations ─────────

describe('collectAndThrowDagClosureViolations — v0.7.3 P5', () => {
  test('deps 全合规 → 不 throw', () => {
    const idx = makeBlueprintsWithDeps({
      discuss: {},
      explore: { deps: ['discuss'] },
      design: { deps: ['explore'] },
    })
    const work = {
      tasks: [{ name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['explore'] }],
    }
    expect(() => collectAndThrowDagClosureViolations(work as never, idx)).not.toThrow()
  })

  test('DAG 闭包违规 → throw IAP_INTENT_TASK_DAG_VIOLATES_SLOT', () => {
    const idx = makeBlueprintsWithDeps({
      discuss: {},
      design: { deps: ['explore'] },
    })
    const work = {
      tasks: [{ name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['compass'] }],
    }
    try {
      collectAndThrowDagClosureViolations(work as never, idx)
      expect.unreachable()
    } catch (e) {
      const err = e as IAPError
      expect(err.name).toBe('IAP_INTENT_TASK_DAG_VIOLATES_SLOT')
      expect(err.code).toBe('TASK_DAG_VIOLATES_SLOT')
      expect(err.axis).toBe('INTENT')
      expect(String(err.action)).toBe('YIELD_TO_HUMAN')
      const ctx = err.context as { violations: Array<{ taskName: string; depName: string }> }
      expect(ctx.violations).toHaveLength(1)
      expect(ctx.violations[0]!.depName).toBe('compass')
    }
  })

  test('opts.skip === true → 跳过 throw（escape hatch）', () => {
    const idx = makeBlueprintsWithDeps({
      design: { deps: ['explore'] },
    })
    const work = {
      tasks: [{ name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['compass'] }],
    }
    expect(() => collectAndThrowDagClosureViolations(work as never, idx, { skip: true })).not.toThrow()
  })

  test('opts.skip === true + 合规 → 不 throw', () => {
    const idx = makeBlueprintsWithDeps({
      design: { deps: ['explore'] },
    })
    const work = {
      tasks: [{ name: 'task-a', boundary: 'design', blueprint: 'oxn-blueprint', deps: ['explore'] }],
    }
    expect(() => collectAndThrowDagClosureViolations(work as never, idx, { skip: true })).not.toThrow()
  })
})

// =============================================================================
// 🆕 v0.7.3 P7 (ADR-0061 §D6): Work ## Refs legacy kind: domain warn
// =============================================================================

// ───────── detectLegacyDomainRefs ─────────

describe('detectLegacyDomainRefs — v0.7.3 P7', () => {
  test('空 refs → []', () => {
    const work = { refs: [] }
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })

  test('refs 字段缺省 → []', () => {
    const work = {}
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })

  test('无 legacy ref（仅 blueprint）→ []', () => {
    const work = {
      refs: [{ kind: 'blueprint', name: 'oxn-blueprint', ref: '@prj/blueprints/oxn-blueprint' }],
    }
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })

  test('1 个 legacy ref → 返回带 refName + ref + suggestion', () => {
    const work = {
      refs: [
        { kind: 'domain', name: 'TrustChain', ref: '@prj/domains/TrustChain' },
        { kind: 'blueprint', name: 'oxn-blueprint', ref: '@prj/blueprints/oxn-blueprint' },
      ],
    }
    const r = detectLegacyDomainRefs(work as never)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({
      refName: 'TrustChain',
      ref: '@prj/domains/TrustChain',
    })
    expect(r[0]?.suggestion).toContain('Move to Blueprint ## Use')
    expect(r[0]?.suggestion).toContain('TrustChain')
  })

  test('多个 legacy ref → 全部列出', () => {
    const work = {
      refs: [
        { kind: 'domain', name: 'D1', ref: '@prj/domains/D1' },
        { kind: 'domain', name: 'D2', ref: '@prj/domains/D2' },
        { kind: 'blueprint', name: 'bp', ref: '@prj/blueprints/bp' },
      ],
    }
    const r = detectLegacyDomainRefs(work as never)
    expect(r).toHaveLength(2)
    expect(r.map((e) => e.refName).sort()).toEqual(['D1', 'D2'])
  })

  test('ref 字段缺省 → suggestion 退回 refName', () => {
    const work = {
      refs: [{ kind: 'domain', name: 'TrustChain' }],
    }
    const r = detectLegacyDomainRefs(work as never)
    expect(r).toHaveLength(1)
    expect(r[0]?.ref).toBeNull()
    expect(r[0]?.suggestion).toContain('TrustChain')
  })

  test('kind 是 stack → 不触发（stack 是 Work 级合法 kind）', () => {
    const work = {
      refs: [{ kind: 'stack', name: 'oxn-stack', ref: '@prj/stack/oxn-stack' }],
    }
    expect(detectLegacyDomainRefs(work as never)).toEqual([])
  })
})

// ───────── legacyDomainRefsToWarnings ─────────

describe('legacyDomainRefsToWarnings — v0.7.3 P7', () => {
  test('空数组 → []', () => {
    expect(legacyDomainRefsToWarnings([])).toEqual([])
  })

  test('1 个 entry → 1 条 warning 含 OXN_WORK_LEGACY_DOMAIN_REF', () => {
    const ws = legacyDomainRefsToWarnings([
      { refName: 'TrustChain', ref: '@prj/domains/TrustChain', suggestion: 'Move to Blueprint' },
    ])
    expect(ws).toHaveLength(1)
    expect(ws[0]).toContain('OXN_WORK_LEGACY_DOMAIN_REF')
    expect(ws[0]).toContain('TrustChain')
    expect(ws[0]).toContain('@prj/domains/TrustChain')
    expect(ws[0]).toContain('v0.8.0 will hard-block')
  })

  test('多 entry → 多 warnings', () => {
    const ws = legacyDomainRefsToWarnings([
      { refName: 'D1', ref: '@prj/domains/D1', suggestion: 's1' },
      { refName: 'D2', ref: null, suggestion: 's2' },
    ])
    expect(ws).toHaveLength(2)
  })
})
