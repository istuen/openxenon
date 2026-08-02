// =============================================================================
// work-validator-dag.test.ts — v0.7.3 P5 (ADR-0061 §D4) Workflow slot DAG closure check
//
// 覆盖：
//   5. buildSlotDAG: 合并多 Blueprint slots
//   6. computeSlotAncestors: 链式 / 菱形 / 自环
//   7. checkTaskDepsClosure:
//      - 全部 deps 在闭包 → ok
//      - deps 引用 unknown → violation 'dep_unknown'
//      - deps 引用非 ancestor → violation 'dep_slot_not_in_task_slot_closure'
//      - 同 slot 内 task 互相依赖 → 通过
//      - task 无 boundary + 有 deps → violation 'task_has_no_boundary'
//   8. collectAndThrowDagClosureViolations: opts.skip 跳过 throw
//
// ADR-0088 P6 (2026-08-02 phase 3.4)：从 work-validator.test.ts 拆出 P5 部分
// =============================================================================

import { describe, expect, test } from 'bun:test'
import {
  buildSlotDAG,
  computeSlotAncestors,
  checkTaskDepsClosure,
  collectAndThrowDagClosureViolations,
} from '../work-validator'
import type { PerWorkBlueprintsIndex } from '../per-work-blueprints-merger'
import type { IAPError } from '../../kernel'

const workName = 'p5-test-work'

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
    projectRoot: '/tmp',
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
    projectRoot: '/tmp',
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
          design: { deps: ['compass'] },
        },
      },
    ])
    const dag = buildSlotDAG(idx)
    expect(dag.size).toBe(2)
    expect(dag.get('explore')).toEqual(['discuss'])
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
    expect(ancestors.has('a')).toBe(false)
  })

  test('间接自环: A → B → A 不死循环', () => {
    const dag = new Map([
      ['a', ['b']],
      ['b', ['a']],
    ])
    const ancestors = computeSlotAncestors('a', dag)
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
          deps: ['explore', 'nonexistent', 'compass'],
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
