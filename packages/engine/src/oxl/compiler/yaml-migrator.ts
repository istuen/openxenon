/**
 * Task 1.9 — YAML → OXN 迁移脚本
 *
 * 将旧的 YAML Blueprint 资产翻译为 OXL 语法。
 *
 * 核心翻译规则：
 *   1. stages/parts → blueprint { stage { } }
 *   2. Slot 引用 → abstract part 显式声明
 *   3. probes { type, params } → probe { ref, params }
 *   4. deps → stage.deps
 *
 * 用法：
 *   oxn migrate-yaml <yaml-file>              # 迁移单个文件
 *   oxn migrate-yaml --dir <dir>               # 批量迁移目录
 *   oxn migrate-yaml --all                     # 迁移所有 Arsenal 资产
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { basename, dirname, join } from 'path'
import { parse as parseYaml } from 'yaml'

// ========================
// 类型定义
// ========================

interface YamlStage {
  id: string
  name?: string
  deps?: string[]
  ref?: string
  slot?: string
  target?: { description: string; glob?: string }
  spec?: { description: string; constraints?: string[] }
  action?: { instruction?: string; command?: string }
  condition?: string
  params?: Record<string, unknown>
  probes?: Array<{
    type: string
    ref?: string
    params?: Record<string, unknown>
    pattern?: string
    command?: string
  }>
}

interface YamlBlueprint {
  id?: string
  name?: string
  _version?: number
  parts?: YamlStage[]
  stages?: YamlStage[]
  slots?: Record<string, string | Record<string, unknown>>
  props?: Record<string, { type: string; required?: boolean; default?: unknown }>
}

interface MigrationStats {
  total: number
  success: number
  failures: number
  details: string[]
}

// ========================
// 核心转换
// ========================

function indent(level: number): string {
  return '  '.repeat(level)
}

function escapeString(s: string): string {
  // OXN uses double-quoted strings
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function propTypeToOxn(yamlType: string): string {
  if (yamlType === 'string') return 'string'
  if (yamlType === 'number') return 'number'
  if (yamlType === 'boolean') return 'boolean'
  if (yamlType === 'array') return 'list<any>'
  if (yamlType === 'object') return 'map<any>'
  return yamlType
}

/**
 * 将 YAML Blueprint 中的单个 Stage/Part 转换为 OXN stage 块
 */
function stageToOxn(stage: YamlStage, level: number): string {
  const lines: string[] = []
  const i = indent(level)

  const stageName = stage.id || stage.name || 'unnamed'
  lines.push(`${i}stage "${escapeString(stageName)}" {`)

  // deps
  if (stage.deps && stage.deps.length > 0) {
    const depsStr = stage.deps.map((d) => `"${escapeString(d)}"`).join(', ')
    lines.push(`${i}  deps = [${depsStr}]`)
  } else {
    lines.push(`${i}  deps = []`)
  }

  // run
  const runTarget = stage.ref || `part.${stageName}.run`
  lines.push(`${i}  run = "${escapeString(runTarget)}"`)

  lines.push(`${i}}`)
  return lines.join('\n')
}

/**
 * 将 YAML Probe 转换为 OXN probe 块
 */
function probesToAbstractPart(stage: YamlStage, level: number): string {
  const lines: string[] = []
  const i = indent(level)
  const name = stage.id || stage.name || 'unnamed'

  lines.push(`${i}abstract part "${escapeString(name)}" {`)

  if (stage.params) {
    lines.push(`${i}  params = {`)
    for (const [key, value] of Object.entries(stage.params)) {
      const valStr = typeof value === 'string' ? `"${escapeString(value)}"` : String(value)
      lines.push(`${i}    ${key} = ${valStr},`)
    }
    lines.push(`${i}  }`)
  }

  lines.push(`${i}}`)
  return lines.join('\n')
}

/**
 * 生成完整的 OXN Blueprint
 */
function yamlToOxnBlueprint(yaml: YamlBlueprint): string {
  const lines: string[] = []
  const bpName = yaml.name || yaml.id || 'unnamed'

  lines.push(`// 迁移自 YAML Blueprint: ${bpName}`)
  lines.push(`blueprint "${escapeString(bpName)}" {`)

  // version
  lines.push(`  version = ${yaml._version || 1}`)

  // props
  if (yaml.props) {
    for (const [name, def] of Object.entries(yaml.props)) {
      const type = propTypeToOxn(def.type || 'string')
      lines.push(`  prop "${escapeString(name)}" {`)
      lines.push(`    type = ${type}`)
      if (def.required) lines.push(`    required = true`)
      if (def.default !== undefined) {
        const defVal = typeof def.default === 'string' ? `"${escapeString(def.default)}"` : String(def.default)
        lines.push(`    default = ${defVal}`)
      }
      lines.push(`  }`)
    }
  }

  // Slot → Abstract Part 翻译
  if (yaml.slots) {
    for (const [slotName, slotDef] of Object.entries(yaml.slots)) {
      lines.push(`  abstract part "${escapeString(slotName)}" {`)
      if (typeof slotDef === 'string') {
        lines.push(`    implements = "${escapeString(slotDef)}"`)
      } else if (typeof slotDef === 'object') {
        const s = slotDef as Record<string, unknown>
        if (s.ref) lines.push(`    implements = "${escapeString(String(s.ref))}"`)
      }
      lines.push(`  }`)
    }
  }

  // Parts/Stages → Stage + Abstract Part
  const stages = yaml.parts || yaml.stages || []
  for (const stage of stages) {
    // 有 slot 的 stage → abstract part
    if (stage.slot) {
      lines.push('')
      lines.push(probesToAbstractPart(stage, 1))
    }
    lines.push('')
    lines.push(stageToOxn(stage, 1))
  }

  lines.push('}')
  return lines.join('\n')
}

// ========================
// 文件操作
// ========================

export function migrateSingleFile(yamlPath: string, outputPath?: string): MigrationStats {
  const stats: MigrationStats = { total: 1, success: 0, failures: 0, details: [] }

  if (!existsSync(yamlPath)) {
    stats.failures = 1
    stats.details.push(`文件不存在: ${yamlPath}`)
    return stats
  }

  try {
    const yamlContent = readFileSync(yamlPath, 'utf-8')
    const parsed = parseYaml(yamlContent) as YamlBlueprint

    if (!parsed.name && !parsed.id && !parsed.parts && !parsed.stages) {
      stats.failures = 1
      stats.details.push(`不是有效的 Blueprint: ${yamlPath}`)
      return stats
    }

    const oxnContent = yamlToOxnBlueprint(parsed)

    const destPath = outputPath || yamlPath.replace(/\.(yaml|yml|json)$/, '.md')
    const destDir = dirname(destPath)
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    writeFileSync(destPath, oxnContent, 'utf-8')
    stats.success = 1
    stats.details.push(`✅ ${basename(yamlPath)} → ${basename(destPath)}`)
  } catch (err) {
    stats.failures = 1
    stats.details.push(`❌ ${yamlPath}: ${err instanceof Error ? err.message : String(err)}`)
  }

  return stats
}

export function migrateDirectory(dirPath: string): MigrationStats {
  const stats: MigrationStats = { total: 0, success: 0, failures: 0, details: [] }

  if (!existsSync(dirPath)) {
    stats.failures = 1
    stats.details.push(`目录不存在: ${dirPath}`)
    return stats
  }

  function scanDir(path: string): void {
    const entries = readdirSync(path, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(path, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath)
      } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
        stats.total++
        const result = migrateSingleFile(fullPath)
        stats.success += result.success
        stats.failures += result.failures
        stats.details.push(...result.details)
      }
    }
  }

  scanDir(dirPath)
  return stats
}

export function migrateAllArsenals(projectRoot: string): MigrationStats {
  const arsenalDir = join(projectRoot, '.openxenon', 'arsenals')
  return migrateDirectory(arsenalDir)
}

// ========================
// 格式化输出
// ========================

export function formatMigrationReport(stats: MigrationStats): string {
  const lines: string[] = [
    `\n=== YAML → OXN 迁移报告 ===`,
    `总计: ${stats.total} 个文件`,
    `成功: ${stats.success}`,
    `失败: ${stats.failures}`,
    ``,
    ...stats.details,
  ]
  return lines.join('\n')
}
