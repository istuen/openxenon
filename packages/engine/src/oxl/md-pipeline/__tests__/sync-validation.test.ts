// =============================================================================
// sync-validation.test.ts — v0.4 Phase 2 sync-validation 单元测试
//
// 覆盖:
//   - validateOxnParseable: langium parse 验证
//   - verifyDomainRoundTrip: round-trip-loss 检测
//   - verifyBlueprintRoundTrip
//   - verifyWorkRoundTrip
//   - diffXxxIR 字段比较
// =============================================================================

import { describe, expect, test } from 'bun:test'
import {
  validateOxnParseable,
  verifyDomainRoundTrip,
  verifyBlueprintRoundTrip,
  verifyWorkRoundTrip,
  diffDomainIR,
  diffBlueprintIR,
  diffWorkIR,
} from '../sync-validation'
import type { DomainIR } from '../transformers/domain'
import type { BlueprintIR } from '../transformers/blueprint'
import type { WorkIR } from '../transformers/work'
import { serializeDomainToOxn, serializeBlueprintToOxn, serializeWorkToOxn } from '../oxn-serializer'

const baseDomainIR: DomainIR = {
  entity: 'domain',
  name: 'TestContext',
  version: '0.3.0',
  description: 'Test domain for sync-validation unit tests',
  terms: [
    { id: 't1', name: 'Foo', desc: 'Foo description' },
    { id: 't2', name: 'Bar', desc: 'Bar description' },
  ],
  bans: [{ id: 'b1', items: ['bad1', 'bad2'], desc: 'no bad words' }],
  invariants: [{ id: 'i1', value: 'Rule 1: must be valid', desc: 'rule desc' }],
  stack: [],
  _counters: { termIdx: 2, banIdx: 1, invIdx: 1, stackIdx: 0 },
}

const baseBlueprintIR: BlueprintIR = {
  entity: 'blueprint',
  name: 'test-bp',
  version: '1',
  description: 'Test blueprint',
  props: [{ name: 'timeout', type: 'number', values: [], required: false, default: '60000' }],
  slots: [
    { name: 'build', deps: [], observe: ['deps-resolved'] },
    { name: 'develop', deps: ['build'], observe: ['lint'] },
  ],
  _counters: { propIdx: 1, slotIdx: 2 },
}

const baseWorkIR: WorkIR = {
  entity: 'work',
  name: 'test-work',
  version: '0.3.0',
  context: { goal: 'Test goal', maxIterations: 3, constraints: ['C1'] },
  refs: [],
  tasks: [
    {
      name: 'step-1',
      domain: null,
      blueprint: 'test-bp',
      parts: [{ name: 'build', skillContext: 'build stuff', probes: [] }],
    },
  ],
  proofs: [],
  _counters: { refIdx: 0, taskIdx: 1 },
}

describe('validateOxnParseable', () => {
  test('valid .oxn returns ok=true with no errors', async () => {
    const oxn = serializeDomainToOxn(baseDomainIR)
    const result = await validateOxnParseable(oxn)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  test('invalid .oxn (broken syntax) returns ok=false', async () => {
    const broken = 'domain "X" { term {'
    const result = await validateOxnParseable(broken)
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('non-domain text returns ok=false', async () => {
    const result = await validateOxnParseable('just some text')
    expect(result.ok).toBe(false)
  })
})

describe('verifyDomainRoundTrip', () => {
  test('round-trip succeeds: all fields preserved', async () => {
    const oxn = serializeDomainToOxn(baseDomainIR)
    const result = await verifyDomainRoundTrip(baseDomainIR, oxn)
    expect(result.ok).toBe(true)
    expect(result.lostFields).toEqual([])
  })

  test('round-trip detects term count loss', async () => {
    const oxn = serializeDomainToOxn(baseDomainIR)
    // 模拟丢失: 改 oxn 让 .md 解析时少一个 term
    const broken = oxn.replace('"Foo": "Foo description"\n', '')
    const result = await verifyDomainRoundTrip(baseDomainIR, broken)
    // 期望: ok=false 且 lostFields 含 terms 数差
    expect(result.ok).toBe(false)
    expect(result.lostFields.some((l) => l.startsWith('terms'))).toBe(true)
  })

  test('langium parse error returns ok=false with errors', async () => {
    const broken = 'domain "X" { term {'
    const result = await verifyDomainRoundTrip(baseDomainIR, broken)
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('verifyBlueprintRoundTrip', () => {
  test('round-trip succeeds: slots/props preserved', async () => {
    const oxn = serializeBlueprintToOxn(baseBlueprintIR)
    const result = await verifyBlueprintRoundTrip(baseBlueprintIR, oxn)
    expect(result.ok).toBe(true)
    expect(result.lostFields).toEqual([])
  })

  test('slot count loss detected', async () => {
    const oxn = serializeBlueprintToOxn(baseBlueprintIR)
    const broken = oxn.replace(/slot "develop" \{[^}]+\}/, '')
    const result = await verifyBlueprintRoundTrip(baseBlueprintIR, broken)
    expect(result.ok).toBe(false)
    expect(result.lostFields.some((l) => l.startsWith('slots'))).toBe(true)
  })
})

describe('verifyWorkRoundTrip', () => {
  test('round-trip succeeds: tasks preserved', async () => {
    const oxn = serializeWorkToOxn(baseWorkIR)
    const result = await verifyWorkRoundTrip(baseWorkIR, oxn)
    expect(result.ok).toBe(true)
    expect(result.lostFields).toEqual([])
  })
})

describe('diffXxxIR', () => {
  test('diffDomainIR: same IR returns empty array', () => {
    expect(diffDomainIR(baseDomainIR, baseDomainIR)).toEqual([])
  })

  test('diffDomainIR: name change detected', () => {
    const modified = { ...baseDomainIR, name: 'DifferentName' }
    const lost = diffDomainIR(baseDomainIR, modified)
    expect(lost).toHaveLength(1)
    expect(lost[0]).toContain('name')
  })

  test('diffDomainIR: term count change detected', () => {
    const modified = { ...baseDomainIR, terms: baseDomainIR.terms.slice(0, 1) }
    const lost = diffDomainIR(baseDomainIR, modified)
    expect(lost.some((l) => l.startsWith('terms'))).toBe(true)
  })

  test('diffBlueprintIR: prop loss detected', () => {
    const modified = { ...baseBlueprintIR, props: [] }
    const lost = diffBlueprintIR(baseBlueprintIR, modified)
    expect(lost.some((l) => l.startsWith('props'))).toBe(true)
  })

  test('diffWorkIR: task loss detected', () => {
    const modified = { ...baseWorkIR, tasks: [] }
    const lost = diffWorkIR(baseWorkIR, modified)
    expect(lost.some((l) => l.startsWith('tasks'))).toBe(true)
  })
})
