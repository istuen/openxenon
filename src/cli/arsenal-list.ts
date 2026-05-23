import { defineCommand } from 'citty'
import { ensureArsenalsDirectories } from '../arsenals/init'
import { arsenalListStandards, type StandardAsset } from '../arsenals/loader'
import type { AssetState } from '../arsenals/paths'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'arsenal-list',
    description: '列出标准资产（默认显示所有状态）',
  },
  args: {
    draft: {
      type: 'boolean',
      description: '只显示 draft 状态的资产',
    },
    canonical: {
      type: 'boolean',
      description: '只显示 canonical 状态的资产',
    },
    type: {
      type: 'string',
      description: '过滤类型: probe, stage, blueprint',
    },
    scope: {
      type: 'string',
      description: '过滤来源: project, global, builtin, fallback',
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
  },
  async run(ctx) {
    if (ctx.args.global || ctx.args.g) {
      console.error('Option -g/--global is removed.')
      console.error('Use: oxn global arsenal list')
      process.exit(1)
    }

    const format = getFormatFromArgs(ctx.args)
    ensureArsenalsDirectories('project')

    const scopeArg = ctx.args.scope as string | undefined
    const scope = scopeArg || 'fallback'
    const state: AssetState | undefined = ctx.args.draft ? 'draft' : ctx.args.canonical ? 'canonical' : undefined
    const assets = arsenalListStandards(state, scope as 'project' | 'global' | 'fallback' | 'builtin')

    const typeFilter = ctx.args.type as string | undefined
    const filtered = typeFilter
      ? assets.filter(
          (a) =>
            a.type ===
            typeFilter.replace('probe', 'probes').replace('blueprint', 'blueprints').replace('part', 'parts'),
        )
      : assets

    if (filtered.length === 0) {
      return outputError(
        {
          code: 'OXN_NO_ASSETS',
          message: 'No standard assets found',
        },
        format,
      )
    }

    const grouped = groupByType(filtered)
    const result = {
      total: filtered.length,
      assets: grouped,
    }

    output({ data: result }, format)
  },
})

function groupByType(assets: StandardAsset[]): Record<string, StandardAsset[]> {
  const grouped: Record<string, StandardAsset[]> = {
    probes: [],
    stages: [],
    blueprints: [],
  }

  for (const asset of assets) {
    grouped[asset.type]?.push(asset)
  }

  return grouped
}
