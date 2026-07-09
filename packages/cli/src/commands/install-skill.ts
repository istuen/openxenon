// src/cli/install-skill.ts
//
// `oxn install-skill` copies canonical OpenCode Skills from
// `.opencode/skills/oxn-*/SKILL.md` (this repo) to a target directory.
//
// Default behaviour: install ALL oxn-* skills (currently oxn-work, oxn-asset)
// to the user's global OpenCode skills folder (`~/.opencode/skills/`).
// Use `--skill <id>` to install a single one.
//
import { t } from '@openxenon/engine/infra/i18n'

// Embed SKILL.md files into the compiled binary so the command works
// regardless of the user's current working directory. In dev (`bun run`),
// this resolves to the real on-disk path; in a `--compile`d binary, Bun
// replaces it with an internal `$bunfs/...` path that always reads the
// embedded content.
//
// v0.6.x: oxn-work + oxn-asset remain (oxn-cli / oxn-proof deleted).
//
// Note for maintainers: when editing `packages/cli/src/skills/locales/<locale>/<skill>/instruction.md`,
// the corresponding `.opencode/skills/<skill>/SKILL.md` (the file imported below)
// MUST be updated in the same commit, otherwise AI agents will see stale content
// (the `import` line below reads the compiled .opencode/skills/<skill>/SKILL.md,
// NOT the locale source). In dev mode this is consistent (both update together);
// in --compile mode the binary snapshot must be regenerated via `bun run build`.
import skillWork from '../../../../.opencode/skills/oxn-work/SKILL.md' with { type: 'file' }
import skillAsset from '../../../../.opencode/skills/oxn-asset/SKILL.md' with { type: 'file' }

import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { getFormatFromArgs, output } from './output'

const EMBEDDED_SKILLS: Record<string, string> = {
  'oxn-work': skillWork,
  'oxn-asset': skillAsset,
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
    resolve(join(here, '..', '..', '..', '..', '.opencode', 'skills', skillId, 'SKILL.md')),
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
  const dir = resolve(join(process.cwd(), '.opencode', 'skills'))
  if (!existsSync(dir)) return Object.keys(EMBEDDED_SKILLS)
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('oxn-'))
    .map((e) => e.name)
}
