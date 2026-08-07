// =============================================================================
// pool-approve.ts — DEPRECATED (v0.4.0 D1 2026-08-07)
//
// Intent Pool v3 已退役—— approve 闸门已废弃，决策走 `oxn draft promote --target=<rfc|asset|work>`。
// 此 CLI 兼容期 1 版本后随入口 `pool.ts` 移除；现仅抛 `OXN_POOL_DEPRECATED` 引导迁移。
// =============================================================================
// @ts-nocheck --deprecated
import { defineCommand } from 'citty'
import { outputUserInputError } from './output'

export default defineCommand({
  meta: {
    name: 'pool-approve',
    description: '[DEPRECATED v0.4.0] Intent Pool v3 已退役，请改用 oxn draft',
  },
  args: {
    slug: { type: 'positional', required: true, description: '(deprecated)' },
    'dry-run': { type: 'boolean', description: '(deprecated)' },
    operator: { type: 'string', description: '(deprecated)' },
    '--json': { type: 'boolean', description: '(deprecated)' },
  },
  run() {
    outputUserInputError(
      'OXN_POOL_DEPRECATED',
      'Intent Pool v3 已退役（v0.4.0 / D1 2026-08-07）—— approve 闸门已废弃。',
      {
        suggestion: '改用 `oxn draft promote --target=<rfc|asset|work>` 升华为决定；或 `oxn draft archive` 搁置。',
      },
    )
  },
})
