// =============================================================================
// pool.ts (v0.2 Sprint 6 T13 — Intent Pool v3 CLI)
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
  },
})
