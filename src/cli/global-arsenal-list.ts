import { defineCommand } from 'citty'
import { ensureArsenalDirectories } from '../arsenals/init'
import type { AssetState } from '../arsenals/paths'
import { listStandards } from '../infra/loader'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'arsenal-list',
    description: '列出全局标准资产（默认显示所有状态）',
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
    const format = getFormatFromArgs(ctx.args)
    ensureArsenalDirectories('global')

    const scope = 'global'
    const state: AssetState | undefined = ctx.args.draft ? 'draft' : ctx.args.canonical ? 'canonical' : undefined
    const assets = listStandards(scope, undefined, state)

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
          message: 'No global standard assets found',
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

function groupByType(assets: { type: string }[]): Record<string, { type: string }[]> {
  const grouped: Record<string, { type: string }[]> = {
    probes: [],
    stages: [],
    blueprints: [],
  }

  for (const asset of assets) {
    grouped[asset.type]?.push(asset)
  }

  return grouped
}
