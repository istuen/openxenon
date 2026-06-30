// src/cli/config-cmd.ts
//
// `oxn config show` and `oxn config set <key> <value>`.
//
// These commands read/write .oxnrc in the project root (CWD). The set
// command supports a small whitelist of keys (currently just `leaderMode`)
// so we never silently persist arbitrary JSON.

import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'path'
import { DEFAULT_ASSET_DIRS, type ProjectConfig } from '@openxenon/engine/infra/paths'
import { getFormatFromArgs, output, outputError } from './output'
import {
  DEFAULT_LEADER_MODE,
  OXN_RC_FILENAME,
  VALID_LEADER_MODES,
  loadOxnRc,
  normalizeLeaderMode,
  resolveLeaderMode,
  type LeaderMode,
  type OxnConfig,
} from './config-loader'
import { readProjectConfig, writeProjectConfig } from './project-config-io'
import { migrateAssetsToV6Layout } from '@openxenon/engine/infra/assets/asset-path-resolver'
import { DEFAULT_ADAPTERS, type SkillAdapterId } from '../skills/adapters'

const SUPPORTED_SET_KEYS = [
  'leaderMode',
  'assetRoot',
  'assetDirs.domain',
  'assetDirs.blueprint',
  'assetDirs.stack',
] as const
type SupportedSetKey = (typeof SUPPORTED_SET_KEYS)[number]

function getProjectRoot(): string {
  return process.cwd()
}

function readConfigFile(): OxnConfig {
  const path = join(getProjectRoot(), OXN_RC_FILENAME)
  if (!existsSync(path)) return { version: 1 }
  const raw = readFileSync(path, 'utf-8')
  const parsed = JSON.parse(raw) as OxnConfig
  return parsed
}

function writeConfigFile(config: OxnConfig): string {
  const projectRoot = getProjectRoot()
  const path = join(projectRoot, OXN_RC_FILENAME)
  if (!existsSync(projectRoot)) {
    mkdirSync(projectRoot, { recursive: true })
  }
  if (!existsSync(dirname(path))) {
    mkdirSync(dirname(path), { recursive: true })
  }
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
  return path
}

const showSubcommand = defineCommand({
  meta: { name: 'show', description: t('config.show.description') },
  args: {
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
    const { config, warning } = loadOxnRc(projectRoot)
    const cliFlag = process.argv
      .find((a) => a.startsWith('--leader-mode'))
      ?.split('=')
      .slice(1)
      .join('=')
    const envValue = process.env.OXN_LEADER_MODE
    const resolved = resolveLeaderMode({ cliFlag, envValue, projectConfig: config })
    const projectConfig = readProjectConfig(projectRoot)
    const tools = projectConfig?.tools
    output(
      {
        ok: true,
        data: {
          leaderMode: resolved.mode,
          source: resolved.source,
          defaults: { leaderMode: DEFAULT_LEADER_MODE },
          projectConfig,
          projectConfigPath: join(projectRoot, '.openxenon', 'config.json'),
          openxenon: {
            config: projectConfig,
            path: join(projectRoot, '.openxenon', 'config.json'),
          },
          tools: formatToolsForShow(tools),
          ...(warning ? { warning } : {}),
        },
        human: formatShowHuman(resolved.mode, resolved.source, projectConfig, tools),
      },
      format,
    )
  },
})

const setSubcommand = defineCommand({
  meta: { name: 'set', description: t('config.set.description') },
  args: {
    key: { type: 'string', required: true, description: t('config.set.key') },
    value: { type: 'string', required: true, description: t('config.set.value') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const key = ctx.args.key as string
    const value = ctx.args.value as string
    if (!SUPPORTED_SET_KEYS.includes(key as SupportedSetKey)) {
      return outputError(
        {
          code: 'OXN_CONFIG_KEY_UNSUPPORTED',
          message: `unsupported config key: ${key}`,
          suggestion: `supported keys: ${SUPPORTED_SET_KEYS.join(', ')}`,
        },
        format,
      )
    }
    if (key === 'leaderMode') {
      const normalized = normalizeLeaderMode(value)
      if (!normalized) {
        return outputError(
          {
            code: 'OXN_CONFIG_VALUE_INVALID',
            message: `invalid leaderMode: ${JSON.stringify(value)}`,
            suggestion: `valid values: ${VALID_LEADER_MODES.join(', ')}`,
          },
          format,
        )
      }
      const next: OxnConfig = { ...readConfigFile(), version: 1, leaderMode: normalized as LeaderMode }
      const path = writeConfigFile(next)
      output(
        {
          ok: true,
          data: {
            key,
            value: normalized,
            path,
            config: next,
          },
        },
        format,
      )
      return
    }

    // v0.6 PR-1: assetRoot + assetDirs.<kind>
    if (key === 'assetRoot') {
      const next: OxnConfig = { ...readConfigFile(), version: 1, assetRoot: value }
      const path = writeConfigFile(next)
      output({ ok: true, data: { key, value, path, config: next } }, format)
      return
    }
    if (key === 'assetDirs.domain' || key === 'assetDirs.blueprint' || key === 'assetDirs.stack') {
      const kind = key.split('.')[1] as 'domain' | 'blueprint' | 'stack'
      const current = readConfigFile()
      const existingDirs: { domain?: string; blueprint?: string; stack?: string } = current.assetDirs ?? {}
      const next: OxnConfig = {
        ...current,
        version: 1,
        assetDirs: {
          domain: existingDirs.domain ?? DEFAULT_ASSET_DIRS.domain,
          blueprint: existingDirs.blueprint ?? DEFAULT_ASSET_DIRS.blueprint,
          stack: existingDirs.stack ?? DEFAULT_ASSET_DIRS.stack,
          [kind]: value,
        },
      }
      const path = writeConfigFile(next)
      output({ ok: true, data: { key, value, path, config: next } }, format)
      return
    }

    return outputError({ code: 'OXN_CONFIG_KEY_UNSUPPORTED', message: `unhandled key: ${key}` }, format)
  },
})

const migrateAssetsSubcommand = defineCommand({
  meta: { name: 'migrate-assets', description: 'v0.5 → v0.6 资产目录布局迁移（探测 + 移动 + 写 config）' },
  args: {
    '--dry-run': { type: 'boolean', description: '只探测，不实际移动文件' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = process.cwd()
    const dryRun = Boolean((ctx.args as Record<string, unknown>)['dry-run'])
    const config = readProjectConfig(projectRoot) as ProjectConfig | null
    const result = migrateAssetsToV6Layout(projectRoot, config, dryRun)

    // 写回 config（如有）
    if (!dryRun && result.configUpdated && config) {
      writeProjectConfig(projectRoot, config)
    }

    output(
      {
        ok: true,
        data: result,
        human: renderMigrateAssetsHuman(result, dryRun),
      },
      format,
    )
  },
})

function renderMigrateAssetsHuman(result: ReturnType<typeof migrateAssetsToV6Layout>, dryRun: boolean): string {
  const lines: string[] = [`Asset directory migration${dryRun ? ' (dry-run)' : ''}:`]
  for (const m of result.moved) {
    lines.push(`  ✓ ${m.kind}: ${m.from} → ${m.to} (${m.fileCount >= 0 ? m.fileCount + ' files' : 'preview'})`)
  }
  for (const s of result.skipped) {
    lines.push(`  · ${s.kind}: skipped (${s.reason})`)
  }
  if (result.configUpdated) {
    lines.push(`  ✓ config.json: updated (assetRoot + assetDirs defaults written)`)
  }
  return lines.join('\n')
}

const configCommand = defineCommand({
  meta: { name: 'config', description: t('config.command.description') },
  subCommands: {
    show: showSubcommand,
    set: setSubcommand,
    'migrate-assets': migrateAssetsSubcommand,
  },
  run() {
    // No-op: citty still invokes the parent run() after a subcommand
    // completes. Suppressing output here keeps --json streams clean.
  },
})

export default configCommand

function formatToolsForShow(tools: { enabled?: SkillAdapterId[]; disabled?: SkillAdapterId[] } | undefined | null) {
  if (!tools) {
    return { active: [...DEFAULT_ADAPTERS], source: 'default' as const }
  }
  if (tools.enabled && tools.enabled.length > 0) {
    return { active: [...tools.enabled], source: 'enabled' as const, enabled: [...tools.enabled] }
  }
  if (tools.disabled && tools.disabled.length > 0) {
    const remaining = DEFAULT_ADAPTERS.filter((id) => !tools.disabled!.includes(id))
    return { active: remaining, source: 'disabled' as const, disabled: [...tools.disabled] }
  }
  return { active: [...DEFAULT_ADAPTERS], source: 'default' as const }
}

function formatShowHuman(
  leaderMode: string,
  source: string,
  projectConfig: ReturnType<typeof readProjectConfig>,
  tools: { enabled?: SkillAdapterId[]; disabled?: SkillAdapterId[] } | undefined,
): string {
  const lines = [`Config (.oxnrc):`, `  leaderMode: ${leaderMode} (source: ${source})`]
  if (projectConfig) {
    lines.push(`  mode: ${projectConfig.mode}`)
    lines.push(`  locale: ${projectConfig.locale || 'zh-CN'}`)
    if (projectConfig.name) lines.push(`  name: ${projectConfig.name}`)
  }
  lines.push(`Skill tools:`)
  if (!tools) {
    lines.push(`  ${DEFAULT_ADAPTERS.join(', ')} (default)`)
  } else if (tools.enabled && tools.enabled.length > 0) {
    if (
      tools.enabled.length === DEFAULT_ADAPTERS.length &&
      DEFAULT_ADAPTERS.every((id) => tools.enabled!.includes(id))
    ) {
      lines.push(`  ${tools.enabled.join(', ')} (default)`)
    } else {
      lines.push(`  enabled: ${tools.enabled.join(', ')}`)
    }
  } else if (tools.disabled && tools.disabled.length > 0) {
    const remaining = DEFAULT_ADAPTERS.filter((id) => !tools.disabled!.includes(id))
    lines.push(`  disabled: ${tools.disabled.join(', ')} → active: ${remaining.join(', ') || '(none)'}`)
  } else {
    lines.push(`  ${DEFAULT_ADAPTERS.join(', ')} (default)`)
  }
  return `${lines.join('\n')}\n`
}
