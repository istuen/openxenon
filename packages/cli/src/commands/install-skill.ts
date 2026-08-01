// src/cli/install-skill.ts
//
// `oxn install-skill` 把 OpenXenon Skill 编译并写入目标目录。
//
// 默认行为（v0.6.2 修订）：写到**当前项目**的 `.opencode/skills/` 等目录，
// 与 `oxn init` 的 `compileAllSkills` 行为一致。
//
// `--global` 写到**全局**目录（`~/.opencode/skills/` 等），跨项目可见。
//
// 默认行为历史说明：
//   v0.6.1 之前 install-skill 默认写到 `~/.opencode/skills/`（全局），是错误的历史实现。
//   v0.6.2 修订为默认项目级（与 init 对齐），`--global` 才写到全局。
//
// 适配器：
//   - opencode → .opencode/skills/
//   - claude   → .claude/skills/
//   - agents   → .agents/skills/

import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'
import { existsSync, mkdirSync } from '@openxenon/engine/infra/filesystem'
import { join, resolve } from 'path'
import { getFormatFromArgs, output, outputError } from './output'
import { compileAllSkillsToRoot, compileSkillToRoot } from './skill-compiler'
import { DEFAULT_ADAPTERS, isSkillAdapterId, type SkillAdapterId } from '../skills/adapters'
import { getAllSkillsForLocale } from '../skills/loader'
import { DEFAULT_LOCALE } from './project-config'
import { readProjectConfig } from './project-config-io'

function getGlobalHome(): string {
  return process.env.HOME ?? process.env.USERPROFILE ?? '.'
}

function resolveGlobalRoots(): Record<SkillAdapterId, string> {
  const home = getGlobalHome()
  return {
    opencode: join(home, '.opencode', 'skills'),
    claude: join(home, '.claude', 'skills'),
    agents: join(home, '.agents', 'skills'),
  }
}

function ensureDir(p: string): void {
  if (!existsSync(p)) {
    mkdirSync(p, { recursive: true })
  }
}

function normalizeTools(input: string | string[] | undefined): SkillAdapterId[] {
  if (!input) return [...DEFAULT_ADAPTERS]
  const arr = Array.isArray(input) ? input : [input]
  const out: SkillAdapterId[] = []
  for (const raw of arr) {
    for (const piece of String(raw).split(',')) {
      const v = piece.trim()
      if (!v) continue
      if (!isSkillAdapterId(v)) {
        throw new Error(`OXN_INVALID_TOOL: unknown tool id "${v}". Valid: ${DEFAULT_ADAPTERS.join(', ')}`)
      }
      out.push(v)
    }
  }
  return Array.from(new Set(out))
}

export default defineCommand({
  meta: {
    name: 'install-skill',
    description: t('installSkill.description'),
  },
  args: {
    target: {
      type: 'string',
      description: t('installSkill.target'),
    },
    skill: {
      type: 'string',
      description: t('installSkill.skill'),
    },
    tools: {
      type: 'string',
      description: t('installSkill.tools', { adapters: DEFAULT_ADAPTERS.join(', ') }),
    },
    global: {
      type: 'boolean',
      alias: 'g',
      description: t('installSkill.global'),
      default: false,
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: t('installSkill.force'),
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const force = ctx.args.force === true || ctx.args.f === true
    const isGlobal = ctx.args.global === true || ctx.args.g === true
    const explicitTarget = typeof ctx.args.target === 'string' ? resolve(ctx.args.target) : null
    const explicitSkill = typeof ctx.args.skill === 'string' ? ctx.args.skill : null

    const projectPath = process.cwd()
    const globalRoots = resolveGlobalRoots()

    let toolIds: SkillAdapterId[]
    try {
      toolIds = normalizeTools(ctx.args.tools as string | string[] | undefined)
    } catch (err) {
      return outputError(
        {
          code: 'OXN_INVALID_TOOL',
          message: err instanceof Error ? err.message : String(err),
          suggestion: `valid tools: ${DEFAULT_ADAPTERS.join(', ')}`,
        },
        format,
      )
    }

    const config = readProjectConfig(projectPath)
    const locale = (config?.locale ?? DEFAULT_LOCALE) as Parameters<typeof getAllSkillsForLocale>[0]
    const allSkills = getAllSkillsForLocale(locale)
    const skillIds = explicitSkill
      ? allSkills.filter((s) => s.id === explicitSkill).map((s) => s.id)
      : allSkills.map((s) => s.id)

    if (explicitSkill && skillIds.length === 0) {
      return outputError(
        {
          code: 'OXN_SKILL_NOT_FOUND',
          message: `Skill "${explicitSkill}" not found in registered Skills`,
          suggestion: `Available: ${allSkills.map((s) => s.id).join(', ')}`,
        },
        format,
      )
    }

    const installed: { skill: string; tool: SkillAdapterId; path: string }[] = []
    const skipped: { skill: string; tool: SkillAdapterId; reason: string }[] = []
    const failed: { skill: string; tool: SkillAdapterId; error: string }[] = []

    if (explicitTarget) {
      // 显式 target：写到指定目录（单 adapter：opencode 风格）
      ensureDir(explicitTarget)
      try {
        for (const skill of allSkills.filter((s) => skillIds.includes(s.id))) {
          const result = compileSkillToRoot(skill, explicitTarget, force)
          if (result.action === 'skipped') {
            skipped.push({ skill: skill.id, tool: 'opencode', reason: `exists at ${result.outputPath}` })
          } else {
            installed.push({ skill: skill.id, tool: 'opencode', path: result.outputPath })
          }
        }
      } catch (err) {
        return outputError(
          {
            code: 'OXN_INSTALL_SKILL_FAILED',
            message: err instanceof Error ? err.message : String(err),
          },
          format,
        )
      }
    } else {
      // 标准路径：每个 tool 写到对应目录
      const roots = isGlobal ? globalRoots : null
      for (const toolId of toolIds) {
        const root = roots ? roots[toolId] : join(projectPath, '.opencode', 'skills') // dummy; compileAllSkills 计算真实路径
        // 简化：直接调 compileAllSkills 走项目级；全局级调 compileAllSkillsToRoot 走自定义 root
        if (isGlobal) {
          try {
            ensureDir(root)
            for (const skill of allSkills.filter((s) => skillIds.includes(s.id))) {
              const result = compileSkillToRoot(skill, root, force)
              if (result.action === 'skipped') {
                skipped.push({ skill: skill.id, tool: toolId, reason: `exists at ${result.outputPath}` })
              } else {
                installed.push({ skill: skill.id, tool: toolId, path: result.outputPath })
              }
            }
          } catch (err) {
            for (const skillId of skillIds) {
              failed.push({
                skill: skillId,
                tool: toolId,
                error: err instanceof Error ? err.message : String(err),
              })
            }
          }
        } else {
          try {
            const report = compileAllSkillsToRoot(toolIds, projectPath, root, force)
            for (const r of report.results) {
              if (r.action === 'skipped') {
                skipped.push({ skill: r.skillId, tool: toolId, reason: `exists at ${r.outputPath}` })
              } else {
                installed.push({ skill: r.skillId, tool: toolId, path: r.outputPath })
              }
            }
          } catch (err) {
            for (const skillId of skillIds) {
              failed.push({
                skill: skillId,
                tool: toolId,
                error: err instanceof Error ? err.message : String(err),
              })
            }
          }
        }
      }
    }

    const targetDesc = explicitTarget
      ? explicitTarget
      : isGlobal
        ? `${getGlobalHome()}/{${toolIds.map((id) => `.${id === 'opencode' ? 'opencode' : id === 'claude' ? 'claude' : 'agents'}/skills`).join('|')}}`
        : `./{${toolIds.map((id) => `.${id === 'opencode' ? 'opencode' : id === 'claude' ? 'claude' : 'agents'}/skills`).join('|')}}`

    output(
      {
        ok: failed.length === 0,
        data: {
          installed,
          skipped,
          failed,
          scope: isGlobal ? 'global' : 'project',
          target: targetDesc,
        },
      },
      format,
    )
  },
})
