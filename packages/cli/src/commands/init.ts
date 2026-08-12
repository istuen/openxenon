import { defineCommand } from 'citty'
import { existsSync, mkdirSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { setLocale, t } from '@openxenon/engine/infra/i18n'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import { GLOBAL_BOUNDARY_PATH } from '@openxenon/engine/infra/global'
import { autoRebuildDomainIndex } from '@openxenon/engine/Asset/domain-manager'
import { autoRebuildBlueprintIndex } from '@openxenon/engine/oxl/compiler/blueprint-index-builder'
import type { ProjectConfig, SupportedLocale } from './project-config'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './project-config'
import { getFormatFromArgs, output, outputError } from './output'
import { readProjectConfig, writeProjectConfig } from './project-config-io'
import { compileAllSkills, compileAllSkillsToRoot, formatCompilationReport } from './skill-compiler'
import { DEFAULT_ADAPTERS, isSkillAdapterId, type SkillAdapterId } from '../skills/adapters'
import { BUILTIN_SKELETON_TEMPLATES, SKELETON_OUTPUT_DIR } from '../init/builtin-skeleton-templates'

const PROJECT_BOUNDARY_GITIGNORE = `# .openxenon/ 工程工作台 .gitignore 模板（v0.7）
# 默认每个目录单独一行忽略。工程师需 tracked 某目录时注释掉对应行即可。
# 详见 AGENTS.md「文档 SSOT 规则」 + docs/zh-cn/core-concepts.md §1 E1 Asset。

# ─── 运行时产物（始终 ignored）───
works/
proofs/
.cache/
issues/
.work
**/*-state.json
**/*-trace.jsonl
**/*-frozen.json
proofs/*/frozen.json

# ─── 资产（默认 ignored；工程师需 tracked 则注释掉下行）───
assets/

# ─── 对内-沉淀（tracked，无需 ignore）───
# docs/adrs/, docs/rfcs/ 默认 tracked（ADR append-only / RFC 定稿后不变）

# ─── 对内-探索（tracked，无需 ignore）───
# pools/drafts/, pools/issues/, pools/journals/, pools/spikes/ 默认 tracked

# ─── 老布局 fallback（保留兼容位；空则保留 .gitkeep）───
# domains/  — v0.5 fallback（保留 .gitkeep）
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
  // v0.6.3 Fix #1: 落地 8 skeleton 模板到 .openxenon/draft-skeletons/（v0.7.0 RFC-0026 D2 加 goal.md）
  ensureBuiltinSkeletons(projectRoot)
}

/**
 * v0.6.3 Fix #1: 创建 8 内置 skeleton 模板（rfc / asset-{5} / work / goal）
 *   - v0.7.0 RFC-0026 D2: 加 goal.md（--target goal 升华路径依赖）
 *
 * 用途：新项目 `oxn draft create --target` 立即可用，无需手动复制模板。
 * 失败 fallback：创建失败不阻塞 init 流程（log warning）。
 */
function ensureBuiltinSkeletons(projectRoot: string): void {
  const targetDir = join(projectRoot, SKELETON_OUTPUT_DIR)
  try {
    mkdirSync(targetDir, { recursive: true })
    for (const tpl of BUILTIN_SKELETON_TEMPLATES) {
      const filePath = join(targetDir, tpl.filename)
      if (!existsSync(filePath)) {
        writeFileSync(filePath, tpl.content, 'utf-8')
      }
    }
  } catch {
    // ignore — fall back to skeleton-not-found error (existing behavior)
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
    description: t('init.description'),
  },
  args: {
    name: {
      type: 'positional',
      description: t('init.name'),
      required: false,
    },
    sandbox: {
      alias: 's',
      type: 'boolean',
      description: t('init.sandbox'),
      default: false,
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: t('init.forceCompile'),
      default: false,
    },
    locale: {
      alias: 'l',
      type: 'string',
      description: t('init.locale', { locales: SUPPORTED_LOCALES.join(', ') }),
      default: DEFAULT_LOCALE,
    },
    tools: {
      type: 'string',
      description: t('init.tools', { adapters: DEFAULT_ADAPTERS.join(', ') }),
    },
    'without-tools': {
      type: 'string',
      description: t('init.withoutTools'),
    },
    'reset-tools': {
      type: 'boolean',
      description: t('init.resetTools'),
      default: false,
    },
    global: {
      type: 'boolean',
      alias: 'g',
      description: t('init.global'),
      default: false,
    },
    '--json': {
      type: 'boolean',
      description: t('format.json'),
    },
    '--yaml': {
      type: 'boolean',
      description: t('format.yaml'),
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const projectPath = process.cwd()
    const projectName = ctx.args.name || projectPath.split('/').pop() || 'unnamed'
    const sandbox = ctx.args.sandbox as boolean
    const force = ctx.args.force as boolean
    const isGlobal = ctx.args.global as boolean
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
          // v0.5 Phase 3: 默认 oxn (向后兼容), autoSync 默认 true
          assetFormat: 'oxn',
          autoSync: true,
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

      // v0.6.2: --global 时写到全局目录（~/.opencode/skills/ 等）
      // 项目级：写到 ./<tool>/skills/；全局：写到 ~/<tool>/skills/
      let report: ReturnType<typeof compileAllSkills>
      if (isGlobal) {
        const globalHome = process.env.HOME ?? process.env.USERPROFILE ?? '.'
        const byTool: Record<SkillAdapterId, ReturnType<typeof compileAllSkills>['byTool'][SkillAdapterId]> =
          {} as never
        let total = 0
        let created = 0
        let updated = 0
        let skipped = 0
        for (const toolId of toolIds) {
          const skillsRoot =
            toolId === 'opencode'
              ? `${globalHome}/.opencode/skills`
              : toolId === 'claude'
                ? `${globalHome}/.claude/skills`
                : `${globalHome}/.agents/skills`
          const result = compileAllSkillsToRoot(toolIds, projectPath, skillsRoot, force)
          byTool[toolId] = {
            toolId,
            results: result.results,
            total: result.results.length,
            created: result.results.filter((r) => r.action === 'created').length,
            updated: result.results.filter((r) => r.action === 'updated').length,
            skipped: result.results.filter((r) => r.action === 'skipped').length,
            referencesCreated: result.results.reduce((sum, r) => sum + (r.referencesWritten ?? 0), 0),
            pruned: 0,
          }
          total += byTool[toolId]!.total
          created += byTool[toolId]!.created
          updated += byTool[toolId]!.updated
          skipped += byTool[toolId]!.skipped
        }
        report = { byTool, total, created, updated, skipped, pruned: 0 }
      } else {
        report = compileAllSkills(toolIds, projectPath, force)
      }
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

      const outputDirs = isGlobal
        ? toolIds.map((id) => `~/${idRootForHuman(id)}`).join(', ')
        : toolIds.map((id) => `./${idRootForHuman(id)}`).join(', ')

      return output(
        {
          data: {
            name: projectName,
            path: projectPath,
            mode: sandbox ? 'SANDBOX' : 'PRODUCTION',
            tools: toolIds,
            skillsCompiled: report.total,
            skillsScope: isGlobal ? 'global' : 'project',
            skillsReport: reportStr,
            domainIndex: domainIndexStatus,
            blueprintIndex: blueprintIndexStatus,
          },
          human: `${message}\n\n${t('init.compilingSkills')}${toolsLine}\n\n${reportStr}${report.pruned ? `\nPruned ${report.pruned} stale skill(s)` : ''}\n\n✓ ${t('init.skillsCompiled')}\n  ${t('init.skillsOutputDir', { dir: outputDirs })}\n\n✓ Domain index: ${domainIndexStatus}\n✓ Blueprint index: ${blueprintIndexStatus}`,
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
