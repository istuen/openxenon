import { defineCommand } from 'citty'
import { t } from '../i18n'
import { DEFAULT_LOCALE } from './project-config'
import { getFormatFromArgs, output, outputError } from './output'
import { readProjectConfig } from './project-config-io'
import { DEFAULT_ADAPTERS, type SkillAdapterId } from '../skills/adapters'

export default defineCommand({
  meta: {
    name: 'config',
    description: '管理项目配置',
  },
  subCommands: {
    debug: () => import('./config-debug').then((m) => m.default),
  },
  args: {
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
    const projectRoot = process.cwd()
    const config = readProjectConfig(projectRoot)

    if (!config) {
      return outputError(
        {
          code: 'OXN_CONFIG_NOT_FOUND',
          message: t('config.notFound'),
        },
        format,
      )
    }

    return output(
      {
        data: { ...config, tools: formatToolsLine(config.tools) },
        human: `${t('config.showTitle')}\n${t('config.showLineMode', { mode: config.mode })}\n${t('config.showLineLocale', { locale: config.locale || DEFAULT_LOCALE })}\n${t('config.showLineDebug', { debug: config.debug ? 'enabled' : 'disabled' })}\n${t('config.showLineName', { name: config.name || 'unnamed' })}\n${t('config.showLineTools', { tools: formatToolsLine(config.tools) })}\n`,
      },
      format,
    )
  },
})

function formatToolsLine(tools: { enabled?: SkillAdapterId[]; disabled?: SkillAdapterId[] } | undefined): string {
  if (!tools) {
    return `${DEFAULT_ADAPTERS.join(', ')} (default)`
  }
  if (tools.enabled && tools.enabled.length > 0) {
    if (
      tools.enabled.length === DEFAULT_ADAPTERS.length &&
      DEFAULT_ADAPTERS.every((id) => tools.enabled!.includes(id))
    ) {
      return `${tools.enabled.join(', ')} (default)`
    }
    return `enabled: ${tools.enabled.join(', ')}`
  }
  if (tools.disabled && tools.disabled.length > 0) {
    const remaining = DEFAULT_ADAPTERS.filter((id) => !tools.disabled!.includes(id))
    return `disabled: ${tools.disabled.join(', ')} → active: ${remaining.join(', ') || '(none)'}`
  }
  return `${DEFAULT_ADAPTERS.join(', ')} (default)`
}
