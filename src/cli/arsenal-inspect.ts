import { defineCommand } from 'citty'
import { listStandards, type StandardAsset, type Scope } from '../arsenals/loader'
import { ensureArsenalsDirectories } from '../arsenals/init'
import type { AssetState } from '../arsenals/paths'

export default defineCommand({
  meta: {
    name: 'arsenal-inspect',
    description: '查看标准资产内容（默认显示所有状态）'
  },
  args: {
    name: {
      type: 'positional',
      required: false,
      description: '资产名称（不指定则列出所有）'
    },
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
    const name = ctx.args.name as string | undefined

    if (name) {
      const asset = findAssetByName(name, state, scope)
      if (asset) {
        displayAsset(asset)
      } else {
        console.error(`Asset '${name}' not found`)
      }
      return
    }

    const assets = listStandards(state, scope)

    if (assets.length === 0) {
      console.log('No assets found.')
      return
    }

    console.log('Available assets:\n')
    assets.forEach((asset, index) => {
      const relativePath = asset.path.split('.openxenon/arsenals/')[1]
      console.log(`  [${index + 1}] ${relativePath}`)
    })
  }
})

function findAssetByName(name: string, state: AssetState | undefined, scope: Scope): StandardAsset | null {
  const assets = listStandards(state, scope)
  return assets.find(a => a.name === name) || null
}

function displayAsset(asset: StandardAsset): void {
  console.log(`# ${asset.name}`)
  console.log(`Type: ${asset.type}`)
  console.log(`State: ${asset.state}`)
  console.log(`Path: ${asset.path}`)
  console.log('\n--- Content ---')
  console.log(asset.content)
}