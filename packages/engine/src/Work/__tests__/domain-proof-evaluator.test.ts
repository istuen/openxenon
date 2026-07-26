// =============================================================================
// domain-proof-evaluator.test.ts (T12)
// =============================================================================
import { describe, expect, test } from 'bun:test'
import { evaluateDomainProof } from '@openxenon/engine/infra/frozen/domain-proof-evaluator'

describe('evaluateDomainProof (T12)', () => {
  test('script exit 0 → PASS', async () => {
    const r = await evaluateDomainProof('members', 'pass-check', 'true')
    expect(r.outcome).toBe('COMPLETED')
  })

  test('script exit 1 → FAIL', async () => {
    const r = await evaluateDomainProof('members', 'fail-check', 'false')
    expect(r.outcome).toBe('DEVIATED')
    expect(r.failureMessage).toMatch(/exit 1/)
  })

  test('manual → MANUAL_PENDING', async () => {
    const r = await evaluateDomainProof('members', 'manual-check', undefined, 'manually verify X')
    expect(r.outcome).toBe('MANUAL_PENDING')
    expect(r.failureMessage).toMatch(/manual assessment/)
  })

  test('project scope → MANUAL_PENDING', async () => {
    const r = await evaluateDomainProof('members', 'project-inv', 'exit 0', undefined, 'project')
    expect(r.outcome).toBe('MANUAL_PENDING')
    expect(r.failureMessage).toMatch(/scope=project/)
  })
})
