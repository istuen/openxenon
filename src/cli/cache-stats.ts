import { defineCommand } from 'citty'
import { existsSync, readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import { BOUNDARY_DIR } from '../kernel/index'
import { t } from '../i18n'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'cache-stats',
    description: '显示编译缓存统计',
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
    const cacheDir = resolve(process.cwd(), BOUNDARY_DIR, 'cache', 'compile')

    if (!existsSync(cacheDir)) {
      return output(
        {
          data: { count: 0, size: '0KB', cacheDir, message: t('cache.notFound') },
          human: t('cache.notFound'),
        },
        format,
      )
    }

    try {
      const files = readdirSync(cacheDir).filter((f) => f.endsWith('.json'))
      let totalSize = 0
      let oldestTime = Date.now()
      let newestTime = 0

      for (const file of files) {
        const filePath = resolve(cacheDir, file)
        const stat = statSync(filePath)
        totalSize += stat.size
        if (stat.mtimeMs < oldestTime) oldestTime = stat.mtimeMs
        if (stat.mtimeMs > newestTime) newestTime = stat.mtimeMs
      }

      const ageDays = Math.round((Date.now() - oldestTime) / (24 * 60 * 60 * 1000))

      return output(
        {
          data: {
            count: files.length,
            size: `${Math.round(totalSize / 1024)}KB`,
            oldestCacheAge: t('cache.oldestAgeFormat', { ageDays }),
            cacheDir,
          },
          human: t('cache.statsLine', {
            count: files.length,
            size: Math.round(totalSize / 1024),
            ageDays,
          }),
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError(
        {
          code: 'OXN_CACHE_STATS_FAILED',
          message: errorMsg,
        },
        format,
      )
    }
  },
})
