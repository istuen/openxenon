import { defineCommand } from 'citty'
import { t } from '../i18n'
import { DEFAULT_LOCALE } from './project-config'
import { getFormatFromArgs, output, outputError } from './output'
import { readProjectConfig } from './project-config-io'

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
        data: config,
        human: `项目配置:\n  mode: ${config.mode}\n  locale: ${config.locale || DEFAULT_LOCALE}\n  debug: ${config.debug ? 'enabled' : 'disabled'}\n  name: ${config.name || 'unnamed'}\n`,
      },
      format,
    )
  },
})
