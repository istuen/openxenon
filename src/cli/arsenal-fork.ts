import { defineCommand } from 'citty'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getArsenalsPath, type AssetType } from '../arsenals/paths'
import { ensureArsenalsDirectories } from '../arsenals/init'
import { output, outputError, getFormatFromArgs } from './output'

export default defineCommand({
  meta: {
    name: 'arsenal-fork',
    description: '从已有 Part 创建变体（Fork）'
  },
  args: {
    type: {
      type: 'positional',
      required: true,
      description: '资产类型 (e.g., part)'
    },
    name: {
      type: 'positional',
      required: true,
      description: '源资产名称'
    },
    '--name': {
      type: 'string',
      alias: 'n',
      required: true,
      description: '新资产名称'
    }
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    ensureArsenalsDirectories('project')

    const assetType = ctx.args.type as string
    const sourceName = ctx.args.name as string
    const newName = ctx.args['name'] as string

    if (assetType !== 'part') {
      return outputError({
        code: 'OXN_FORK_UNSUPPORTED',
        message: `Fork 仅支持 part 类型，不支持: ${assetType}`
      }, format)
    }

    const type = 'parts' as AssetType
    const basePath = getArsenalsPath(type, 'project')
    const sourcePath = join(basePath, `${sourceName}.oxn`)

    if (!existsSync(sourcePath)) {
      return outputError({
        code: 'OXN_ASSET_NOT_FOUND',
        message: `源资产不存在: ${sourcePath}`
      }, format)
    }

    try {
      const content = readFileSync(sourcePath, 'utf-8')
      const newPath = join(basePath, `${newName}.oxn`)
      writeFileSync(newPath, content, 'utf-8')

      output({
        data: { source: sourceName, forked: newName, path: newPath },
        human: `Forked: ${sourceName} → ${newName}\n  Path: ${newPath}`
      }, format)
    } catch (err) {
      return outputError({
        code: 'OXN_FORK_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error'
      }, format)
    }
  }
})