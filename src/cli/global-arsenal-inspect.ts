import { defineCommand } from 'citty'
import { listStandards, loadStandardByName } from '../infra/loader'
import { ensureArsenalsDirectories } from '../arsenals/init'
import type { AssetState, AssetType } from '../arsenals/paths'
import { output, outputError, getFormatFromArgs } from './output'

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
    description: '查看全局标准资产内容',
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
    const format = getFormatFromArgs(ctx.args)
    ensureArsenalsDirectories('global')

    const scope = 'global'
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
          message: `Asset '${name}' not found in global arsenal`,
        },
        format,
      )
    }

    const assets = listStandards(scope, undefined, state)

    if (assets.length === 0) {
      return outputError(
        {
          code: 'OXN_NO_ASSETS',
          message: 'No global assets found',
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

function findAssetByName(
  name: string,
  state: AssetState | undefined,
  scope: 'global',
): ReturnType<typeof loadStandardByName> {
  const parsed = parseAssetName(name)
  if (parsed) {
    const asset = loadStandardByName(scope, undefined, parsed.name, parsed.type)
    if (asset && (!state || asset.state === state)) {
      return asset
    }
    return null
  }

  const assets = listStandards(scope, undefined, state)
  return assets.find((a) => a.name === name) || null
}
