import { createHash } from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'path'
import type { SupportedLocale } from './project-config'
import { DEFAULT_LOCALE } from './project-config'
import { getAllSkillsForLocale } from '../skills/loader'
import type { OpenXenonSkill } from '../skills/types'
import { readProjectConfig } from './project-config-io'
import { DEFAULT_ADAPTERS, SKILL_ADAPTERS, type SkillAdapterId } from '../skills/adapters'

export interface CompilationResult {
  skillId: string
  outputPath: string
  action: 'created' | 'updated' | 'skipped'
  referencesWritten?: number
}

export interface CompilationReport {
  toolId: SkillAdapterId
  results: CompilationResult[]
  total: number
  created: number
  updated: number
  skipped: number
  referencesCreated: number
  pruned: number
}

export interface MultiToolCompilationReport {
  byTool: Record<SkillAdapterId, CompilationReport>
  total: number
  created: number
  updated: number
  skipped: number
  pruned: number
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

function compileSkillToRoot(skill: OpenXenonSkill, skillsRoot: string, force: boolean = false): CompilationResult {
  const content = defaultRender(skill)
  const outputPath = join(skillsRoot, skill.id, 'SKILL.md')
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

/**
 * @deprecated Prefer {@link compileSkillToRoot} + per-tool loop in callers.
 * Kept as a thin wrapper for any external consumers; defaults to opencode.
 */
export function compileSkill(
  skill: OpenXenonSkill,
  _adapterId: string,
  projectPath: string,
  force: boolean = false,
): CompilationResult {
  return compileSkillToRoot(skill, SKILL_ADAPTERS.opencode.root(projectPath), force)
}

function compileForTool(
  toolId: SkillAdapterId,
  projectPath: string,
  skills: OpenXenonSkill[],
  force: boolean,
): CompilationReport {
  const adapter = SKILL_ADAPTERS[toolId]
  const skillsRoot = adapter.root(projectPath)
  const results: CompilationResult[] = []
  for (const skill of skills) {
    try {
      results.push(compileSkillToRoot(skill, skillsRoot, force))
    } catch (error) {
      console.error(`Failed to compile skill ${skill.id} for tool ${toolId}: ${error}`)
    }
  }
  const pruned = pruneStale(toolId, projectPath, skills)
  const created = results.filter((r) => r.action === 'created').length
  const updated = results.filter((r) => r.action === 'updated').length
  const skipped = results.filter((r) => r.action === 'skipped').length
  const referencesCreated = results.reduce((sum, r) => sum + (r.referencesWritten || 0), 0)
  return {
    toolId,
    results,
    total: results.length,
    created,
    updated,
    skipped,
    referencesCreated,
    pruned,
  }
}

function pruneStale(toolId: SkillAdapterId, projectPath: string, skills: OpenXenonSkill[]): number {
  const skillsDir = SKILL_ADAPTERS[toolId].pruneRoot(projectPath)
  const currentIds = new Set(skills.map((s) => s.id))
  let pruned = 0
  if (!existsSync(skillsDir)) return 0
  for (const entry of readdirSync(skillsDir)) {
    if (entry.startsWith('.')) continue
    if (currentIds.has(entry)) continue
    const dir = join(skillsDir, entry)
    try {
      rmSync(dir, { recursive: true, force: true })
      pruned++
    } catch {
      // best-effort cleanup
    }
  }
  return pruned
}

/**
 * Compile skills for the given set of tools (default: all DEFAULT_ADAPTERS).
 * Each tool writes to its own root (e.g. .opencode/skills/, .claude/skills/, .agents/skills/).
 * `adapterOrTools` accepts either a single id (back-compat) or a list.
 */
export function compileAllSkills(
  adapterOrTools: string | readonly string[],
  projectPath: string,
  force: boolean = false,
): MultiToolCompilationReport {
  const toolIds: SkillAdapterId[] = resolveToolIds(adapterOrTools)
  const config = readProjectConfig(projectPath)
  const locale = (config?.locale ?? DEFAULT_LOCALE) as SupportedLocale
  const skills = loadSkills(locale)

  const byTool = {} as Record<SkillAdapterId, CompilationReport>
  let total = 0
  let created = 0
  let updated = 0
  let skipped = 0
  let pruned = 0

  for (const toolId of toolIds) {
    const report = compileForTool(toolId, projectPath, skills, force)
    byTool[toolId] = report
    total += report.total
    created += report.created
    updated += report.updated
    skipped += report.skipped
    pruned += report.pruned
  }

  return { byTool, total, created, updated, skipped, pruned }
}

function resolveToolIds(input: string | readonly string[]): SkillAdapterId[] {
  const arr = Array.isArray(input) ? input : [input]
  const out: SkillAdapterId[] = []
  for (const raw of arr) {
    if (typeof raw !== 'string') continue
    for (const piece of raw.split(',')) {
      const v = piece.trim()
      if (!v) continue
      if (!(DEFAULT_ADAPTERS as readonly string[]).includes(v)) {
        throw new Error(`Unknown skill tool id: "${v}". Valid: ${DEFAULT_ADAPTERS.join(', ')}`)
      }
      out.push(v as SkillAdapterId)
    }
  }
  return Array.from(new Set(out))
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

export function formatCompilationReport(report: MultiToolCompilationReport): string {
  const lines: string[] = []
  let first = true
  for (const toolId of DEFAULT_ADAPTERS) {
    const r = report.byTool[toolId]
    if (!r) continue
    if (!first) lines.push('')
    first = false
    lines.push(`Skill 编译报告 [${r.toolId}]`)
    lines.push('='.repeat(40))
    lines.push(`总计: ${r.total} 个 Skill`)
    lines.push(`新建: ${r.created}`)
    lines.push(`更新: ${r.updated}`)
    lines.push(`跳过: ${r.skipped}`)
    lines.push(`References: ${r.referencesCreated}`)
    if (r.pruned > 0) lines.push(`Pruned: ${r.pruned}`)
    lines.push('')
    lines.push('详细结果:')
    for (const result of r.results) {
      const statusIcon = { created: '✓', updated: '↻', skipped: '-' }[result.action]
      const statusText = { created: '新建', updated: '更新', skipped: '跳过' }[result.action]
      lines.push(`  ${statusIcon} ${result.skillId} [${statusText}]`)
    }
  }
  return lines.join('\n')
}
