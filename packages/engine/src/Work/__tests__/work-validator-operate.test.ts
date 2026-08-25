// =============================================================================
// work-validator-operate.test.ts — v0.7.4 stack-operation-referent (RFC-0024 §实施)
// collectAndThrowOperateViolations — inv-27 operate-subset-stack-operations + inv-28 operation-disambiguation
//
// 覆盖：
//   1. 单 Stack 单 tool 单 op → 通过
//   2. 单 Stack 单 tool 多 op → 通过
//   3. 单 Stack 多 tool 同名 op → OPERATION_AMBIGUOUS
//   4. 跨 Stack 同名 op → OPERATION_AMBIGUOUS
//   5. operate[] 项在 Stack tool.operations 找不到 → OPERATION_NOT_FOUND
//   6. 限定名 tool:operation 跳过消歧 → 通过
//   7. 限定名 tool:operation 但 tool 不匹配 → OPERATION_NOT_FOUND
//   8. 空 operate[] → 通过
//   9. 无 Blueprint 引用 Stack → 跳过校验
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { collectAndThrowOperateViolations } from '../work-validator'
import type { PerWorkBlueprintsIndex } from '../per-work-blueprints-merger'
import { IAPError } from '../../kernel'

let tmpDir: string
const workName = 'p1-operate-test'

const VALID_STACK_BODY = `---
entity: stack
version: 0.1.0
name: test-stack
abstract: test stack with operations
references: []
citations: 0
---

# Stack: test-stack

## Tools

### biome
- config: "biome.json"
- role: lint + format
- operations:
  - lint: "bun run check" — biome 全量 lint
  - format: "bun run format" — biome format

### bun-test
- command: "bun test"
- role: test runner
- operations:
  - test: "bun test" — 全量测试
  - test-filtered: "bun test --filter $PATTERN" — 按过滤器
`

const MULTI_STACK_GIT = `---
entity: stack
version: 0.1.0
name: test-git-stack
abstract: test git stack with same op name
references: []
citations: 0
---

# Stack: test-git-stack

## Tools

### git
- role: version control
- operations:
  - status: "git status" — git status op
`

function setupProject(): void {
  const stacksDir = join(tmpDir, '.openxenon', 'assets', 'stacks')
  mkdirSync(stacksDir, { recursive: true })
  writeFileSync(join(stacksDir, 'test-stack.md'), VALID_STACK_BODY)
  writeFileSync(join(stacksDir, 'test-git-stack.md'), MULTI_STACK_GIT)
}

function makeBlueprintsWithOperate(
  blueprints: Array<{
    name: string
    slots: Array<{ name: string; deps?: string[]; observe?: string[]; operate?: string[] }>
    stackRefs: Array<{ name: string; ref: string; scope: string; version: number; fileHash: string }>
    fileScope?: { allow: string[]; forbid: string[]; desc: string }
    contextTemplate?: string | null
    status?: 'ok' | 'invalid'
  }>,
): PerWorkBlueprintsIndex {
  return {
    schemaVersion: 1,
    workName,
    generatedAt: '2026-08-07T00:00:00.000Z',
    projectRoot: tmpDir,
    sourceHash: 'a'.repeat(64),
    declaredRefs: blueprints.map((b) => `@prj/blueprints/${b.name}`),
    blueprintCount: blueprints.length,
    invalidCount: 0,
    blueprints: blueprints.map((b) => ({
      name: b.name,
      scope: '@prj',
      file: `.openxenon/assets/blueprints/${b.name}.md`,
      status: b.status ?? 'ok',
      version: 1,
      slots: b.slots.map((s) => ({
        name: s.name,
        deps: s.deps ?? [],
        observe: s.observe ?? [],
        operate: s.operate ?? [],
      })),
      errors: [],
      ref: `@prj/blueprints/${b.name}`,
      domainRefs: [],
      workflowRefs: [],
      stackRefs: b.stackRefs as Array<{
        name: string
        kind: 'stack'
        ref: string
        scope: '@prj'
        version: number
        fileHash: string
      }>,
      nestedBlueprintRefs: [],
      fileScope: b.fileScope ?? { allow: [], forbid: [], desc: '' },
      contextTemplate: b.contextTemplate ?? null,
    })),
  }
}

const dummyWork = {} as Parameters<typeof collectAndThrowOperateViolations>[0]

const singleStackRef = [
  {
    name: 'test-stack',
    kind: 'stack' as const,
    ref: '@prj/stacks/test-stack',
    scope: '@prj' as const,
    version: 1,
    fileHash: 'a'.repeat(64),
  },
]

beforeEach(() => {
  tmpDir = join(tmpdir(), `p1-operate-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
  setupProject()
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

// ───────── 1. 通过 case ─────────

describe('collectAndThrowOperateViolations — v0.7.4 stack-operation-referent', () => {
  test('单 Stack 单 tool 单 op → 通过', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['test'] }],
        stackRefs: singleStackRef,
      },
    ])
    expect(() => collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)).not.toThrow()
  })

  test('单 Stack 单 tool 多 op → 通过', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['lint', 'format', 'test'] }],
        stackRefs: singleStackRef,
      },
    ])
    expect(() => collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)).not.toThrow()
  })

  test('空 operate[] → 通过', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: ['lint-check'], operate: [] }],
        stackRefs: singleStackRef,
      },
    ])
    expect(() => collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)).not.toThrow()
  })

  test('无 Blueprint 引用 Stack → 跳过校验', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'design', observe: [], operate: ['whatever'] }],
        stackRefs: [],
      },
    ])
    expect(() => collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)).not.toThrow()
  })

  // ───────── 2. 消歧 ─────────

  test('限定名 tool:operation 跳过消歧 → 通过', () => {
    // biome 与 bun-test 都声明了同名 op 时，用限定名直接定位
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [
          { name: 's1', observe: [], operate: ['bun-test:test'] },
          { name: 's2', observe: [], operate: ['biome:lint'] },
        ],
        stackRefs: singleStackRef,
      },
    ])
    expect(() => collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)).not.toThrow()
  })

  test('单 tool 多 op 但无重名 → 不消歧', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['lint', 'format', 'test', 'test-filtered'] }],
        stackRefs: singleStackRef,
      },
    ])
    expect(() => collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)).not.toThrow()
  })

  // ───────── 3. NOT_FOUND ─────────

  test('operate 名在 Stack 找不到 → OPERATION_NOT_FOUND', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['nonexistent'] }],
        stackRefs: singleStackRef,
      },
    ])
    const ws = collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx); expect(ws.length).toBeGreaterThan(0)
    try {
      collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)
    } catch (e) {
      expect((e as IAPError).code).toBe('OPERATION_NOT_FOUND')
      expect((e as IAPError).message).toContain('nonexistent')
    }
  })

  test('限定名 tool:op 但 tool 不存在 → OPERATION_NOT_FOUND', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['no-such-tool:test'] }],
        stackRefs: singleStackRef,
      },
    ])
    const ws = collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx); expect(ws.length).toBeGreaterThan(0)
    try {
      collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)
    } catch (e) {
      expect((e as IAPError).code).toBe('OPERATION_NOT_FOUND')
    }
  })

  test('限定名 tool:op 但 op 在 tool 下不存在 → OPERATION_NOT_FOUND', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['biome:no-such-op'] }],
        stackRefs: singleStackRef,
      },
    ])
    const ws = collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx); expect(ws.length).toBeGreaterThan(0)
    try {
      collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)
    } catch (e) {
      expect((e as IAPError).code).toBe('OPERATION_NOT_FOUND')
    }
  })

  // ───────── 4. AMBIGUOUS（通过在第二个 Stack 制造同名 op） ─────────

  test('跨 Stack 同名 op → OPERATION_AMBIGUOUS', () => {
    // test-stack 的 bun-test 声明了 test
    // 第二个 stack 也声明了 test op → 歧义
    const multiStackBody = `---
entity: stack
version: 0.1.0
name: test-alt-stack
abstract: alternative stack with same test op
references: []
citations: 0
---

# Stack: test-alt-stack

## Tools

### vitest
- command: "vitest"
- role: alt test runner
- operations:
  - test: "vitest" — alt 全量测试
`
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'stacks', 'test-alt-stack.md'), multiStackBody)

    const dualRef = [
      ...singleStackRef,
      {
        name: 'test-alt-stack',
        kind: 'stack' as const,
        ref: '@prj/stacks/test-alt-stack',
        scope: '@prj' as const,
        version: 1,
        fileHash: 'c'.repeat(64),
      },
    ]
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['test'] }],
        stackRefs: dualRef,
      },
    ])
    const ws = collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx); expect(ws.length).toBeGreaterThan(0)
    try {
      collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)
    } catch (e) {
      expect((e as IAPError).code).toBe('OPERATION_AMBIGUOUS')
      expect((e as IAPError).message).toContain('test')
      expect((e as IAPError).message).toContain('bun-test:test')
      expect((e as IAPError).message).toContain('vitest:test')
    }
  })

  test('消歧后用限定名 → 通过', () => {
    const multiStackBody = `---
entity: stack
version: 0.1.0
name: test-alt-stack
abstract: alternative stack with same test op
references: []
citations: 0
---

# Stack: test-alt-stack

## Tools

### vitest
- command: "vitest"
- operations:
  - test: "vitest"
`
    writeFileSync(join(tmpDir, '.openxenon', 'assets', 'stacks', 'test-alt-stack.md'), multiStackBody)
    const dualRef = [
      ...singleStackRef,
      {
        name: 'test-alt-stack',
        kind: 'stack' as const,
        ref: '@prj/stacks/test-alt-stack',
        scope: '@prj' as const,
        version: 1,
        fileHash: 'c'.repeat(64),
      },
    ]
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [{ name: 'verify', observe: [], operate: ['bun-test:test', 'vitest:test'] }],
        stackRefs: dualRef,
      },
    ])
    expect(() => collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)).not.toThrow()
  })

  // ───────── 5. 多 slot 聚合 ─────────

  test('多 slot 中只有一个违规 → 抛出该违规', () => {
    const idx = makeBlueprintsWithOperate([
      {
        name: 'bp',
        slots: [
          { name: 's1', observe: [], operate: ['lint'] },
          { name: 's2', observe: [], operate: ['nonexistent'] },
        ],
        stackRefs: singleStackRef,
      },
    ])
    const ws = collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx); expect(ws.length).toBeGreaterThan(0)
    try {
      collectAndThrowOperateViolations(dummyWork, tmpDir, workName, idx)
    } catch (e) {
      expect((e as IAPError).code).toBe('OPERATION_NOT_FOUND')
      expect((e as IAPError).message).toContain('slot "s2"')
      expect((e as IAPError).message).toContain('nonexistent')
    }
  })
})
