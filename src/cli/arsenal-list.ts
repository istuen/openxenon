import { defineCommand } from 'citty'
import { listStandards, type StandardAsset, type Scope } from '../arsenals/loader'
import { ensureArsenalsDirectories } from '../arsenals/init'
import type { AssetState } from '../arsenals/paths'

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
    }
  },
  async run(ctx) {
    ensureArsenalsDirectories()

    const scope: Scope = ctx.args.global ? 'global' : 'fallback'
    const state: AssetState | undefined = ctx.args.draft ? 'draft' : ctx.args.canonical ? 'canonical' : undefined
    const assets = listStandards(state, scope)

    if (assets.length === 0) {
      console.log('No standard assets found.')
      return
    }

    const grouped = groupByType(assets)

    for (const [type, items] of Object.entries(grouped)) {
      if (items.length === 0) continue
      console.log(`\n## ${type.toUpperCase()}`)
      for (const asset of items) {
        console.log(`  [${asset.state}] ${asset.name}`)
      }
    }

    console.log(`\nTotal: ${assets.length} assets`)
  }
})

function groupByType(assets: StandardAsset[]): Record<string, StandardAsset[]> {
  const grouped: Record<string, StandardAsset[]> = {
    probes: [],
    proofs: [],
    stages: [],
    blueprints: []
  }

  for (const asset of assets) {
    grouped[asset.type]?.push(asset)
  }

  return grouped
}