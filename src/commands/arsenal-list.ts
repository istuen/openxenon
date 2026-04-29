import { defineCommand } from 'citty'
import { listStandards, type StandardAsset } from '../core/arsenals-loader'
import { ensureArsenalsDirectories } from '../core/arsenals-init'
import type { AssetState } from '../core/arsenals-paths'

export default defineCommand({
  meta: {
    name: 'arsenal-list',
    description: '列出标准资产'
  },
  args: {
    state: {
      type: 'positional',
      description: '按状态筛选（draft 或 canonical）',
      required: false
    }
  },
  async run(ctx) {
    ensureArsenalsDirectories()

    const state = ctx.args.state as AssetState | undefined
    const assets = listStandards(state)

    if (assets.length === 0) {
      console.log('No standard assets found.')
      return
    }

    const grouped = groupByType(assets)

    for (const [type, items] of Object.entries(grouped)) {
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
    stages: []
  }

  for (const asset of assets) {
    grouped[asset.type].push(asset)
  }

  return grouped
}