import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { getProjectBoundaryPath } from '../core/project'

const META_BLUEPRINT_NAMES = {
  probe: 'meta-blueprint-for-probe',
  proof: 'meta-blueprint-for-proof',
  stage: 'meta-blueprint-for-stage',
  blueprint: 'meta-blueprint-for-blueprint'
} as const

type BlueprintType = keyof typeof META_BLUEPRINT_NAMES

function loadMetaBlueprint(type: BlueprintType): { name: string, constraints: string[] } | null {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const name = META_BLUEPRINT_NAMES[type]
  const newPath = join(projectBoundary, 'arsenals', 'stages', name, 'draft.yaml')

  if (existsSync(newPath)) {
    try {
      const content = readFileSync(newPath, 'utf-8')
      const parsed = parseYaml(content)
      return {
        name: parsed.name || name,
        constraints: parsed.constraints || []
      }
    } catch {
      return null
    }
  }

  return null
}

function displayMetaBlueprint(type: BlueprintType): void {
  const blueprint = loadMetaBlueprint(type)

  if (!blueprint) {
    console.log(`元蓝图 '${type}' 不存在。`)
    console.log(`可用的类型: ${Object.keys(META_BLUEPRINT_NAMES).join(', ')}`)
    return
  }

  console.log(`\n=== ${blueprint.name} ===\n`)
  console.log('约束 (Constraints):')
  for (const constraint of blueprint.constraints) {
    console.log(`  - ${constraint}`)
  }
  console.log()
}

function displayAllMetaBlueprints(): void {
  console.log('\n=== 所有元蓝图 ===\n')
  for (const type of Object.keys(META_BLUEPRINT_NAMES) as BlueprintType[]) {
    const blueprint = loadMetaBlueprint(type)
    if (blueprint) {
      console.log(`[${type}] ${blueprint.name}`)
      console.log(`  约束数量: ${blueprint.constraints.length}`)
      console.log()
    }
  }
}

export default defineCommand({
  meta: {
    name: 'forge',
    description: '显示元蓝图约束（用于生成标准资产）'
  },
  args: {
    type: {
      type: 'positional',
      required: false,
      description: '元蓝图类型: probe, proof, stage, blueprint, all'
    }
  },
  async run(ctx) {
    const type = ctx.args.type as string | undefined

    if (!type || type === 'all') {
      displayAllMetaBlueprints()
      return
    }

    if (type === 'probe' || type === 'proof' || type === 'stage' || type === 'blueprint') {
      displayMetaBlueprint(type)
    } else {
      console.log(`未知类型: ${type}`)
      console.log(`可用的类型: ${Object.keys(META_BLUEPRINT_NAMES).join(', ')}, all`)
    }
  }
})