// =============================================================================
// work-finalize.ts (v0.2 Sprint 5d T12 - Three-Layer Proof v2 PR-2)
// =============================================================================

import { defineCommand } from 'citty'
import { IAPError, IAPAction } from '../kernel/index'
import { finalizeWorkDomains } from '../infra/frozen/work-domains'

export const workFinalizeSubcommand = defineCommand({
  meta: {
    name: 'work-finalize',
    description: 'Finalize work with domain proof evaluation (L2 Proof — hard-block on FAIL)',
  },
  args: {
    work: { type: 'positional', required: true, description: 'Work identifier' },
    force: { type: 'boolean', default: false, description: 'Force finalize even with FAIL (DANGEROUS)' },
  },
  async run({ args }) {
    const workId = args.work as string

    // T12 PoC: CLI not wired; use finalizeWorkDomains() programmatically
    throw new IAPError(
      'PROOF',
      'INFRA_FAIL',
      IAPAction.YIELD_TO_HUMAN,
      'oxn work finalize — T12 PR-2 CLI (domain proof evaluation). ' +
        'Use finalizeWorkDomains() programmatically or see tests for PoC.',
      { workId },
    )
  },
})

// 导出核心函数供测试
export { finalizeWorkDomains }
