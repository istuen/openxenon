#!/usr/bin/env bun
/**
 * scripts/migrate-builtin-to-md.ts — v0.6.1 PR-4 内置资产 .oxn → .md 迁移
 *
 * D-α c 锁定：v0.6.1 不删 .oxn；保留作 v0.6.x fallback
 *           同时写 .md 作 canonical（人类可读 + D-α c 锁定）
 *           v0.7.0 切割时一次 git rm 全部 .oxn
 *
 * 输入：
 *   src/builtin/probes/*.oxn    (15 文件)
 *   src/builtin/blueprints/*.oxn (3 文件)
 *
 * 输出：
 *   同目录 .md 文件（保留 .oxn）
 *
 * 用法：
 *   bun scripts/migrate-builtin-to-md.ts           # dry-run 模式
 *   bun scripts/migrate-builtin-to-md.ts --write   # 实际写入
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Simple glob: list *.oxn in a single directory */
function listOxnFilesInDir(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.oxn')).map((f) => join(dir, f))
  } catch {
    return []
  }
}

const BUILTIN_PROBES_DIR = 'src/builtin/probes'
const BUILTIN_BLUEPRINTS_DIR = 'src/builtin/blueprints'

interface ProbeMigration {
  name: string
  alignName: string
  scheme: string
  description: string
  props: Array<{ name: string; type: string; required: boolean; default?: string }>
  outputs: Array<{ name: string; type: string }>
}

interface BlueprintMigration {
  name: string
  version: number
  slots: Array<{ name: string; deps: string[]; observe: string[] }>
}

function parseProbe(content: string): ProbeMigration | null {
  const nameMatch = content.match(/probe\s+"([^"]+)"\s+align\s+"([^"]+)"\s*\{/)
  if (!nameMatch) return null
  const name = nameMatch[1]!
  const alignName = nameMatch[2]!

  const schemeMatch = content.match(/scheme\s*=\s*"([^"]+)"/)
  if (!schemeMatch) return null
  const scheme = schemeMatch[1]!

  const descMatch = content.match(/description\s*=\s*"([^"]+)"/)
  const description = descMatch ? descMatch[1]! : ''

  // props = name { type = <type>; required = <bool>; default = <value> }
  const props: ProbeMigration['props'] = []
  const propRegex = /prop\s+"([^"]+)"\s*\{\s*([^}]+)\s*\}/g
  let pm: RegExpExecArray | null
  while ((pm = propRegex.exec(content)) !== null) {
    const propName = pm[1]!
    const body = pm[2]!
    const typeMatch = body.match(/type\s*=\s*(\w+)/)
    const requiredMatch = body.match(/required\s*=\s*(true|false)/)
    const defaultMatch = body.match(/default\s*=\s*("([^"]*)"|(\d+))/)
    let defaultVal: string | undefined
    if (defaultMatch) {
      defaultVal = defaultMatch[2] !== undefined ? defaultMatch[2] : defaultMatch[3]
    }
    props.push({
      name: propName,
      type: typeMatch ? typeMatch[1]! : 'unknown',
      required: requiredMatch ? requiredMatch[1] === 'true' : false,
      ...(defaultVal !== undefined ? { default: defaultVal } : {}),
    })
  }

  // outputs = key = type; key = type; ...
  const outputs: ProbeMigration['outputs'] = []
  const outputMatch = content.match(/output\s*\{\s*([^}]+)\s*\}/)
  if (outputMatch) {
    const outputBody = outputMatch[1]!
    const outputRegex = /(\w+)\s*=\s*([\w<>]+)/g
    let om: RegExpExecArray | null
    while ((om = outputRegex.exec(outputBody)) !== null) {
      outputs.push({ name: om[1]!, type: om[2]! })
    }
  }

  return { name, alignName, scheme, description, props, outputs }
}

function parseBlueprint(content: string): BlueprintMigration | null {
  const nameMatch = content.match(/blueprint\s+"([^"]+)"\s*\{/)
  if (!nameMatch) return null
  const name = nameMatch[1]!
  const versionMatch = content.match(/version\s*=\s*(\d+)/)
  const version = versionMatch ? Number(versionMatch[1]) : 1

  const slots: BlueprintMigration['slots'] = []
  const slotRegex = /slot\s+"([^"]+)"\s*\{([^}]*)\}/g
  let sm: RegExpExecArray | null
  while ((sm = slotRegex.exec(content)) !== null) {
    const slotName = sm[1]!
    const body = sm[2]!
    const depsMatch = body.match(/deps\s*=\s*\[([^\]]*)\]/)
    const observeMatch = body.match(/observe\s*=\s*\[([^\]]*)\]/)
    const deps = depsMatch
      ? depsMatch[1]!.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
      : []
    const observe = observeMatch
      ? observeMatch[1]!.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
      : []
    slots.push({ name: slotName, deps, observe })
  }

  return { name, version, slots }
}

function renderProbeMd(p: ProbeMigration): string {
  const lines: string[] = []
  lines.push('---')
  lines.push('entity: probe')
  lines.push('version: 0.1.0')
  lines.push(`name: ${p.name}`)
  lines.push('---')
  lines.push('')
  lines.push(`# Probe: ${p.name}`)
  lines.push('')
  lines.push('> ' + p.description)
  lines.push('')
  lines.push('## Alignment')
  lines.push('')
  lines.push(`- align: ${p.alignName}`)
  lines.push('')
  lines.push('## Scheme')
  lines.push('')
  lines.push(`- scheme: ${p.scheme}`)
  lines.push('')
  if (p.props.length > 0) {
    lines.push('## Props')
    lines.push('')
    for (const prop of p.props) {
      lines.push(`### ${prop.name}`)
      lines.push(`- type: ${prop.type}`)
      lines.push(`- required: ${prop.required}`)
      if (prop.default !== undefined) {
        lines.push(`- default: ${prop.default}`)
      }
      lines.push('')
    }
  }
  if (p.outputs.length > 0) {
    lines.push('## Output')
    lines.push('')
    for (const o of p.outputs) {
      lines.push(`- ${o.name}: ${o.type}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function renderBlueprintMd(b: BlueprintMigration): string {
  const lines: string[] = []
  lines.push('---')
  lines.push('entity: blueprint')
  lines.push('version: 0.1.0')
  lines.push(`name: ${b.name}`)
  lines.push('---')
  lines.push('')
  lines.push(`# Blueprint: ${b.name}`)
  lines.push('')
  lines.push(`## Version`)
  lines.push('')
  lines.push(`- version: ${b.version}`)
  lines.push('')
  lines.push('## Slots')
  lines.push('')
  for (const slot of b.slots) {
    lines.push(`### ${slot.name}`)
    if (slot.deps.length > 0) {
      lines.push('- deps:')
      for (const d of slot.deps) {
        lines.push(`  - ${d}`)
      }
    } else {
      lines.push('- deps: []')
    }
    if (slot.observe.length > 0) {
      lines.push('- observe:')
      for (const o of slot.observe) {
        lines.push(`  - ${o}`)
      }
    }
    lines.push('')
  }
  return lines.join('\n')
}

function main() {
  const dryRun = !process.argv.includes('--write')

  // Probes
  console.log(`=== Probes in ${BUILTIN_PROBES_DIR} ===`)
  const probeFiles = listOxnFilesInDir(BUILTIN_PROBES_DIR)
  for (const file of probeFiles) {
    const content = readFileSync(file, 'utf-8')
    const parsed = parseProbe(content)
    if (!parsed) {
      console.log(`  SKIP: ${file} (parse failed)`)
      continue
    }
    const md = renderProbeMd(parsed)
    const mdPath = file.replace(/\.oxn$/, '.md')
    if (dryRun) {
      console.log(`  DRY: ${file} → ${mdPath}`)
    } else {
      writeFileSync(mdPath, md, 'utf-8')
      console.log(`  WROTE: ${mdPath}`)
    }
  }

  // Blueprints
  console.log('')
  console.log(`=== Blueprints in ${BUILTIN_BLUEPRINTS_DIR} ===`)
  const bpFiles = listOxnFilesInDir(BUILTIN_BLUEPRINTS_DIR)
  for (const file of bpFiles) {
    const content = readFileSync(file, 'utf-8')
    const parsed = parseBlueprint(content)
    if (!parsed) {
      console.log(`  SKIP: ${file} (parse failed)`)
      continue
    }
    const md = renderBlueprintMd(parsed)
    const mdPath = file.replace(/\.oxn$/, '.md')
    if (dryRun) {
      console.log(`  DRY: ${file} → ${mdPath}`)
    } else {
      writeFileSync(mdPath, md, 'utf-8')
      console.log(`  WROTE: ${mdPath}`)
    }
  }

  if (dryRun) {
    console.log('')
    console.log('Run with --write to actually write files.')
  }
}

main()
