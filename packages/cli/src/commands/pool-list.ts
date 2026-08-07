// =============================================================================
// pool-list.ts — DEPRECATED (v0.4.0 D1 2026-08-07)
//
// Intent Pool v3 已退役。请改用 `oxn draft list [--origin=insight]`。
// 此 CLI 兼容期 1 版本后随入口 `pool.ts` 移除；现仅抛 `OXN_POOL_DEPRECATED` 引导迁移。
// =============================================================================
// @ts-nocheck --deprecated
import { defineCommand } from 'citty'
import { outputUserInputError } from './output'

export default defineCommand({
  meta: {
    name: 'pool-list',
    description: '[DEPRECATED v0.4.0] Intent Pool v3 已退役，请改用 oxn draft',
  },
  args: { pool: { type: 'string', description: '(deprecated)' } },
  async run() {
    outputUserInputError(
      'OXN_POOL_DEPRECATED',
      'Intent Pool v3 已退役（v0.4.0 / D1 2026-08-07）—— 5 池机制吸收进 Draft（origin=insight）。',
      {
        suggestion: '改用 `oxn draft list --origin=insight` 列出 Insight 产出 Draft。此命令兼容 1 版本后彻底移除。',
      },
    )
  },
})
