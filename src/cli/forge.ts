import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { BUILTIN_FORGES, type BuiltinForgeName } from '../arsenals/builtin'
import type { Scope } from '../arsenals/loader'
import { BOUNDARY_DIR } from '../kernel/constants'
import { createDraftFromYaml } from './draft'
import { getFormatFromArgs, output, outputError } from './output'

type ForgeType = 'probe' | 'part' | 'blueprint'

const META_FORGE_NAMES: Record<ForgeType, BuiltinForgeName> = {
  probe: 'meta-probe',
  part: 'meta-part',
  blueprint: 'meta-blueprint',
}

function tryLoadForgeFile(path: string, fallbackName: string): { name: string; constraints: string[] } | null {
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = parseYaml(content)
    return {
      name: parsed.name || fallbackName,
      constraints: parsed.stages?.[0]?.spec?.constraints || [],
    }
  } catch {
    return null
  }
}

function unpackBlueprint(bpPath: string): { parts: number; probes: number; dir: string } {
  if (!existsSync(bpPath)) {
    throw new Error(`Blueprint file not found: ${bpPath}`)
  }
  const content = readFileSync(bpPath, 'utf-8')
  const bp = parseYaml(content) as Record<string, unknown>
  const bpDir = dirname(bpPath)

  const partsDir = join(bpDir, 'parts')
  const probesDir = join(bpDir, 'probes')

  let partsCount = 0
  let probesCount = 0

  const parts = (bp.parts as Array<Record<string, unknown>>) || (bp.stages as Array<Record<string, unknown>>) || []
  for (const part of parts) {
    const id = (part.id as string) || (part.name as string) || `part-${partsCount}`
    if (!existsSync(partsDir)) mkdirSync(partsDir, { recursive: true })
    writeFileSync(join(partsDir, `${id}.yaml`), stringifyYaml(part), 'utf-8')
    partsCount++
  }

  const probes = (bp.probes as Array<Record<string, unknown>>) || []
  for (const probe of probes) {
    const id = (probe.type as string) || `probe-${probesCount}`
    if (!existsSync(probesDir)) mkdirSync(probesDir, { recursive: true })
    writeFileSync(join(probesDir, `${id}.yaml`), stringifyYaml(probe), 'utf-8')
    probesCount++
  }

  return { parts: partsCount, probes: probesCount, dir: bpDir }
}

function repackBlueprint(dir: string): { path: string; parts: number } {
  const bpPath = join(dir, 'blueprint.yaml')
  if (!existsSync(bpPath)) {
    throw new Error(`blueprint.yaml not found in ${dir}`)
  }

  const content = readFileSync(bpPath, 'utf-8')
  const bp = parseYaml(content) as Record<string, unknown>

  const partsDir = join(dir, 'parts')
  let loadedParts = 0

  if (existsSync(partsDir)) {
    const files = readdirSync(partsDir, { withFileTypes: true })
    const partFiles = files.filter((f) => f.isFile() && (f.name.endsWith('.yaml') || f.name.endsWith('.yml')))
    const parts: Array<Record<string, unknown>> = []
    for (const f of partFiles) {
      const pContent = readFileSync(join(partsDir, f.name), 'utf-8')
      const pObj = parseYaml(pContent) as Record<string, unknown>
      parts.push(pObj)
      loadedParts++
    }
    bp.parts = parts
  }

  writeFileSync(bpPath, stringifyYaml(bp), 'utf-8')
  return { path: bpPath, parts: loadedParts }
}

function loadMetaForge(type: ForgeType): { name: string; constraints: string[] } | null {
  const builtinName = META_FORGE_NAMES[type]
  const relPath = join('forges', builtinName, 'canonical.yaml')

  const projectPath = join(process.cwd(), BOUNDARY_DIR, 'arsenals', relPath)
  const r1 = tryLoadForgeFile(projectPath, builtinName)
  if (r1) return r1

  const homeDir = process.env.HOME || process.env.USERPROFILE || '~'
  const globalPath = join(homeDir, '.openxenon', 'arsenals', relPath)
  const r2 = tryLoadForgeFile(globalPath, builtinName)
  if (r2) return r2

  const builtin = BUILTIN_FORGES[builtinName]
  if (builtin) {
    return {
      name: builtin.name,
      constraints: [...(builtin.stages?.[0]?.spec?.constraints || [])],
    }
  }

  return null
}

function forgeOxnScaffold(type: ForgeType): string {
  switch (type) {
    case 'probe':
      return `probe "<name>" {
  description = "<description>"
  prop "<param1>" { type = string; required = true }
  output { <field> = boolean }
}`
    case 'part':
      return `part "<name>" {
  description = "<description>"
  prop "<param1>" { type = string; required = false; default = "" }
  probe <action> {
    ref = "@oxn/probe/<probe-ref>"
    params = {
      <key> = "<value>"
    }
  }
}`
    case 'blueprint':
      return `blueprint "<name>" {
  version = 1
  prop "<param1>" { type = string; default = "" }

  abstract part "<slot>" {
  }

  stage "<stage1>" {
    run = "part.<slot>.run"
    deps = []
  }

  expectation "<name>" {
    probe = "@oxn/probe/<probe-ref>"
    params = { <key> = "<value>" }
    err_msg = "<error message>"
  }
}`
  }
}

export default defineCommand({
  meta: {
    name: 'forge',
    description: '锻造 Draft 标准资产',
  },
  args: {
    type: {
      type: 'positional',
      required: false,
      description: '元Forge类型: probe, part, blueprint, all',
    },
    save: {
      type: 'string',
      alias: 's',
      description: '直接保存资产内容（用于 AI 生成资产后保存）',
    },
    name: {
      type: 'string',
      alias: 'n',
      description: '资产名称',
    },
    format: {
      type: 'string',
      alias: 'f',
      default: 'oxn',
      description: '输出格式: oxn (默认) | yaml (Deprecated)',
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
    unpack: {
      type: 'string',
      description: '解包 Blueprint 到 forge 工作区目录',
    },
    repack: {
      type: 'string',
      description: '重新打包 forge 工作区目录到 Blueprint',
    },
  },
  async run(ctx) {
    if (ctx.args.global || ctx.args.g) {
      console.error('Option -g/--global is removed.')
      console.error('Use: oxn global forge <command>')
      process.exit(1)
    }

    const format = getFormatFromArgs(ctx.args)
    const type = ctx.args.type as string | undefined
    const save = ctx.args.save as string | undefined
    const name = ctx.args.name as string | undefined
    const unpackPath = ctx.args.unpack as string | undefined
    const repackPath = ctx.args.repack as string | undefined
    const outputFormat = (ctx.args.format as string) || 'oxn'
    const scope: Scope = 'project'

    if (unpackPath) {
      try {
        const result = unpackBlueprint(unpackPath)
        return output(
          {
            data: result,
            human: `Unpacked ${result.parts} part(s), ${result.probes} probe(s) to ${result.dir}`,
          },
          format,
        )
      } catch (err) {
        return outputError(
          {
            code: 'OXN_UNPACK_FAILED',
            message: err instanceof Error ? err.message : 'Failed to unpack',
          },
          format,
        )
      }
    }

    if (repackPath) {
      try {
        const result = repackBlueprint(repackPath)
        return output(
          {
            data: result,
            human: `Repacked ${result.parts} part(s) into ${result.path}`,
          },
          format,
        )
      } catch (err) {
        return outputError(
          {
            code: 'OXN_REPACK_FAILED',
            message: err instanceof Error ? err.message : 'Failed to repack',
          },
          format,
        )
      }
    }

    if (save) {
      const ext = outputFormat === 'yaml' ? 'yaml' : 'oxn'
      const result = createDraftFromYaml(save, name, scope, ext)
      if (result.success) {
        return output({ data: { path: result.path, format: ext } }, format)
      }
      return outputError(
        {
          code: 'OXN_FORGE_SAVE_FAILED',
          message: result.error || 'Failed to save draft',
        },
        format,
      )
    }

    if (!type || type === 'all') {
      const forges = (['probe', 'part', 'blueprint'] as ForgeType[])
        .map((t) => {
          const forge = loadMetaForge(t)
          return forge ? { type: t, name: forge.name, constraints: forge.constraints } : null
        })
        .filter(Boolean)

      return output({ data: { forges } }, format)
    }

    if (type === 'probe' || type === 'part' || type === 'blueprint') {
      const useOxn = outputFormat !== 'yaml'

      if (useOxn) {
        const scaffold = forgeOxnScaffold(type as ForgeType)
        if (format === 'json') {
          return output({ data: { type, scaffold } }, format)
        }
        process.stdout.write(`${scaffold}\n`)
        return
      }

      const forge = loadMetaForge(type as ForgeType)
      if (!forge) {
        return outputError(
          {
            code: 'OXN_FORGE_NOT_FOUND',
            message: `元Forge '${type}' 不存在`,
          },
          format,
        )
      }
      return output(
        {
          data: { name: forge.name, constraints: forge.constraints },
          human: `\n=== ${forge.name} ===\n\n约束 (Constraints):\n${forge.constraints.map((c) => `  - ${c}`).join('\n')}\n`,
        },
        format,
      )
    }

    return outputError(
      {
        code: 'OXN_UNKNOWN_FORGE_TYPE',
        message: `未知类型: ${type}`,
        suggestion: `可用的类型: ${Object.keys(META_FORGE_NAMES).join(', ')}, all`,
      },
      format,
    )
  },
})
