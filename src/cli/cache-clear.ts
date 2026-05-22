import { defineCommand } from 'citty'
import { resolve } from 'path'
import { readdirSync, rmSync, existsSync } from 'fs'
import { output, outputError, getFormatFromArgs } from './output'
import { BOUNDARY_DIR } from '../kernel/constants'

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
          data: { message: '缓存目录不存在，无需清理' },
          human: '缓存目录不存在，无需清理',
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
          human: `已清空 ${deletedCount} 个缓存文件`,
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
