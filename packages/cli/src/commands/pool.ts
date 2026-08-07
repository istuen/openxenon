// =============================================================================
// pool.ts (v0.2 Sprint 6 T13 + v0.5 PR-D — Intent Pool CLI)
//
// v0.4.0（D1 2026-08-07）起：Intent Pool v3 已退役。5 个子命令（list/create/review/approve/reject）
// 在入口处抛 `OXN_POOL_DEPRECATED` 用户输入错，提示迁移到 `oxn draft` 通路。
// 兼容期 1 版本后彻底移除整组命令 + 引擎层 `writePoolEntry` util。
// =============================================================================
import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'pool',
    description: '[DEPRECATED v0.4.0] Intent Pool v3 已退役，请改用 oxn draft',
  },
  subCommands: {
    list: () => import('./pool-list').then((m) => m.default),
    create: () => import('./pool-create').then((m) => m.default),
    review: () => import('./pool-review').then((m) => m.default),
    approve: () => import('./pool-approve').then((m) => m.default),
    reject: () => import('./pool-reject').then((m) => m.default),
  },
})
