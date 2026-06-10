// src/cli/install-skill.ts
//
// `oxn install-skill` copies canonical OpenCode Skills from
// `.opencode/skills/oxn-*/SKILL.md` (this repo) to a target directory.
//
// Default behaviour: install ALL oxn-* skills (oxn-cli, oxn-work, oxn-proof)
// to the user's global OpenCode skills folder (`~/.opencode/skills/`).
// Use `--skill <id>` to install a single one.
//
// Embed SKILL.md files into the compiled binary so the command works
// regardless of the user's current working directory. In dev (`bun run`),
// this resolves to the real on-disk path; in a `--compile`d binary, Bun
// replaces it with an internal `$bunfs/...` path that always reads the
// embedded content.
import skillWork from '../../.opencode/skills/oxn-work/SKILL.md' with { type: 'file' }
import skillCli from '../../.opencode/skills/oxn-cli/SKILL.md' with { type: 'file' }
import skillProof from '../../.opencode/skills/oxn-proof/SKILL.md' with { type: 'file' }

import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { getFormatFromArgs, output } from './output'

const EMBEDDED_SKILLS: Record<string, string> = {
  'oxn-cli': skillCli,
  'oxn-work': skillWork,
  'oxn-proof': skillProof,
}

function getDefaultSkillsRoot(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '.'
  return join(home, '.opencode', 'skills')
}

function readSkillContent(skillId: string): { content: string; source: string } {
  const embedded = EMBEDDED_SKILLS[skillId]
  if (embedded) {
    try {
      const content = readFileSync(embedded, 'utf-8')
      return { content, source: embedded }
    } catch {
      // fall through to disk search
    }
  }
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(join(here, '..', '..', '.opencode', 'skills', skillId, 'SKILL.md')),
    resolve(join(process.cwd(), '.opencode', 'skills', skillId, 'SKILL.md')),
  ]
  for (const path of candidates) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8')
      return { content, source: path }
    }
  }
  throw new Error(`source SKILL.md not found for ${skillId}`)
}

export default defineCommand({
  meta: {
    name: 'install-skill',
    description: '把 oxn-* OpenCode Skills 安装到目标目录 (默认: ~/.opencode/skills/, 装全部 oxn-cli/oxn-work)',
  },
  args: {
    target: {
      type: 'string',
      description: '目标根目录 (默认: ~/.opencode/skills/)',
    },
    skill: {
      type: 'string',
      description: '只装指定 skill (例: oxn-work)。不传则装全部 oxn-* skills',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: '覆盖已存在的 Skill',
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const force = ctx.args.force === true || ctx.args.f === true
    const explicitTarget = typeof ctx.args.target === 'string' ? resolve(ctx.args.target) : null
    const explicitSkill = typeof ctx.args.skill === 'string' ? ctx.args.skill : null
    const skillsRoot = explicitTarget ?? getDefaultSkillsRoot()

    const skillIds = explicitSkill
      ? [explicitSkill]
      : existsSync(resolve(join(process.cwd(), '.opencode', 'skills')))
        ? listOxnSkillsFromDisk()
        : Object.keys(EMBEDDED_SKILLS)

    const installed: { skill: string; path: string }[] = []
    const skipped: { skill: string; reason: string }[] = []
    const failed: { skill: string; error: string }[] = []

    for (const skillId of skillIds) {
      const targetDir = join(skillsRoot, skillId)
      const targetPath = join(targetDir, 'SKILL.md')
      let skill: { content: string; source: string }
      try {
        skill = readSkillContent(skillId)
      } catch (err) {
        failed.push({ skill: skillId, error: err instanceof Error ? err.message : String(err) })
        continue
      }
      if (existsSync(targetPath) && !force) {
        skipped.push({ skill: skillId, reason: `exists at ${targetPath}` })
        continue
      }
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true })
      }
      writeFileSync(targetPath, skill.content, 'utf-8')
      installed.push({ skill: skillId, path: targetPath })
    }

    output(
      {
        ok: failed.length === 0,
        data: { installed, skipped, failed, target: skillsRoot },
      },
      format,
    )
  },
})

function listOxnSkillsFromDisk(): string[] {
  const { readdirSync } = require('fs') as typeof import('fs')
  const dir = resolve(join(process.cwd(), '.opencode', 'skills'))
  if (!existsSync(dir)) return Object.keys(EMBEDDED_SKILLS)
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('oxn-'))
    .map((e) => e.name)
}
