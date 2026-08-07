// =============================================================================
// pool-reject.ts — DEPRECATED (v0.4.0 D1 2026-08-07)
//
// Intent Pool v3 已退役—— reject 闸门已废弃，废弃走 `oxn draft discard --force`。
// 此 CLI 兼容期 1 版本后随入口 `pool.ts` 移除；现仅抛 `OXN_POOL_DEPRECATED` 引导迁移。
// =============================================================================
// @ts-nocheck --deprecated
import { defineCommand } from 'citty'
import { outputUserInputError } from './output'

export default defineCommand({
  meta: {
    name: 'pool-reject',
    description: '[DEPRECATED v0.4.0] Intent Pool v3 已退役，请改用 oxn draft',
  },
  args: {
    slug: { type: 'positional', required: true, description: '(deprecated)' },
    reason: { type: 'string', required: true, description: '(deprecated)' },
    operator: { type: 'string', description: '(deprecated)' },
    '--json': { type: 'boolean', description: '(deprecated)' },
  },
  run() {
    outputUserInputError(
      'OXN_POOL_DEPRECATED',
      'Intent Pool v3 已退役（v0.4.0 / D1 2026-08-07）—— reject 闸门已废弃。',
      {
        suggestion:
          '改用 `oxn draft discard --force` 废弃；或 `oxn draft retarget --new-target=<rfc|asset|work>` 重路由。',
      },
    )
  },
})
