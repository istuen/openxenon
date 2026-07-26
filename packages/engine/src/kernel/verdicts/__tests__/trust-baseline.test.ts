import { describe, expect, it } from 'bun:test'
import { applyTrustBaseline, TRUST_BASELINE } from '../trust-baseline'
import type { ProbeOutcome } from '../../contracts/probe-port'

/**
 * v0.2 T4 Probe Signal Taint v2 PR-1: trust-baseline 单元测试
 *
 * 覆盖父文档 T1.5 表 10+ case:
 * - 无 flag 透传 / YELLOW 透传 / 单 RED 短路 / 多 RED 短路
 * - 混合 YELLOW+RED / 未知 flag
 * - frozen.json 老格式 (无 interference 字段)
 * - TRUST_BASELINE 不可变
 * - TRUST_BASELINE 12 项全映射
 */

// ───────── helper: 构造一个 fake normalJudge ─────────

function makeNormalJudge(passed = true, message = 'fake normalJudge'): () => ProbeOutcome {
  return () => ({
    outcome: passed ? 'COMPLETED' : 'DEVIATED',
    passed,
    message,
  })
}

describe('TRUST_BASELINE 配置契约', () => {
  it('12 项 InterferenceFlag 全部映射（无 undefined）', () => {
    const allFlags = Object.keys(TRUST_BASELINE) as Array<keyof typeof TRUST_BASELINE>
    expect(allFlags).toHaveLength(12)
    for (const flag of allFlags) {
      const outcome = TRUST_BASELINE[flag]
      expect(['RED', 'YELLOW']).toContain(outcome)
    }
  })

  it('Object.freeze 后修改抛错（开发态）', () => {
    expect(() => {
      // @ts-expect-error - 故意违反 readonly 测运行时行为
      ;(TRUST_BASELINE as { waf_detected?: string }).waf_detected = 'YELLOW'
    }).toThrow()
  })

  it('RED flag 集合（8 项）：waf / just_modified / detached_head / shallow_clone / sandbox_violation / network_timeout / response_truncated / permission_denied / unknown', () => {
    expect(TRUST_BASELINE.waf_detected).toBe('RED')
    expect(TRUST_BASELINE.just_modified).toBe('RED')
    expect(TRUST_BASELINE.detached_head).toBe('RED')
    expect(TRUST_BASELINE.shallow_clone).toBe('RED')
    expect(TRUST_BASELINE.sandbox_violation).toBe('RED')
    expect(TRUST_BASELINE.network_timeout).toBe('RED')
    expect(TRUST_BASELINE.response_truncated).toBe('RED')
    expect(TRUST_BASELINE.permission_denied).toBe('RED')
    expect(TRUST_BASELINE.unknown).toBe('RED')
  })

  it('YELLOW flag 集合（4 项）：cdn_cache / cache_path / symlink', () => {
    // 父文档列了 3 项 YELLOW；如有第 4 项需额外确认
    expect(TRUST_BASELINE.cdn_cache).toBe('YELLOW')
    expect(TRUST_BASELINE.cache_path).toBe('YELLOW')
    expect(TRUST_BASELINE.symlink).toBe('YELLOW')
  })
})

describe('applyTrustBaseline - flag 处理', () => {
  it('无 flag 透传：走 normalJudge，结果不变', () => {
    const judge = makeNormalJudge(true, 'original pass')
    const v = applyTrustBaseline([], judge)
    expect(v.outcome).toBe('COMPLETED')
    expect(v.passed).toBe(true)
    expect(v.message).toBe('original pass')
    expect(v.interferenceFlags).toBeUndefined()
  })

  it('YELLOW flag 透传：verdict 透传 + interferenceFlags 记录', () => {
    const judge = makeNormalJudge(true, 'cdn cached pass')
    const v = applyTrustBaseline(['cdn_cache'], judge)
    expect(v.outcome).toBe('COMPLETED')
    expect(v.passed).toBe(true)
    expect(v.message).toBe('cdn cached pass')
    expect(v.interferenceFlags).toEqual(['cdn_cache'])
  })

  it('多 YELLOW flags 全部记录', () => {
    const judge = makeNormalJudge(false, 'original fail')
    const v = applyTrustBaseline(['cdn_cache', 'cache_path'], judge)
    expect(v.outcome).toBe('DEVIATED')
    expect(v.passed).toBe(false)
    expect(v.interferenceFlags).toEqual(['cdn_cache', 'cache_path'])
  })

  it('单 RED flag 短路：verdict = INCONCLUSIVE, passed: false', () => {
    const judge = makeNormalJudge(true, 'normalJudge 不应被调用')
    const v = applyTrustBaseline(['waf_detected'], judge)
    expect(v.outcome).toBe('INCONCLUSIVE')
    expect(v.passed).toBe(false)
    expect(v.message).toContain('signal tainted by 1 red flag(s): waf_detected')
    expect(v.failureMessage).toContain('INCONCLUSIVE: waf_detected — YIELD_TO_HUMAN required')
  })

  it('多 RED flags 短路：message 含全部 flag', () => {
    const judge = makeNormalJudge()
    const v = applyTrustBaseline(['waf_detected', 'just_modified'], judge)
    expect(v.outcome).toBe('INCONCLUSIVE')
    expect(v.message).toContain('signal tainted by 2 red flag(s)')
    expect(v.message).toContain('waf_detected')
    expect(v.message).toContain('just_modified')
  })

  it('混合 YELLOW + RED：RED 优先（短路）', () => {
    const judge = makeNormalJudge()
    const v = applyTrustBaseline(['cdn_cache', 'network_timeout'], judge)
    expect(v.outcome).toBe('INCONCLUSIVE')
    // RED flag 应在 message 中
    expect(v.message).toContain('network_timeout')
  })

  it('未知 flag（"unknown"）：默认 RED 短路', () => {
    const judge = makeNormalJudge()
    const v = applyTrustBaseline(['unknown'], judge)
    expect(v.outcome).toBe('INCONCLUSIVE')
  })

  it('sandbox_violation flag（PR-4 触发）→ RED', () => {
    const judge = makeNormalJudge()
    const v = applyTrustBaseline(['sandbox_violation'], judge)
    expect(v.outcome).toBe('INCONCLUSIVE')
    expect(v.failureMessage).toContain('sandbox_violation')
  })

  it('permission_denied flag（修正父文档笔误）→ RED', () => {
    const judge = makeNormalJudge()
    const v = applyTrustBaseline(['permission_denied' as never], judge)
    // permission_denied 不在 TRUST_BASELINE 12 项中（父文档笔误 "permission denied"），
    // 走 unknown fallback → RED
    expect(v.outcome).toBe('INCONCLUSIVE')
  })

  it('actual 字段含 redFlags + allFlags', () => {
    const judge = makeNormalJudge()
    const v = applyTrustBaseline(['waf_detected', 'cdn_cache', 'just_modified'], judge)
    expect(v.actual).toEqual({
      redFlags: ['waf_detected', 'just_modified'],
      allFlags: ['waf_detected', 'cdn_cache', 'just_modified'],
    })
  })
})

describe('applyTrustBaseline - 透传路径（AC-2 守护）', () => {
  it('无 flag + normalJudge 失败：返回 FAIL（非 INCONCLUSIVE）', () => {
    const judge = makeNormalJudge(false, 'real fail')
    const v = applyTrustBaseline([], judge)
    expect(v.outcome).toBe('DEVIATED')
    expect(v.passed).toBe(false)
    expect(v.message).toBe('real fail')
  })

  it('YELLOW + normalJudge 成功：返回 PASS + 记录 flag', () => {
    const judge = makeNormalJudge(true, 'symlinked pass')
    const v = applyTrustBaseline(['symlink'], judge)
    expect(v.outcome).toBe('COMPLETED')
    expect(v.passed).toBe(true)
    expect(v.message).toBe('symlinked pass')
    expect(v.interferenceFlags).toEqual(['symlink'])
  })

  it('normalJudge 不被调用当 RED flag 存在', () => {
    let called = false
    const judge = (): ProbeOutcome => {
      called = true
      return { outcome: 'COMPLETED', passed: true, message: 'should not run' }
    }
    applyTrustBaseline(['waf_detected'], judge)
    expect(called).toBe(false)
  })
})
