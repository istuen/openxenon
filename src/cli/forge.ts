import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { BOUNDARY_DIR } from '../kernel/constants'
import { createDraftFromYaml } from './draft'
import type { Scope } from '../arsenals/loader'

const META_FORGE_NAMES = {
  probe: 'meta-probe',
  proof: 'meta-proof',
  stage: 'meta-stage',
  blueprint: 'meta-blueprint'
} as const

type ForgeType = keyof typeof META_FORGE_NAMES

function loadMetaForge(type: ForgeType): { name: string, constraints: string[] } | null {
  const projectBoundary = join(process.cwd(), BOUNDARY_DIR)
  const name = META_FORGE_NAMES[type]
  const forgePath = join(projectBoundary, 'arsenals', 'forges', name, 'canonical.yaml')

  if (existsSync(forgePath)) {
    try {
      const content = readFileSync(forgePath, 'utf-8')
      const parsed = parseYaml(content)
      return {
        name: parsed.name || name,
        constraints: parsed.stages?.[0]?.proof?.spec?.constraints || []
      }
    } catch {
      return null
    }
  }

  return null
}

function displayMetaForge(type: ForgeType): void {
  const forge = loadMetaForge(type)

  if (!forge) {
    console.log(`元Forge '${type}' 不存在。`)
    console.log(`可用的类型: ${Object.keys(META_FORGE_NAMES).join(', ')}`)
    return
  }

  console.log(`\n=== ${forge.name} ===\n`)
  console.log('约束 (Constraints):')
  for (const constraint of forge.constraints) {
    console.log(`  - ${constraint}`)
  }
  console.log()
}

function displayAllMetaForges(): void {
  console.log('\n=== 所有元Forge ===\n')
  for (const type of Object.keys(META_FORGE_NAMES) as ForgeType[]) {
    const forge = loadMetaForge(type)
    if (forge) {
      console.log(`[${type}] ${forge.name}`)
      console.log(`  约束数量: ${forge.constraints.length}`)
      console.log()
    }
  }
}

export default defineCommand({
  meta: {
    name: 'forge',
    description: '锻造 Draft 标准资产'
  },
  args: {
    type: {
      type: 'positional',
      required: false,
      description: '元Forge类型: probe, proof, stage, blueprint, all'
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
    global: {
      type: 'boolean',
      alias: 'g',
      default: false,
      description: '保存到全局 Arsenal'
    }
  },
  async run(ctx) {
    const type = ctx.args.type as string | undefined
    const save = ctx.args.save as string | undefined
    const name = ctx.args.name as string | undefined
    const scope: Scope = ctx.args.global ? 'global' : 'project'

    if (save) {
      const result = createDraftFromYaml(save, name, scope)
      if (result.success) {
        console.log(JSON.stringify({ ok: true, data: { path: result.path } }))
      } else {
        console.log(JSON.stringify({ ok: false, error: { code: 'OXN_FORGE_SAVE_FAILED', message: result.error } }))
      }
      return
    }

    if (!type || type === 'all') {
      displayAllMetaForges()
      return
    }

    if (type === 'probe' || type === 'proof' || type === 'stage' || type === 'blueprint') {
      displayMetaForge(type as ForgeType)
    } else {
      console.log(`未知类型: ${type}`)
      console.log(`可用的类型: ${Object.keys(META_FORGE_NAMES).join(', ')}, all`)
    }
  }
})