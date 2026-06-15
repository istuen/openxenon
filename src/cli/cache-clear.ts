import { defineCommand } from 'citty'
import { existsSync, readdirSync, rmSync } from '../infra/filesystem'
import { resolve } from 'path'
import { BOUNDARY_DIR } from '../kernel/index'
import { t } from '../infra/i18n'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'cache-clear',
    description: '清空编译缓存',
  },
  args: {
    '--all': {
      type: 'boolean',
      description: '清空所有缓存',
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
    const cacheDir = resolve(process.cwd(), BOUNDARY_DIR, 'cache', 'compile')

    if (!existsSync(cacheDir)) {
      return output(
        {
          data: { message: t('cache.empty') },
          human: t('cache.empty'),
        },
        format,
      )
    }

    try {
      const files = readdirSync(cacheDir).filter((f) => f.endsWith('.json'))
      let deletedCount = 0

      for (const file of files) {
        rmSync(resolve(cacheDir, file), { force: true })
        deletedCount++
      }

      return output(
        {
          data: { deleted: deletedCount, cacheDir },
          human: t('cache.cleared', { count: deletedCount }),
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError(
        {
          code: 'OXN_CACHE_CLEAR_FAILED',
          message: errorMsg,
        },
        format,
      )
    }
  },
})
