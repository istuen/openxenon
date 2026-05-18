import { defineCommand } from 'citty'
import { promoteStandard, arsenalLoadStandardByName as loadStandardByName } from '../arsenals/loader'
import { ensureArsenalsDirectories } from '../arsenals/init'
import { type AssetType } from '../arsenals/paths'
import { output, outputError, getFormatFromArgs } from './output'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import * as yaml from 'yaml'

const TYPE_ALIASES: Record<string, AssetType> = {
  'blueprint': 'blueprints',
  'blueprints': 'blueprints',
  'probe': 'probes',
  'probes': 'probes',
  'part': 'parts',
  'parts': 'parts'
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
    if (ctx.args.global || ctx.args.g) {
      console.error('Option -g/--global is removed.')
      console.error('Use: oxn global arsenal promote')
      process.exit(1)
    }

    const format = getFormatFromArgs(ctx.args)
    ensureArsenalsDirectories('project')

    const input = ctx.args.name as string
    const parsed = parseAssetName(input)

    if (!parsed) {
      return outputError({
        code: 'OXN_INVALID_FORMAT',
        message: `Invalid asset name format: ${input}`,
        suggestion: 'Expected format: <type>/<name> (e.g., blueprints/my-blueprint)'
      }, format)
    }

    const asset = loadStandardByName(parsed.name, parsed.type)
    if (!asset) {
      return outputError({
        code: 'OXN_ASSET_NOT_FOUND',
        message: `Asset not found: ${input}`
      }, format)
    }

    const isNewDraft = asset.path.includes('/draft.yaml')
    const isOldDraft = asset.path.includes('/draft/')
    if (!isNewDraft && !isOldDraft) {
      return outputError({
        code: 'OXN_NOT_DRAFT',
        message: `Asset is not in draft state: ${input}`,
        suggestion: 'Only draft assets can be promoted'
      }, format)
    }

    try {
      const promoted = promoteStandard(asset.path)

      if (!promoted) {
        return outputError({
          code: 'OXN_PROMOTE_FAILED',
          message: 'Failed to promote asset'
        }, format)
      }

      try {
        const existingContent = readFileSync(promoted.path, 'utf-8')
        const doc = yaml.parse(existingContent) as Record<string, unknown>
        const currentVersion = (doc._version as number) || 1
        doc._version = currentVersion + 1
        writeFileSync(promoted.path, yaml.stringify(doc), 'utf-8')
      } catch (err) {
        // version increment is best-effort
      }

      return output({
        data: {
          name: promoted.name,
          type: promoted.type,
          state: promoted.state,
          path: promoted.path
        },
        human: `Asset promoted successfully!\n  Name: ${promoted.name}\n  Type: ${promoted.type}\n  New State: ${promoted.state}\n  New Path: ${promoted.path}`
      }, format)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      return outputError({
        code: 'OXN_PROMOTE_ERROR',
        message: errorMsg
      }, format)
    }
  }
})