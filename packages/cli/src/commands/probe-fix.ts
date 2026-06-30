// =============================================================================
// probe-fix.ts (v0.2 Sprint 5a T9 — Probe Signal Taint v2 PR-5)
//
// `oxn probe fix <name>` CLI 子命令
// 物理路径: src/cli/probe-fix.ts
// 父文档: .openxenon/forges/sprints/sprint-5a/2026-06-15-probe-taint-daemon-workcheck-pr5.md §T5.4
//
// 功能:
//   - 调 reg.getManifest(name) 查 provider
//   - builtin → 抛 IAPError PROBE_FIX_UNAVAILABLE 引导重装
//   - cli-add → 引导 re-run 'oxn probe add <source>' (实际重下逻辑留 PR-5.1)
//
// L3-CLI 层 — 走 Infra 异步 fs (filesystem-async) 而非直引 'fs'
// =============================================================================

import { defineCommand } from 'citty'
import { IAPError, IAPAction } from '@openxenon/engine/kernel'
import { getProviderRegistry } from '@openxenon/engine/infra/registry/provider-registry'
import { daemonStartup } from '@openxenon/engine/infra/registry/daemon-startup'
import { output } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

export const probeFixSubcommand = defineCommand({
  meta: {
    name: 'probe-fix',
    description: 'Attempt to repair a corrupted or missing probe provider',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Provider name to fix' },
  },
  async run({ args }) {
    const projectRoot = getProjectRoot()

    // 1. daemonStartup: 注册 builtin + bootstrap
    await daemonStartup(projectRoot)
    const reg = getProviderRegistry()

    // 2. 查 manifest
    const manifest = reg.getManifest(args.name)
    if (!manifest) {
      throw new IAPError(
        'PROOF',
        'PROBE_MISSING',
        IAPAction.YIELD_TO_HUMAN,
        `Provider "${args.name}" not in registry`,
        {
          component: 'probe-fix',
          name: args.name,
        },
      )
    }

    // 3. builtin → 抛 PROBE_FIX_UNAVAILABLE 引导重装
    if (manifest.source === 'builtin') {
      throw new IAPError(
        'PROOF',
        'PROBE_FIX_UNAVAILABLE',
        IAPAction.YIELD_TO_HUMAN,
        `Builtin provider "${args.name}" corrupted; please reinstall openxenon. Run: bun install -g openxenon`,
        {
          component: 'probe-fix',
          name: args.name,
          source: manifest.source,
        },
      )
    }

    // 4. cli-add → 引导重下 (T9 阶段不实际 fetch, 留 PR-5.1)
    const currentStatus = reg.getStatus(manifest.schemes[0] ?? '')
    output({
      ok: true,
      message: `Provider "${args.name}" is cli-add type (current status: ${currentStatus}). Re-run 'oxn probe add <source-url>' to re-download and re-validate.`,
      name: args.name,
      currentStatus,
      expectedHash: manifest.expectedHash,
      cachePath: manifest.cachePath,
    })
  },
})
