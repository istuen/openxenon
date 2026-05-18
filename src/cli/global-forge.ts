import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { createDraftFromYaml } from './draft'
import { BUILTIN_FORGES, type BuiltinForgeName } from '../arsenals/builtin'
import { output, outputError, getFormatFromArgs } from './output'

type ForgeType = 'probe' | 'part' | 'blueprint'

const META_FORGE_NAMES: Record<ForgeType, BuiltinForgeName> = {
  probe: 'meta-probe',
  part: 'meta-part',
  blueprint: 'meta-blueprint'
}

function tryLoadForgeFile(path: string, fallbackName: string): { name: string, constraints: string[] } | null {
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = parseYaml(content)
    return {
      name: parsed.name || fallbackName,
      constraints: parsed.stages?.[0]?.spec?.constraints || []
    }
  } catch {
    return null
  }
}

function loadMetaForge(type: ForgeType): { name: string, constraints: string[] } | null {
  const builtinName = META_FORGE_NAMES[type]
  const relPath = join('forges', builtinName, 'canonical.yaml')

  const homeDir = process.env.HOME || process.env.USERPROFILE || '~'
  const globalPath = join(homeDir, '.openxenon', 'arsenals', relPath)
  const r = tryLoadForgeFile(globalPath, builtinName)
  if (r) return r

  const builtin = BUILTIN_FORGES[builtinName]
  if (builtin) {
    return {
      name: builtin.name,
      constraints: [...(builtin.stages?.[0]?.spec?.constraints || [])]
    }
  }

  return null
}

export default defineCommand({
  meta: {
    name: 'forge',
    description: '锻造全局 Draft 标准资产'
  },
  args: {
    type: {
      type: 'positional',
      required: false,
      description: '元Forge类型: probe, part, blueprint, all'
    },
    save: {
      type: 'string',
      alias: 's',
      description: '直接保存 YAML 内容（用于 AI 生成资产后保存）'
    },
    name: {
      type: 'string',
      alias: 'n',
      description: '资产名称'
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
    const format = getFormatFromArgs(ctx.args)
    const type = ctx.args.type as string | undefined
    const save = ctx.args.save as string | undefined
    const name = ctx.args.name as string | undefined

    if (save) {
      const result = createDraftFromYaml(save, name, 'global')
      if (result.success) {
        return output({ data: { path: result.path } }, format)
      }
      return outputError({
        code: 'OXN_FORGE_SAVE_FAILED',
        message: result.error || 'Failed to save draft'
      }, format)
    }

    if (!type || type === 'all') {
      const forges = (['probe', 'part', 'blueprint'] as ForgeType[]).map(t => {
        const forge = loadMetaForge(t)
        return forge ? { type: t, name: forge.name, constraints: forge.constraints } : null
      }).filter(Boolean)

      return output({ data: { forges } }, format)
    }

    if (type === 'probe' || type === 'part' || type === 'blueprint') {
      const forge = loadMetaForge(type as ForgeType)
      if (!forge) {
        return outputError({
          code: 'OXN_FORGE_NOT_FOUND',
          message: `元Forge '${type}' 不存在`
        }, format)
      }
      return output({
        data: { name: forge.name, constraints: forge.constraints },
        human: `\n=== ${forge.name} ===\n\n约束 (Constraints):\n${forge.constraints.map(c => `  - ${c}`).join('\n')}\n`
      }, format)
    }

    return outputError({
      code: 'OXN_UNKNOWN_FORGE_TYPE',
      message: `未知类型: ${type}`,
      suggestion: `可用的类型: ${Object.keys(META_FORGE_NAMES).join(', ')}, all`
    }, format)
  }
})