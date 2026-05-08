import { defineCommand } from 'citty'
import { promoteStandard, loadStandardByName } from '../arsenals/loader'
import { ensureArsenalsDirectories } from '../arsenals/init'
import { type AssetType } from '../arsenals/paths'

const TYPE_ALIASES: Record<string, AssetType> = {
  'blueprint': 'blueprints',
  'blueprints': 'blueprints',
  'probe': 'probes',
  'probes': 'probes',
  'proof': 'proofs',
  'proofs': 'proofs',
  'stage': 'stages',
  'stages': 'stages'
}

function parseAssetName(input: string): { type: AssetType, name: string } | null {
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
    name: 'arsenal-promote',
    description: '将 DRAFT 资产转正为 CANONICAL'
  },
  args: {
    name: {
      type: 'positional',
      required: true,
      description: '资产名称 (格式: <type>/<name>, 如 blueprints/my-blueprint)'
    },
    global: {
      type: 'boolean',
      short: 'g',
      description: '操作全局 Arsenal'
    }
  },
  async run(ctx) {
    ensureArsenalsDirectories()

    const input = ctx.args.name as string
    const parsed = parseAssetName(input)

    if (!parsed) {
      console.error(`Invalid asset name format: ${input}`)
      console.error('Expected format: <type>/<name> (e.g., blueprints/my-blueprint)')
      return
    }

    const asset = loadStandardByName(parsed.name, parsed.type)
    if (!asset) {
      console.error(`Asset not found: ${input}`)
      return
    }

    const isNewDraft = asset.path.includes('/draft.yaml')
    const isOldDraft = asset.path.includes('/draft/')
    if (!isNewDraft && !isOldDraft) {
      console.error(`Asset is not in draft state: ${input}`)
      console.error('Only draft assets can be promoted.')
      return
    }

    try {
      const promoted = promoteStandard(asset.path)

      if (!promoted) {
        console.error('Failed to promote asset.')
        return
      }

      console.log('Asset promoted successfully!')
      console.log(`  Name: ${promoted.name}`)
      console.log(`  Type: ${promoted.type}`)
      console.log(`  New State: ${promoted.state}`)
      console.log(`  New Path: ${promoted.path}`)
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
})