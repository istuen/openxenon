// =============================================================================
// probe-list.ts (v0.2 Sprint 5a T9 — Probe Signal Taint v2 PR-5)
//
// `oxn probe list` CLI 子命令
// 物理路径: src/cli/probe-list.ts
// 父文档: .openxenon/forges/sprints/sprint-5a/2026-06-15-probe-taint-daemon-workcheck-pr5.md §T5.3
//
// 功能: bootstrap registry.json + 列所有 Provider (含 OK / CORRUPTED / MISSING / UNREGISTERED 状态)
// 输出: 表格 (chalk 色彩) + JSON 双格式
// =============================================================================

import { defineCommand } from 'citty'
import { getProviderRegistry } from '@openxenon/engine/infra/registry/provider-registry'
import { providerStartup } from '@openxenon/engine/infra/registry/provider-startup'
import { output } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

export const probeListSubcommand = defineCommand({
  meta: {
    name: 'probe-list',
    description: 'List all project probes and their status (OK / CORRUPTED / MISSING / UNREGISTERED)',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON' },
  },
  async run({ args }) {
    const projectRoot = getProjectRoot()

    // 1. providerStartup: 注册 builtin + bootstrap (RFC-0032 Phase 2: 原 daemonStartup 改名)
    await providerStartup(projectRoot)
    const reg = getProviderRegistry()

    const list = reg.list()

    if (args.json) {
      output({
        ok: true,
        providerCount: list.length,
        providers: list,
      })
      return
    }

    // 2. 表格输出 (无 chalk 依赖, 用 emoji + status tag; T9 简化实现)
    if (list.length === 0) {
      output({ ok: true, message: '0 providers registered' })
      return
    }

    const lines: string[] = []
    lines.push(`${'NAME'.padEnd(20)} ${'SCHEMES'.padEnd(28)} ${'STATUS'.padEnd(14)} REASON`)
    lines.push('-'.repeat(80))
    for (const p of list) {
      const icon = p.status === 'OK' ? '✅' : p.status === 'CORRUPTED' ? '❌' : p.status === 'MISSING' ? '⚠️ ' : '❔'
      lines.push(
        `${p.name.padEnd(20)} ${p.schemes.join(',').padEnd(28)} ${icon} ${p.status.padEnd(10)} ${p.reason ?? ''}`,
      )
    }
    output({ ok: true, message: lines.join('\n') })
  },
})
