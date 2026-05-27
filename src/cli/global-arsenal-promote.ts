import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { ensureArsenalDirectories } from '../arsenals/init'
import { BUILTIN_PARTS, BUILTIN_PROBES } from '../arsenals/builtin'
import type { AssetType } from '../arsenals/paths'
import { generateCompiledArtifact, loadStandardByName, preloadCompileDependencies } from '../infra/loader'
import { promoteToCanonical } from '../arsenals/promoter'
import { resolveBoundary } from '../infra/paths'
import { compileAssembly } from '../kernel/processors/blueprint-compiler'
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
    name: 'publish',
    description: '将全局 DRAFT 资产发布为 CANONICAL [Design-Time]',
  },
  args: {
    name: {
      type: 'positional',
      required: true,
      description: '资产名称 (格式: <type>/<name>, 如 blueprints/my-blueprint)',
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

    const input = ctx.args.name as string
    const parsed = parseAssetName(input)

    if (!parsed) {
      return outputError(
        {
          code: 'OXN_INVALID_FORMAT',
          message: `Invalid asset name format: ${input}`,
          suggestion: 'Expected format: <type>/<name> (e.g., blueprints/my-blueprint)',
        },
        format,
      )
    }

    const asset = loadStandardByName('global', undefined, parsed.name, parsed.type, { state: 'draft' })
    if (!asset) {
      return outputError(
        {
          code: 'OXN_ASSET_NOT_FOUND',
          message: `Asset not found in global arsenal: ${input}`,
        },
        format,
      )
    }

    const isDraft = asset.state === 'draft'
    if (!isDraft) {
      return outputError(
        {
          code: 'OXN_NOT_DRAFT',
          message: `Asset is not in draft state: ${input}`,
          suggestion: 'Only draft assets can be promoted',
        },
        format,
      )
    }

    try {
      const promoted = promoteToCanonical(asset.path)

      if (!promoted) {
        return outputError(
          {
            code: 'OXN_PROMOTE_FAILED',
            message: 'Failed to promote asset',
          },
          format,
        )
      }

      try {
        const existingContent = readFileSync(promoted.path, 'utf-8')
        let doc: Record<string, unknown> = {}
        try {
          doc = JSON.parse(existingContent)
        } catch {
          doc = { _version: 1 }
        }
        const currentVersion = (doc._version as number) || 1
        doc._version = currentVersion + 1
        writeFileSync(promoted.path, JSON.stringify(doc, null, 2), 'utf-8')

        const boundary = resolveBoundary('global')
        if (promoted.type === 'parts' || promoted.type === 'probes') {
          generateCompiledArtifact(promoted.path, boundary)
        }
        if (promoted.type === 'blueprints') {
          const bpDir = join(boundary, 'arsenals', 'blueprints', promoted.name)
          const assemblyJsonPath = join(bpDir, 'blueprint.assembly.json')
          const assembly = compileAssembly(doc as any, {
            taskId: '',
            taskName: '',
            params: {},
            dependencies: preloadCompileDependencies(boundary, BUILTIN_PARTS, BUILTIN_PROBES),
          })
          if (!existsSync(bpDir)) mkdirSync(bpDir, { recursive: true })
          writeFileSync(assemblyJsonPath, JSON.stringify(assembly, null, 2), 'utf-8')
        }
      } catch {
        // best-effort
      }

      return output(
        {
          data: {
            name: promoted.name,
            type: promoted.type,
            state: promoted.state,
            path: promoted.path,
          },
          human: `Global asset promoted successfully!\n  Name: ${promoted.name}\n  Type: ${promoted.type}\n  New State: ${promoted.state}\n  New Path: ${promoted.path}`,
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      return outputError(
        {
          code: 'OXN_PROMOTE_ERROR',
          message: errorMsg,
        },
        format,
      )
    }
  },
})
