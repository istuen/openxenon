import { defineCommand } from 'citty'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { t } from '../i18n'
import { BOUNDARY_DIR } from '../kernel/constants'
import { GLOBAL_BOUNDARY_PATH } from '../infra/global'
import type { ProjectConfig, SupportedLocale } from './project-config'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './project-config'
import { getFormatFromArgs, output, outputError } from './output'
import { readProjectConfig, writeProjectConfig } from './project-config-io'
import { compileAllSkills, formatCompilationReport } from './skill-compiler'

const META_SOURCE_PATH = join(__dirname, '..', 'arsenals', 'forges')

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

  const tasksPath = join(boundaryPath, 'tasks')
  if (!existsSync(tasksPath)) {
    mkdirSync(tasksPath, { recursive: true })
  }

  const forgesPath = join(boundaryPath, 'forges')
  if (!existsSync(forgesPath)) {
    mkdirSync(forgesPath, { recursive: true })
  }

  const arsenalsPath = join(boundaryPath, 'arsenals')
  if (!existsSync(arsenalsPath)) {
    mkdirSync(arsenalsPath, { recursive: true })
  }

  const errorPath = join(boundaryPath, 'error', 'skills')
  if (!existsSync(errorPath)) {
    mkdirSync(errorPath, { recursive: true })
  }
}

function copyMetaToProject(projectRoot: string): void {
  const metaDestPath = join(projectRoot, BOUNDARY_DIR, 'meta')

  if (!existsSync(META_SOURCE_PATH)) {
    return
  }

  mkdirSync(metaDestPath, { recursive: true })

  const metaDirs = readdirSync(META_SOURCE_PATH)
  for (const dir of metaDirs) {
    const srcDir = join(META_SOURCE_PATH, dir)
    const destDir = join(metaDestPath, dir)

    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true, force: true })
    }

    cpSync(srcDir, destDir, { recursive: true })
  }
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
      copyMetaToProject(projectPath)

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
        writeProjectConfig(projectPath, config)
        message = t('init.projectInitialized', { name: projectName, locale })
      }

      const report = compileAllSkills('opencode', projectPath, force)
      const reportStr = formatCompilationReport(report)

      return output(
        {
          data: {
            name: projectName,
            path: projectPath,
            mode: sandbox ? 'SANDBOX' : 'PRODUCTION',
            skillsCompiled: report.total,
            skillsReport: reportStr,
          },
          human: `${message}\n\n${t('init.compilingSkills', { adapter: 'opencode' })}\n\n${reportStr}\n\n✓ ${t('init.skillsCompiled')}\n  ${t('init.skillsOutputDir', { dir: '.opencode/skills/' })}`,
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
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
