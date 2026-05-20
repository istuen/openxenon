import { defineCommand } from 'citty'
import { migrateSingleFile, migrateDirectory, migrateAllArsenals, formatMigrationReport } from './migrate-yaml'
import { output, outputError, getFormatFromArgs } from './output'

export default defineCommand({
  meta: {
    name: 'migrate-yaml',
    description: '将 YAML Blueprint 迁移为 OXN DSL 格式'
  },
  args: {
    path: {
      type: 'positional',
      required: false,
      description: '文件或目录路径（不指定则用 --all）'
    },
    all: {
      type: 'boolean',
      alias: 'a',
      description: '迁移所有 Arsenal 资产'
    },
    dir: {
      type: 'string',
      alias: 'd',
      description: '批量迁移目录'
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' }
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const path = ctx.args.path as string | undefined
    const all = ctx.args.all as boolean
    const dir = ctx.args.dir as string | undefined

    try {
      let stats
      if (all) {
        stats = migrateAllArsenals(process.cwd())
      } else if (dir) {
        stats = migrateDirectory(dir)
      } else if (path) {
        stats = migrateSingleFile(path)
      } else {
        return outputError({
          code: 'OXN_MIGRATE_NO_TARGET',
          message: '请指定文件路径、--dir 目录或 --all'
        }, format)
      }

      return output({
        data: stats,
        human: formatMigrationReport(stats)
      }, format)
    } catch (err) {
      return outputError({
        code: 'OXN_MIGRATE_FAILED',
        message: err instanceof Error ? err.message : '迁移失败'
      }, format)
    }
  }
})
