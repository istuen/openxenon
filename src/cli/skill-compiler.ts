import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { SupportedLocale } from '../kernel/processors/project-config'
import { DEFAULT_LOCALE } from '../kernel/processors/project-config'
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

  return lines.join('\n')
}
