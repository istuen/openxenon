import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { createHash } from 'crypto'
import type { OpenXenonSkill } from '../skills/types'
import { allSkills } from '../skills'

export interface CompilationResult {
  skillId: string
  outputPath: string
  action: 'created' | 'updated' | 'skipped'
}

export interface CompilationReport {
  adapter: string
  results: CompilationResult[]
  total: number
  created: number
  updated: number
  skipped: number
}

export function loadSkills(): OpenXenonSkill[] {
  return allSkills
}

function defaultRender(skill: OpenXenonSkill): string {
  return `---
skill: ${skill.id}
description: ${skill.description}
---
${skill.instruction}
`
}

export function compileSkill(
  skill: OpenXenonSkill,
  _adapterId: string,
  projectPath: string,
  force: boolean = false
): CompilationResult {
  const content = defaultRender(skill)
  const outputPath = join(projectPath, '.opencode', 'skills', `${skill.id}.md`)
  const action: 'created' | 'updated' | 'skipped' = determineAction(outputPath, content, force)
  
  if (action !== 'skipped') {
    const outputDir = dirname(outputPath)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }
    writeFileSync(outputPath, content, 'utf-8')
  }
  
  return {
    skillId: skill.id,
    outputPath,
    action
  }
}

export function compileAllSkills(
  adapterId: string,
  projectPath: string,
  force: boolean = false
): CompilationReport {
  const skills = loadSkills()
  const results: CompilationResult[] = []
  
  for (const skill of skills) {
    try {
      const result = compileSkill(skill, adapterId, projectPath, force)
      results.push(result)
    } catch (error) {
      console.error(`Failed to compile skill ${skill.id}: ${error}`)
    }
  }
  
  const created = results.filter(r => r.action === 'created').length
  const updated = results.filter(r => r.action === 'updated').length
  const skipped = results.filter(r => r.action === 'skipped').length
  
  return {
    adapter: adapterId,
    results,
    total: results.length,
    created,
    updated,
    skipped
  }
}

function determineAction(
  outputPath: string,
  newContent: string,
  force: boolean
): 'created' | 'updated' | 'skipped' {
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

export function formatCompilationReport(report: CompilationReport): string {
  const lines: string[] = [
    `Skill 编译报告 (${report.adapter})`,
    '=' .repeat(40),
    `总计: ${report.total} 个 Skill`,
    `新建: ${report.created}`,
    `更新: ${report.updated}`,
    `跳过: ${report.skipped}`,
    '',
    '详细结果:'
  ]
  
  for (const result of report.results) {
    const statusIcon = {
      created: '✓',
      updated: '↻',
      skipped: '-'
    }[result.action]
    
    const statusText = {
      created: '新建',
      updated: '更新',
      skipped: '跳过'
    }[result.action]
    
    lines.push(`  ${statusIcon} ${result.skillId} [${statusText}]`)
  }
  
  return lines.join('\n')
}
