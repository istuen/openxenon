// =============================================================================
// Probe Catalog Tests (v0.1.2 Phase C: 封装边界)
//
// 验证 catalog 是 AI ↔ OXN 内部之间的封装层：
//   - AI 看到的（list/describe）不含 @oxn/probe 实现细节
//   - AI 调 add 时的输入契约是 semanticName + inputs[]
//   - 翻译层正确：semanticName → internalRef, input → inputMap
// =============================================================================

import { beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  assertCatalogConsistency,
  describeProbe,
  listProbesSummary,
  PROBE_CATALOG,
  translateProbeInputs,
} from '../../kernel/probes/catalog'
import { IAPError, IAPAction, isIAPError } from '../../core/errors'

// -----------------------------------------------------------------------------
// 封装边界：AI 看到的（listProbesSummary / describeProbe）不能泄漏内部
// -----------------------------------------------------------------------------

describe('AI-visible layer: no implementation leak', () => {
  test('listProbesSummary 不含 @oxn/probe(s) ref', () => {
    const summary = listProbesSummary()
    const json = JSON.stringify(summary)
    expect(json).not.toMatch(/@oxn\/probe/)
    expect(json).not.toMatch(/@oxn\/probes/)
  })

  test('listProbesSummary 不含实现细节（exitCode / statSync / spawn）', () => {
    const summary = listProbesSummary()
    const json = JSON.stringify(summary)
    expect(json).not.toMatch(/exitCode|statSync|spawn|child_process/)
  })

  test('listProbesSummary 至少 2 个 probe', () => {
    const summary = listProbesSummary()
    expect(summary.length).toBeGreaterThanOrEqual(2)
    // 每个 entry 都有 name / description / requiredInputs
    for (const p of summary) {
      expect(p.name).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(Array.isArray(p.requiredInputs)).toBe(true)
    }
  })

  test('describeProbe fs-exists 返回 inputs 但不含 verdict 逻辑', () => {
    const info = describeProbe('fs-exists')
    expect(info).not.toBeNull()
    const json = JSON.stringify(info)
    expect(json).not.toMatch(/exitCode|statSync|spawn|child_process/)
    // 不暴露 verdict 规则的精确数（hit >= 1）
    expect(json).not.toMatch(/>=\s*\d/)
  })

  test('describeProbe shell-exec 返回 inputs 但不含 verdict 逻辑', () => {
    const info = describeProbe('shell-exec')
    expect(info).not.toBeNull()
    const json = JSON.stringify(info)
    expect(json).not.toMatch(/exitCode|statSync|spawn|child_process/)
  })

  test('describeProbe unknown 返回 null', () => {
    const info = describeProbe('does-not-exist')
    expect(info).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// 翻译层：semanticName → internalRef, inputs → inputMap
// -----------------------------------------------------------------------------

describe('Translation layer (AI inputs → Infra params)', () => {
  test('fs-exists + {path} → {pattern}', () => {
    const r = translateProbeInputs('fs-exists', { path: './dist/index.js' })
    expect(r.internalRef).toBe('@oxn/probes/fs-exists')
    expect(r.internalParams).toEqual({ pattern: './dist/index.js' })
  })

  test('shell-exec + {command, timeout} → {command, timeout}', () => {
    const r = translateProbeInputs('shell-exec', { command: 'bun test', timeout: 60000 })
    expect(r.internalRef).toBe('@oxn/probes/shell-exec')
    expect(r.internalParams).toEqual({ command: 'bun test', timeout: 60000 })
  })

  test('fs-exists 缺 path → IAPError (PROOF/INFRA_FAIL)', () => {
    try {
      translateProbeInputs('fs-exists', {})
      expect(true).toBe(false) // 不应到达
    } catch (err) {
      expect(isIAPError(err)).toBe(true)
      const e = err as IAPError
      expect(e.axis).toBe('PROOF')
      expect(e.code).toBe('INFRA_FAIL')
      expect(e.action).toBe(IAPAction.YIELD_TO_HUMAN)
      expect(e.name).toBe('IAP_PROOF_INFRA_FAIL')
      expect(e.context).toMatchObject({ probe: 'fs-exists', input: 'path', reason: 'input_missing' })
    }
  })

  test('fs-exists path 类型错（number）→ IAPError (PROOF/INFRA_FAIL)', () => {
    try {
      translateProbeInputs('fs-exists', { path: 42 })
      expect(true).toBe(false) // 不应到达
    } catch (err) {
      expect(isIAPError(err)).toBe(true)
      const e = err as IAPError
      expect(e.axis).toBe('PROOF')
      expect(e.code).toBe('INFRA_FAIL')
      expect(e.context).toMatchObject({
        probe: 'fs-exists',
        input: 'path',
        actualType: 'number',
        expectedType: 'string',
        reason: 'input_type_mismatch',
      })
    }
  })

  test('unknown probe → IAPError (PROOF/INFRA_FAIL, reason: unknown_semantic_name)', () => {
    try {
      translateProbeInputs('does-not-exist', {})
      expect(true).toBe(false) // 不应到达
    } catch (err) {
      expect(isIAPError(err)).toBe(true)
      const e = err as IAPError
      expect(e.name).toBe('IAP_PROOF_INFRA_FAIL')
      expect(e.context).toMatchObject({ probe: 'does-not-exist', reason: 'unknown_semantic_name' })
    }
  })

  test('shell-exec timeout 是 optional，缺它不报错', () => {
    const r = translateProbeInputs('shell-exec', { command: 'ls' })
    expect(r.internalParams).toEqual({ command: 'ls' })
  })
})

// -----------------------------------------------------------------------------
// catalog 内部不变量
// -----------------------------------------------------------------------------

describe('Catalog invariants', () => {
  test('assertCatalogConsistency 通过', () => {
    const r = assertCatalogConsistency()
    expect(r.ok).toBe(true)
  })

  test('每个 entry 的 inputMap keys ⊆ inputs[].names', () => {
    for (const entry of PROBE_CATALOG) {
      const inputNames = new Set(entry.inputs.map((i) => i.name))
      for (const k of Object.keys(entry.inputMap)) {
        expect(inputNames.has(k)).toBe(true)
      }
    }
  })

  test('每个 entry 的 inputs[].name 唯一', () => {
    for (const entry of PROBE_CATALOG) {
      const seen = new Set<string>()
      for (const inp of entry.inputs) {
        expect(seen.has(inp.name)).toBe(false)
        seen.add(inp.name)
      }
    }
  })

  test('每个 entry 有 required 字段', () => {
    for (const entry of PROBE_CATALOG) {
      expect(entry.semanticName).toBeTruthy()
      expect(entry.internalRef).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect(Array.isArray(entry.inputs)).toBe(true)
      expect(Array.isArray(entry.examples)).toBe(true)
      expect(entry.builtin).toBe('oxn')
    }
  })
})
