// =============================================================================
// pool-review.ts — DEPRECATED (v0.4.0 D1 2026-08-07)
//
// Intent Pool v3 已退役—— review 闸门已废弃，决策走 `oxn draft promote --target=<rfc|asset|work>`。
// 此 CLI 兼容期 1 版本后随入口 `pool.ts` 移除；现仅抛 `OXN_POOL_DEPRECATED` 引导迁移。
// =============================================================================
// @ts-nocheck --deprecated
import { defineCommand } from 'citty'
import { outputUserInputError } from './output'

export default defineCommand({
  meta: {
    name: 'pool-review',
    description: '[DEPRECATED v0.4.0] Intent Pool v3 已退役，请改用 oxn draft',
  },
  args: {
    slug: { type: 'positional', required: true, description: '(deprecated)' },
    '--json': { type: 'boolean', description: '(deprecated)' },
  },
  run() {
    outputUserInputError(
      'OXN_POOL_DEPRECATED',
      'Intent Pool v3 已退役（v0.4.0 / D1 2026-08-07）—— 5 池机制吸收进 Draft（origin=insight）。',
      {
        suggestion:
          '改用 `oxn draft list --origin=insight` + `oxn draft show <slug>` 检视；决策走 `oxn draft promote --target=<rfc|asset|work>` 或 `oxn draft archive`。',
      },
    )
  },
})
