import { defineCommand } from 'citty'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { setLocale, t } from '../i18n'
import { BOUNDARY_DIR } from '../kernel/index'
import { GLOBAL_BOUNDARY_PATH } from '../infra/global'
import { autoRebuildDomainIndex } from './domain'
import { autoRebuildBlueprintIndex } from '../oxl/compiler/blueprint-index-builder'
import type { ProjectConfig, SupportedLocale } from './project-config'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './project-config'
import { getFormatFromArgs, output, outputError } from './output'
import { readProjectConfig, writeProjectConfig } from './project-config-io'
import { compileAllSkills, formatCompilationReport } from './skill-compiler'
import { DEFAULT_ADAPTERS, isSkillAdapterId, type SkillAdapterId } from '../skills/adapters'

const PROJECT_BOUNDARY_GITIGNORE = `# Runtime state (not for Git; personal/sandbox data)
works/
proofs/
**/*-state.json
**/*-trace.jsonl
**/*-frozen.json
proofs/*/frozen.json

# PR-1: Global Domain slim 索引（AI 离线读；可由 oxn domain index 重建）
.cache/

# PR-2: Work 静态门禁卡（CLI 写；可由 oxn work validate 重建）
.work
`

function ensureGlobalBoundary(): void {
  if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
    mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
  }
}

function ensureProjectBoundary(projectRoot: string): void {
  const boundaryPath = join(projectRoot, BOUNDARY_DIR)
  if (!existsSync(boundaryPath)) {
    mkdirSync(boundaryPath, { recursive: true })
  }
  const gitignorePath = join(boundaryPath, '.gitignore')
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, PROJECT_BOUNDARY_GITIGNORE, 'utf-8')
  }
}

function uniqueTools(ids: SkillAdapterId[]): SkillAdapterId[] {
  return Array.from(new Set(ids))
}

function resolveTools(
  args: {
    tools?: string[] | string
    withoutTools?: string[] | string
    resetTools?: boolean
  },
  existingTools: ProjectConfig['tools'] | undefined,
): SkillAdapterId[] {
  if (args.resetTools) {
    return [...DEFAULT_ADAPTERS]
  }

  const cliWhitelist = normalizeList(args.tools)
  if (cliWhitelist.length > 0) {
    for (const id of cliWhitelist) {
      if (!isSkillAdapterId(id)) {
        throw new Error(`OXN_INVALID_TOOL: 未知 tool id "${id}"。合法值: ${DEFAULT_ADAPTERS.join(', ')}`)
      }
    }
    return uniqueTools(cliWhitelist as SkillAdapterId[])
  }

  if (existingTools?.enabled && existingTools.enabled.length > 0) {
    for (const id of existingTools.enabled) {
      if (!isSkillAdapterId(id)) {
        throw new Error(
          `OXN_INVALID_TOOL: config.tools.enabled 含未知 id "${id}"。合法值: ${DEFAULT_ADAPTERS.join(', ')}`,
        )
      }
    }
    return uniqueTools(existingTools.enabled)
  }

  const cliBlacklist = normalizeList(args.withoutTools)
  const configBlacklist = existingTools?.disabled ?? []
  const allBlack = new Set([...cliBlacklist, ...configBlacklist])
  for (const id of allBlack) {
    if (!isSkillAdapterId(id)) {
      throw new Error(`OXN_INVALID_TOOL: 黑名单含未知 id "${id}"。合法值: ${DEFAULT_ADAPTERS.join(', ')}`)
    }
  }
  return DEFAULT_ADAPTERS.filter((id) => !allBlack.has(id))
}

function normalizeList(v: string[] | string | undefined): string[] {
  if (!v) return []
  if (Array.isArray(v))
    return v
      .flatMap((x) =>
        String(x)
          .split(',')
          .map((s) => s.trim()),
      )
      .filter(Boolean)
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default defineCommand({
  meta: {
    name: 'init',
    description: '初始化项目，在当前项目建立物理围栏',
  },
  args: {
    name: {
      type: 'positional',
      description: '项目名称',
      required: false,
    },
    sandbox: {
      alias: 's',
      type: 'boolean',
      description: '初始化为沙箱模式',
      default: false,
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: '强制重新编译 Skills',
      default: false,
    },
    locale: {
      alias: 'l',
      type: 'string',
      description: `语言/Locale (${SUPPORTED_LOCALES.join(', ')})`,
      default: DEFAULT_LOCALE,
    },
    tools: {
      type: 'string',
      description: `Skill 分发的目标 AI 助手 (白名单，可重复/逗号分隔；合法: ${DEFAULT_ADAPTERS.join(', ')})`,
    },
    'without-tools': {
      type: 'string',
      description: '排除某个 AI 助手 (黑名单，可重复/逗号分隔)',
    },
    'reset-tools': {
      type: 'boolean',
      description: '忽略现有 config.tools，按 DEFAULTS 全部分发',
      default: false,
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const projectPath = process.cwd()
    const projectName = ctx.args.name || projectPath.split('/').pop() || 'unnamed'
    const sandbox = ctx.args.sandbox as boolean
    const force = ctx.args.force as boolean
    const locale = (ctx.args.locale as string) || DEFAULT_LOCALE

    if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
      return outputError(
        {
          code: 'OXN_INVALID_LOCALE',
          message: t('init.invalidLocale', { locale }),
          suggestion: t('init.supportedLocales', { locales: SUPPORTED_LOCALES.join(', ') }),
        },
        format,
      )
    }

    try {
      ensureGlobalBoundary()
      ensureProjectBoundary(projectPath)

      setLocale(locale as SupportedLocale)

      const existingConfig = readProjectConfig(projectPath)
      let message = ''

      if (existingConfig) {
        message = t('init.projectExists', { name: projectName })
        let updated = false
        if (sandbox !== (existingConfig.mode === 'SANDBOX')) {
          existingConfig.mode = sandbox ? 'SANDBOX' : 'PRODUCTION'
          updated = true
          message += `\n  ${t('init.modeUpdated', { mode: existingConfig.mode })}`
        }
        if (locale !== (existingConfig.locale || DEFAULT_LOCALE)) {
          existingConfig.locale = locale as SupportedLocale
          updated = true
          message += `\n  ${t('init.localeUpdated', { locale: existingConfig.locale })}`
        }

        const resetTools = ctx.args['reset-tools'] === true
        if (resetTools) {
          existingConfig.tools = undefined
          updated = true
          message += `\n  ${t('init.toolsReset')}`
        } else {
          const merged = mergeToolsConfig(existingConfig.tools, {
            enabled: normalizeList(ctx.args.tools as string[] | string | undefined),
            disabled: normalizeList(ctx.args['without-tools'] as string[] | string | undefined),
          })
          if (merged.changed) {
            existingConfig.tools = merged.value
            updated = true
            const toolsList = (merged.value?.enabled ?? merged.value?.disabled ?? []).join(', ')
            message += `\n  ${t('init.toolsUpdated', { tools: toolsList })}`
          }
        }

        if (updated) {
          writeProjectConfig(projectPath, existingConfig)
        }
      } else {
        const config: ProjectConfig = {
          version: 1,
          mode: sandbox ? 'SANDBOX' : 'PRODUCTION',
          locale: locale as SupportedLocale,
          name: projectName,
          createdAt: Date.now(),
        }
        const resolved = resolveTools(
          {
            tools: ctx.args.tools as string[] | string | undefined,
            withoutTools: ctx.args['without-tools'] as string[] | string | undefined,
            resetTools: ctx.args['reset-tools'] === true,
          },
          undefined,
        )
        config.tools = { enabled: resolved }
        writeProjectConfig(projectPath, config)
        message = t('init.projectInitialized', { name: projectName, locale })
      }

      const toolIds = resolveTools(
        {
          tools: ctx.args.tools as string[] | string | undefined,
          withoutTools: ctx.args['without-tools'] as string[] | string | undefined,
          resetTools: ctx.args['reset-tools'] === true,
        },
        existingConfig?.tools,
      )

      const report = compileAllSkills(toolIds, projectPath, force)
      const reportStr = formatCompilationReport(report)

      // PR-1: init 后静默重建全局 Domain 索引
      const domainIndexRebuild = autoRebuildDomainIndex(projectPath)
      const domainIndexStatus = domainIndexRebuild.ok
        ? domainIndexRebuild.indexPath
          ? `built at ${domainIndexRebuild.indexPath}`
          : 'no domains yet (index will be built on first `oxn domain create`)'
        : `failed: ${domainIndexRebuild.error}`

      // PR-X: init 后静默重建全局 Blueprint 索引
      const blueprintIndexRebuild = autoRebuildBlueprintIndex(projectPath)
      const blueprintIndexStatus = blueprintIndexRebuild.ok
        ? blueprintIndexRebuild.indexPath
          ? `built at ${blueprintIndexRebuild.indexPath}`
          : 'no blueprints yet (index will be built on first `oxn blueprint create`)'
        : `failed: ${blueprintIndexRebuild.error}`

      const toolsLine = `\n  Tools: ${toolIds.join(', ')}`

      return output(
        {
          data: {
            name: projectName,
            path: projectPath,
            mode: sandbox ? 'SANDBOX' : 'PRODUCTION',
            tools: toolIds,
            skillsCompiled: report.total,
            skillsReport: reportStr,
            domainIndex: domainIndexStatus,
            blueprintIndex: blueprintIndexStatus,
          },
          human: `${message}\n\n${t('init.compilingSkills')}${toolsLine}\n\n${reportStr}${report.pruned ? `\nPruned ${report.pruned} stale skill(s)` : ''}\n\n✓ ${t('init.skillsCompiled')}\n  ${t('init.skillsOutputDir', { dir: toolIds.map((id) => `./${idRootForHuman(id)}`).join(', ') })}\n\n✓ Domain index: ${domainIndexStatus}\n✓ Blueprint index: ${blueprintIndexStatus}`,
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.startsWith('OXN_INVALID_TOOL')) {
        return outputError(
          {
            code: 'OXN_INVALID_TOOL',
            message: errorMsg,
            suggestion: `valid tools: ${DEFAULT_ADAPTERS.join(', ')}`,
          },
          format,
        )
      }
      return outputError(
        {
          code: 'OXN_INIT_FAILED',
          message: errorMsg,
        },
        format,
      )
    }
  },
})

function idRootForHuman(id: SkillAdapterId): string {
  if (id === 'opencode') return '.opencode/skills/'
  if (id === 'claude') return '.claude/skills/'
  return '.agents/skills/'
}

function mergeToolsConfig(
  existing: ProjectConfig['tools'] | undefined,
  incoming: { enabled: string[]; disabled: string[] },
): { value: ProjectConfig['tools']; changed: boolean } {
  if (incoming.enabled.length === 0 && incoming.disabled.length === 0) {
    return { value: existing, changed: false }
  }
  const newEnabled = incoming.enabled.length > 0 ? (incoming.enabled as SkillAdapterId[]) : existing?.enabled
  const newDisabled = incoming.disabled.length > 0 ? (incoming.disabled as SkillAdapterId[]) : existing?.disabled
  const sameEnabled = arrayEqual(newEnabled, existing?.enabled)
  const sameDisabled = arrayEqual(newDisabled, existing?.disabled)
  if (sameEnabled && sameDisabled) {
    return { value: existing, changed: false }
  }
  return { value: { enabled: newEnabled, disabled: newDisabled }, changed: true }
}

function arrayEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  const aa = a ?? []
  const bb = b ?? []
  if (aa.length !== bb.length) return false
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return false
  }
  return true
}
