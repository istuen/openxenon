// =============================================================================
// probe.ts (v0.2 Sprint 3d T7)
//
// `oxn probe` 子命令族
// 父文档: .openxenon/forges/sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md
//
// v0.2.0 实施: probe add (沙箱验证第三方 provider)
// v0.2.1+ 计划: probe list / probe remove / probe update (PR-5/6 补)
// =============================================================================

import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'probe',
    description: 'Manage third-party Probe Providers (sandbox-validated)',
  },
  subCommands: {
    add: () => import('./probe-add').then((m) => m.probeAddSubcommand),
    // list/remove/update 在 PR-5/6 补, PoC 阶段只暴露 add
  },
})
