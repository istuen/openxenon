import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { SupportedLocale } from './project-config'
import { DEFAULT_LOCALE } from './project-config'
import { getAllSkillsForLocale } from '../skills/loader'
import type { OpenXenonSkill } from '../skills/types'
import { readProjectConfig } from './project-config-io'

export interface CompilationResult {
  skillId: string
  outputPath: string
  action: 'created' | 'updated' | 'skipped'
  referencesWritten?: number
}

export interface CompilationReport {
  adapter: string
  results: CompilationResult[]
  total: number
  created: number
  updated: number
  skipped: number
  referencesCreated: number
  /** Number of stale skill directories removed from .opencode/skills/. */
  pruned: number
  /**
   * v0.1.3 — 双数据源防线：
   * `.opencode/skills/oxn-*` 下存在但 src/skills/loader.ts:skillMeta 未注册的目录。
   * 这些是工程师手写的「孤儿 skill」—— OpenCode 会发现但 oxn init 不会编译/清理。
   * 作为软警告上报，CLI 在 init 输出中提示。
   */
  unregistered: string[]
}

export function loadSkills(locale: SupportedLocale = DEFAULT_LOCALE): OpenXenonSkill[] {
  return getAllSkillsForLocale(locale)
}

function defaultRender(skill: OpenXenonSkill): string {
  return `---
name: ${skill.id}
description: ${skill.description}
---
${skill.instruction}
`
}

export function compileSkill(
  skill: OpenXenonSkill,
  _adapterId: string,
  projectPath: string,
  force: boolean = false,
): CompilationResult {
  const content = defaultRender(skill)
  const outputPath = join(projectPath, '.opencode', 'skills', skill.id, 'SKILL.md')
  const skillDir = dirname(outputPath)
  const action: 'created' | 'updated' | 'skipped' = determineAction(outputPath, content, force)
  let referencesWritten = 0

  if (!existsSync(skillDir)) {
    mkdirSync(skillDir, { recursive: true })
  }

  if (action !== 'skipped') {
    writeFileSync(outputPath, content, 'utf-8')
  }

  if (skill.references && skill.references.length > 0) {
    const referencesDir = join(skillDir, 'references')
    if (!existsSync(referencesDir)) {
      mkdirSync(referencesDir, { recursive: true })
    }

    const refsHashFile = join(skillDir, '.references.hash')
    const newRefsHash = computeReferencesHash(skill.references)
    let needsWrite = true

    if (existsSync(refsHashFile)) {
      const oldHash = readFileSync(refsHashFile, 'utf-8').trim()
      needsWrite = oldHash !== newRefsHash
    }

    if (needsWrite || force) {
      for (const ref of skill.references) {
        writeFileSync(join(referencesDir, ref.filename), ref.content, 'utf-8')
        referencesWritten++
      }
      writeFileSync(refsHashFile, newRefsHash, 'utf-8')
    }
  }

  return {
    skillId: skill.id,
    outputPath,
    action,
    referencesWritten,
  }
}

export function compileAllSkills(adapterId: string, projectPath: string, force: boolean = false): CompilationReport {
  const config = readProjectConfig(projectPath)
  const locale = (config?.locale ?? DEFAULT_LOCALE) as SupportedLocale
  const skills = loadSkills(locale)
  const results: CompilationResult[] = []

  for (const skill of skills) {
    try {
      const result = compileSkill(skill, adapterId, projectPath, force)
      results.push(result)
    } catch (error) {
      console.error(`Failed to compile skill ${skill.id}: ${error}`)
    }
  }

  // Prune stale skills: any .opencode/skills/<id>/ left on disk that
  // is not in the current skill set is a removed/deprecated skill.
  // This is important for `oxn init --force` to actually clean up the
  // .opencode/skills/ tree after a Skill is dropped from skillMeta.
  //
  // v0.1.3：分开两类「未注册」：
  //   - 非 oxn- 前缀：第三方 skill（OpenCode 也扫描这些），保留 + 计数
  //   - oxn- 前缀但未在 skillMeta：孤儿 skill（双数据源风险），保留 + 上报 unregistered
  const skillsDir = join(projectPath, '.opencode', 'skills')
  const currentIds = new Set(skills.map((s) => s.id))
  const unregistered: string[] = []
  let pruned = 0
  if (existsSync(skillsDir)) {
    const { readdirSync } = require('fs') as typeof import('fs')
    for (const entry of readdirSync(skillsDir)) {
      if (entry.startsWith('.')) continue
      if (currentIds.has(entry)) continue
      if (entry.startsWith('oxn-')) {
        unregistered.push(entry)
        continue
      }
      const dir = join(skillsDir, entry)
      try {
        rmSync(dir, { recursive: true, force: true })
        pruned++
      } catch {
        // best-effort cleanup
      }
    }
  }

  const created = results.filter((r) => r.action === 'created').length
  const updated = results.filter((r) => r.action === 'updated').length
  const skipped = results.filter((r) => r.action === 'skipped').length
  const referencesCreated = results.reduce((sum, r) => sum + (r.referencesWritten || 0), 0)

  return {
    adapter: adapterId,
    results,
    total: results.length,
    created,
    updated,
    skipped,
    referencesCreated,
    pruned,
    unregistered,
  }
}

function determineAction(outputPath: string, newContent: string, force: boolean): 'created' | 'updated' | 'skipped' {
  if (!existsSync(outputPath)) {
    return 'created'
  }

  if (force) {
    return 'updated'
  }

  const existingContent = readFileSync(outputPath, 'utf-8')
  const existingHash = createHash('sha256').update(existingContent).digest('hex')
  const newHash = createHash('sha256').update(newContent).digest('hex')

  if (existingHash === newHash) {
    return 'skipped'
  }

  return 'updated'
}

function computeReferencesHash(references: { filename: string; content: string }[]): string {
  if (!references || references.length === 0) {
    return ''
  }
  const combined = references.map((r) => `${r.filename}:${r.content}`).join('|')
  return createHash('sha256').update(combined).digest('hex')
}

export function formatCompilationReport(report: CompilationReport): string {
  const lines: string[] = [
    `Skill 编译报告 (${report.adapter})`,
    '='.repeat(40),
    `总计: ${report.total} 个 Skill`,
    `新建: ${report.created}`,
    `更新: ${report.updated}`,
    `跳过: ${report.skipped}`,
    `References: ${report.referencesCreated}`,
    '',
    '详细结果:',
  ]

  for (const result of report.results) {
    const statusIcon = {
      created: '✓',
      updated: '↻',
      skipped: '-',
    }[result.action]

    const statusText = {
      created: '新建',
      updated: '更新',
      skipped: '跳过',
    }[result.action]

    lines.push(`  ${statusIcon} ${result.skillId} [${statusText}]`)
  }

  // v0.1.3：双数据源防线 — 报告 oxn- 前缀但未在 src/skills/ 注册的孤儿目录
  if (report.unregistered.length > 0) {
    lines.push('')
    lines.push(`⚠️  ${report.unregistered.length} 个 oxn-* 目录未在 src/skills/loader.ts 注册：`)
    for (const id of report.unregistered) {
      lines.push(`  ⚠  ${id}（在 .opencode/skills/${id}/ 存在但 skillMeta 未声明；OXN 不会编译/清理）`)
    }
    lines.push('  → 修复：在 src/skills/loader.ts 的 skillMeta[locale] 中添加该 id，或从 .opencode/skills/ 删除该目录')
  }

  return lines.join('\n')
}
