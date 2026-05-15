import { defineCommand } from 'citty'
import { arsenalListStandards as listStandards, type StandardAsset, type Scope } from '../arsenals/loader'
import { ensureArsenalsDirectories } from '../arsenals/init'
import type { AssetState } from '../arsenals/paths'
import { output, outputError, getFormatFromArgs } from './output'

export default defineCommand({
  meta: {
    name: 'arsenal-list',
    description: '列出标准资产（默认显示所有状态）'
  },
  args: {
    global: {
      type: 'boolean',
      short: 'g',
      description: '操作全局 Arsenal（默认项目级，fallback 全局）'
    },
    draft: {
      type: 'boolean',
      description: '只显示 draft 状态的资产'
    },
    canonical: {
      type: 'boolean',
      description: '只显示 canonical 状态的资产'
    },
    type: {
      type: 'string',
      description: '过滤类型: probe, stage, blueprint'
    },
    scope: {
      type: 'string',
      description: '过滤来源: project, global, builtin, fallback'
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出'
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出'
    }
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    ensureArsenalsDirectories()

    const scopeArg = ctx.args.scope as string | undefined
    const scope: Scope = scopeArg as Scope || 'fallback'
    const state: AssetState | undefined = ctx.args.draft ? 'draft' : ctx.args.canonical ? 'canonical' : undefined
    const assets = listStandards(state, scope)

    const typeFilter = ctx.args.type as string | undefined
    const filtered = typeFilter
      ? assets.filter(a => a.type === typeFilter.replace('probe', 'probes').replace('stage', 'stages').replace('blueprint', 'blueprints'))
      : assets

    if (filtered.length === 0) {
      return outputError({
        code: 'OXN_NO_ASSETS',
        message: 'No standard assets found'
      }, format)
    }

    const grouped = groupByType(filtered)
    const result = {
      total: filtered.length,
      assets: grouped
    }

    output({ data: result }, format)
  }
})

function groupByType(assets: StandardAsset[]): Record<string, StandardAsset[]> {
  const grouped: Record<string, StandardAsset[]> = {
    probes: [],
    stages: [],
    blueprints: []
  }

  for (const asset of assets) {
    grouped[asset.type]?.push(asset)
  }

  return grouped
}