// =============================================================================
// pool.ts (v0.2 Sprint 6 T13 + v0.5 PR-D — Intent Pool CLI)
// =============================================================================
import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'pool',
    description: 'Manage Intent Pool entries (v3: research/design/issue/audit/journal)',
  },
  subCommands: {
    list: () => import('./pool-list').then((m) => m.default),
    create: () => import('./pool-create').then((m) => m.default),
    review: () => import('./pool-review').then((m) => m.default),
    approve: () => import('./pool-approve').then((m) => m.default),
    reject: () => import('./pool-reject').then((m) => m.default),
  },
})
