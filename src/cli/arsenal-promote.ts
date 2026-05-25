import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import * as yaml from 'yaml'
import { ensureArsenalsDirectories } from '../arsenals/init'
import {
  generateCompiledArtifact,
  arsenalLoadStandardByName as loadStandardByName,
  promoteToCanonical,
} from '../arsenals/loader'
import type { AssetType } from '../arsenals/paths'
import { preloadCompileDependencies } from '../infra/loader'
import { getProjectBoundaryPath } from '../kernel'
import { compileAssembly } from '../kernel/compiler/blueprint-compiler'
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
    description: '将 DRAFT 资产发布为 CANONICAL [Design-Time]',
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
      return outputError(
        {
          code: 'OXN_INVALID_FORMAT',
          message: `Invalid asset name format: ${input}`,
          suggestion: 'Expected format: <type>/<name> (e.g., blueprints/my-blueprint)',
        },
        format,
      )
    }

    const asset = loadStandardByName(parsed.name, parsed.type)
    if (!asset) {
      return outputError(
        {
          code: 'OXN_ASSET_NOT_FOUND',
          message: `Asset not found: ${input}`,
        },
        format,
      )
    }

    const isDraft = asset.state === 'draft' || asset.path.includes('/forges/')
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
        const doc = yaml.parse(existingContent) as Record<string, unknown>
        const currentVersion = (doc._version as number) || 1
        doc._version = currentVersion + 1
        writeFileSync(promoted.path, yaml.stringify(doc), 'utf-8')

        if (promoted.type === 'parts' || promoted.type === 'probes') {
          const boundary = getProjectBoundaryPath(process.cwd())
          generateCompiledArtifact(promoted.path, boundary)
        }

        if (promoted.type === 'blueprints') {
          const boundary = getProjectBoundaryPath(process.cwd())
          const blueprintDir = join(boundary, 'arsenals', 'blueprints', promoted.name)
          const assemblyPath = join(blueprintDir, 'blueprint.assembly.yaml')
          const assembly = compileAssembly(doc as any, {
            taskId: '',
            taskName: '',
            params: {},
            dependencies: preloadCompileDependencies(boundary),
          })
          const assemblyDir = dirname(assemblyPath)
          if (!existsSync(assemblyDir)) mkdirSync(assemblyDir, { recursive: true })
          writeFileSync(assemblyPath, yaml.stringify(assembly), 'utf-8')
        }
      } catch (_err) {
        // version increment and compiled generation are best-effort
      }

      return output(
        {
          data: {
            name: promoted.name,
            type: promoted.type,
            state: promoted.state,
            path: promoted.path,
          },
          human: `Asset promoted successfully!\n  Name: ${promoted.name}\n  Type: ${promoted.type}\n  New State: ${promoted.state}\n  New Path: ${promoted.path}`,
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
