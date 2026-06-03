// src/cli/install-skill.ts
//
// `oxn install-skill` copies the canonical OpenCode Skill from
// `.opencode/skills/oxn-work/SKILL.md` (this repo) to a target directory.
// By default the target is `~/.opencode/skills/oxn-work/` (the user's
// global OpenCode skills folder), so the AI agent can pick the skill up
// without a per-project install.
//
// Embed the canonical SKILL.md into the compiled binary so the command works
// regardless of the user's current working directory. In dev (`bun run`),
// this resolves to the real on-disk path; in a `--compile`d binary, Bun
// replaces it with an internal `$bunfs/...` path that always reads the
// embedded content.
import skillSource from '../../.opencode/skills/oxn-work/SKILL.md' with { type: 'file' }

import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { getFormatFromArgs, output, outputError } from './output'

// Fallback discovery used only when the embedded import cannot be read
// (e.g. running on a non-Bun runtime). The dev path is
// `src/cli/install-skill.ts -> ../../.opencode/skills/oxn-work/SKILL.md`.
function findSkillSourceFallback(): string | null {
  const candidates = [
    resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.opencode', 'skills', 'oxn-work', 'SKILL.md')),
    resolve(join(process.cwd(), '.opencode', 'skills', 'oxn-work', 'SKILL.md')),
  ]
  for (const path of candidates) {
    if (existsSync(path)) return path
  }
  return null
}

function readSkillContent(): { content: string; source: string } {
  try {
    const content = readFileSync(skillSource, 'utf-8')
    return { content, source: skillSource }
  } catch {
    const fallback = findSkillSourceFallback()
    if (fallback) {
      const content = readFileSync(fallback, 'utf-8')
      return { content, source: fallback }
    }
    throw new Error('embedded source unreadable and no fallback found')
  }
}

function getDefaultTargetDir(): string {
  // Install to the user's global OpenCode skills folder so the AI agent
  // can pick the skill up across all projects.
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '.'
  return join(home, '.opencode', 'skills', 'oxn-work')
}

export default defineCommand({
  meta: {
    name: 'install-skill',
    description: '将 oxn-work OpenCode Skill 安装到目标目录 (默认: ~/.opencode/skills/oxn-work)',
  },
  args: {
    target: {
      type: 'string',
      description: '目标目录 (默认: ~/.opencode/skills/oxn-leader)',
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
    const targetDir = typeof ctx.args.target === 'string' ? resolve(ctx.args.target) : getDefaultTargetDir()
    const targetPath = join(targetDir, 'SKILL.md')

    let skill: { content: string; source: string }
    try {
      skill = readSkillContent()
    } catch (err) {
      return outputError(
        {
          code: 'OXN_SKILL_SOURCE_NOT_FOUND',
          message: `源 SKILL.md 找不到: ${err instanceof Error ? err.message : String(err)}`,
          suggestion: '请在 OpenXenon 源码目录运行，或检查 .opencode/skills/oxn-leader/SKILL.md 是否存在',
        },
        format,
      )
    }

    if (existsSync(targetPath) && !force) {
      return outputError(
        {
          code: 'OXN_SKILL_ALREADY_INSTALLED',
          message: `Skill 已存在于: ${targetPath}`,
          suggestion: '使用 --force / -f 强制覆盖',
        },
        format,
      )
    }

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }
    writeFileSync(targetPath, skill.content, 'utf-8')

    output({ ok: true, data: { path: targetPath, source: skill.source } }, format)
  },
})
