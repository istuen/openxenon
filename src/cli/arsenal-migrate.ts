import { defineCommand } from 'citty'
import { readdirSync, existsSync, unlinkSync, cpSync } from 'fs'
import { join, basename, dirname } from 'path'
import { type AssetType, type AssetState } from '../arsenals/paths'
import { getProjectBoundaryPath } from '../kernel'

interface MigrationResult {
  name: string
  type: AssetType
  state: AssetState
  oldPath: string
  newPath: string
  status: 'success' | 'skipped' | 'failed'
  error?: string
}

const ASSET_TYPES: AssetType[] = ['probes', 'stages', 'blueprints']

function scanOldStructureAssets(scope: 'project' | 'global'): { path: string, type: AssetType, name: string, state: AssetState }[] {
  const assets: { path: string, type: AssetType, name: string, state: AssetState }[] = []
  const basePath = scope === 'global'
    ? join(process.env.HOME || '', '.openxenon', 'arsenals')
    : join(getProjectBoundaryPath(process.cwd()), 'arsenals')

  for (const type of ASSET_TYPES) {
    for (const state of ['draft', 'canonical'] as AssetState[]) {
      const dirPath = join(basePath, type, state)
      if (!existsSync(dirPath)) continue

      const files = readdirSync(dirPath)
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')) {
          assets.push({
            path: join(dirPath, file),
            type,
            name: basename(file, '.' + file.split('.').pop()),
            state
          })
        }
      }
    }
  }

  return assets
}

function migrateAsset(
  asset: { path: string, type: AssetType, name: string, state: AssetState },
  scope: 'project' | 'global',
  keepOld: boolean
): MigrationResult {
  const basePath = scope === 'global'
    ? join(process.env.HOME || '', '.openxenon', 'arsenals')
    : join(getProjectBoundaryPath(process.cwd()), 'arsenals')

  const newPath = join(basePath, asset.type, asset.name, asset.state === 'draft' ? 'draft.yaml' : 'canonical.yaml')

  if (existsSync(newPath)) {
    return {
      name: asset.name,
      type: asset.type,
      state: asset.state,
      oldPath: asset.path,
      newPath,
      status: 'skipped',
      error: 'Asset already exists at new path'
    }
  }

  try {
    const newDir = dirname(newPath)
    if (!existsSync(newDir)) {
      require('fs').mkdirSync(newDir, { recursive: true })
    }

    cpSync(asset.path, newPath)

    if (!keepOld) {
      unlinkSync(asset.path)
    }

    return {
      name: asset.name,
      type: asset.type,
      state: asset.state,
      oldPath: asset.path,
      newPath,
      status: 'success'
    }
  } catch (error) {
    return {
      name: asset.name,
      type: asset.type,
      state: asset.state,
      oldPath: asset.path,
      newPath,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function cleanupEmptyDirs(dirPath: string): void {
  if (!existsSync(dirPath)) return

  const files = readdirSync(dirPath)
  if (files.length === 0) {
    require('fs').rmdirSync(dirPath)
    cleanupEmptyDirs(dirname(dirPath))
  }
}

export default defineCommand({
  meta: {
    name: 'arsenal-migrate',
    description: '将旧结构（arsenals/<type>/draft/<name>.yaml）迁移到新结构（arsenals/<type>/<name>/draft.yaml）'
  },
  args: {
    global: {
      type: 'boolean',
      short: 'g',
      description: '迁移全局 Arsenal（默认项目级）'
    },
    keepOld: {
      type: 'boolean',
      short: 'k',
      description: '保留旧文件，不删除'
    }
  },
  async run(ctx) {
    const scope: 'project' | 'global' = ctx.args.global ? 'global' : 'project'
    const keepOld = ctx.args.keepOld || false

    console.log(`\n🔄 开始迁移 arsenals 目录结构...`)
    console.log(`范围: ${scope}`)
    console.log(`保留旧文件: ${keepOld}\n`)

    const oldAssets = scanOldStructureAssets(scope)

    if (oldAssets.length === 0) {
      console.log('✅ 没有发现需要迁移的旧结构资产')
      return
    }

    console.log(`发现 ${oldAssets.length} 个旧结构资产\n`)

    const results: MigrationResult[] = []
    for (const asset of oldAssets) {
      const result = migrateAsset(asset, scope, keepOld)
      results.push(result)
    }

    const successCount = results.filter(r => r.status === 'success').length
    const skippedCount = results.filter(r => r.status === 'skipped').length
    const failedCount = results.filter(r => r.status === 'failed').length

    console.log('--- 迁移结果 ---\n')
    for (const result of results) {
      const icon = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌'
      console.log(`${icon} [${result.type}] ${result.name} (${result.state})`)
      console.log(`   旧路径: ${result.oldPath}`)
      console.log(`   新路径: ${result.newPath}`)
      if (result.error) {
        console.log(`   错误: ${result.error}`)
      }
      console.log()
    }

    console.log('--- 统计 ---')
    console.log(`✅ 成功: ${successCount}`)
    console.log(`⏭️ 跳过: ${skippedCount}`)
    console.log(`❌ 失败: ${failedCount}`)

    if (!keepOld && successCount > 0) {
      console.log('\n🧹 清理空目录...')
      const basePath = scope === 'global'
        ? join(process.env.HOME || '', '.openxenon', 'arsenals')
        : join(getProjectBoundaryPath(process.cwd()), 'arsenals')

      for (const type of ASSET_TYPES) {
        cleanupEmptyDirs(join(basePath, type, 'draft'))
        cleanupEmptyDirs(join(basePath, type, 'canonical'))
      }
      console.log('✅ 清理完成')
    }

    console.log('\n✅ 迁移完成！')
  }
})