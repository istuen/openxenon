import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'
import { getFormatFromArgs, output, outputError } from './output'
import { readProjectConfig, writeProjectConfig } from './project-config-io'

export default defineCommand({
  meta: {
    name: 'config debug',
    description: '管理项目调试模式',
  },
  args: {
    action: {
      type: 'positional',
      required: true,
      description: 'start | stop',
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
    const projectRoot = process.cwd()
    const action = ctx.args.action as string

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

    if (action === 'start') {
      config.debug = true
      writeProjectConfig(projectRoot, config)
      return output(
        {
          data: { debug: true },
          human: `${t('configDebug.enabled')}\n  ${t('configDebug.logPath', { path: '.openxenon/debug.log' })}`,
        },
        format,
      )
    }

    if (action === 'stop') {
      config.debug = false
      writeProjectConfig(projectRoot, config)
      return output(
        {
          data: { debug: false },
          human: t('configDebug.disabled'),
        },
        format,
      )
    }

    return outputError(
      {
        code: 'OXN_INVALID_ACTION',
        message: t('configDebug.invalidAction', { action }),
        suggestion: t('configDebug.useStartOrStop'),
      },
      format,
    )
  },
})
