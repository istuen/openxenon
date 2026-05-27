import { defineCommand } from 'citty'
import { ensureArsenalDirectories } from '../arsenals/init'
import {
  arsenalListStandards as listStandards,
  arsenalLoadStandardByName as loadStandardByName,
  type Scope,
  type StandardAsset,
} from '../arsenals/loader'
import type { AssetState, AssetType } from '../arsenals/paths'
import { getFormatFromArgs, output, outputError } from './output'

const TYPE_ALIASES: Record<string, AssetType> = {
  blueprint: 'blueprints',
  blueprints: 'blueprints',
  probe: 'probes',
  probes: 'probes',
  part: 'parts',
  parts: 'parts',
}

function parseAssetName(input: string): { type: AssetType; name: string } | null {
  const parts = input.split('/')
  if (parts.length !== 2) {
    return null
  }
  const [typePart, name] = parts
  if (!typePart || !name) {
    return null
  }
  const type = TYPE_ALIASES[typePart]
  if (!type) {
    return null
  }
  return { type, name }
}

export default defineCommand({
  meta: {
    name: 'arsenal-inspect',
    description: '查看标准资产内容（默认显示所有状态）',
  },
  args: {
    name: {
      type: 'positional',
      required: false,
      description: '资产名称（不指定则列出所有）',
    },
    draft: {
      type: 'boolean',
      description: '只显示 draft 状态的资产',
    },
    canonical: {
      type: 'boolean',
      description: '只显示 canonical 状态的资产',
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
      console.error('Use: oxn global arsenal inspect')
      process.exit(1)
    }

    const format = getFormatFromArgs(ctx.args)
    ensureArsenalDirectories('project')

    const scope: Scope = 'fallback'
    const state: AssetState | undefined = ctx.args.draft ? 'draft' : ctx.args.canonical ? 'canonical' : undefined
    const name = ctx.args.name as string | undefined

    if (name) {
      const asset = findAssetByName(name, state, scope)
      if (asset) {
        return output(
          {
            data: {
              name: asset.name,
              type: asset.type,
              state: asset.state,
              path: asset.path,
              content: asset.content,
            },
          },
          format,
        )
      }
      return outputError(
        {
          code: 'OXN_ASSET_NOT_FOUND',
          message: `Asset '${name}' not found`,
        },
        format,
      )
    }

    const assets = listStandards(state, scope)

    if (assets.length === 0) {
      return outputError(
        {
          code: 'OXN_NO_ASSETS',
          message: 'No assets found',
        },
        format,
      )
    }

    const result = {
      total: assets.length,
      assets: assets.map((a) => ({
        name: a.name,
        type: a.type,
        state: a.state,
        path: a.path.split('.openxenon/arsenals/')[1],
      })),
    }

    output({ data: result }, format)
  },
})

function findAssetByName(name: string, state: AssetState | undefined, scope: Scope): StandardAsset | null {
  const parsed = parseAssetName(name)
  if (parsed) {
    const asset = loadStandardByName(parsed.name, parsed.type)
    if (asset && (!state || asset.state === state)) {
      return asset
    }
    return null
  }

  const assets = listStandards(state, scope)
  return assets.find((a) => a.name === name) || null
}
