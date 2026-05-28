import { defineCommand } from 'citty'
import { cpSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { basename, dirname, join } from 'path'
import type { AssetState, AssetType } from '../arsenals/paths'
import { GLOBAL_ARSENAL_ROOT } from '../arsenals/paths'
import { getProjectBoundaryPath } from './project'

interface MigrationResult {
  name: string
  type: AssetType
  state: AssetState
  oldPath: string
  newPath: string
  status: 'success' | 'skipped' | 'failed'
  error?: string
}

const ASSET_TYPES: AssetType[] = ['probes', 'blueprints', 'parts']

function scanOldStructureAssets(scope: 'project' | 'global'): {
  path: string
  type: AssetType
  name: string
  state: AssetState
}[] {
  const assets: { path: string; type: AssetType; name: string; state: AssetState }[] = []
  const oldBasePath =
    scope === 'global'
      ? join(dirname(GLOBAL_ARSENAL_ROOT), 'arsenals')
      : join(getProjectBoundaryPath(process.cwd()), 'arsenals')

  for (const type of ASSET_TYPES) {
    const oldTypePath = join(oldBasePath, type)
    if (!existsSync(oldTypePath)) continue

    const entries = readdirSync(oldTypePath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirName = entry.name
        if (dirName === 'draft' || dirName === 'canonical') {
          const dirPath = join(oldTypePath, dirName)
          const state: AssetState = dirName as AssetState
          const files = readdirSync(dirPath)
          for (const file of files) {
            if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json') || file.endsWith('.oxn')) {
              const name = basename(file, `.${file.split('.').pop()}`)
              assets.push({
                path: join(dirPath, file),
                type,
                name,
                state,
              })
            }
          }
        } else {
          const blueprintDir = join(oldTypePath, dirName)
          const canonicalFile = join(blueprintDir, 'canonical.yaml')
          if (existsSync(canonicalFile)) {
            assets.push({
              path: canonicalFile,
              type,
              name: dirName,
              state: 'canonical',
            })
          }
          const draftFile = join(blueprintDir, 'draft.yaml')
          if (existsSync(draftFile)) {
            assets.push({
              path: draftFile,
              type,
              name: dirName,
              state: 'draft',
            })
          }
        }
      } else if (
        entry.name.endsWith('.yaml') ||
        entry.name.endsWith('.yml') ||
        entry.name.endsWith('.json') ||
        entry.name.endsWith('.oxn')
      ) {
        const name = basename(entry.name, `.${entry.name.split('.').pop()}`)
        assets.push({
          path: join(oldTypePath, entry.name),
          type,
          name,
          state: 'canonical',
        })
      }
    }
  }

  return assets
}

function migrateAsset(
  asset: { path: string; type: AssetType; name: string; state: AssetState },
  scope: 'project' | 'global',
  keepOld: boolean,
): MigrationResult {
  const newBasePath = scope === 'global' ? GLOBAL_ARSENAL_ROOT : join(getProjectBoundaryPath(process.cwd()), 'arsenal')

  let newPath: string
  if (asset.type === 'blueprints') {
    newPath = join(newBasePath, asset.type, asset.name, asset.state === 'draft' ? 'draft.oxn' : 'canonical.oxn')
  } else {
    newPath =
      asset.state === 'draft'
        ? join(newBasePath, asset.type, 'drafts', `${asset.name}.oxn`)
        : join(newBasePath, asset.type, `${asset.name}.oxn`)
  }

  if (existsSync(newPath)) {
    return {
      name: asset.name,
      type: asset.type,
      state: asset.state,
      oldPath: asset.path,
      newPath,
      status: 'skipped',
      error: 'Asset already exists at new path',
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
      status: 'success',
    }
  } catch (error) {
    return {
      name: asset.name,
      type: asset.type,
      state: asset.state,
      oldPath: asset.path,
      newPath,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default defineCommand({
  meta: {
    name: 'arsenal-migrate',
    description: '将旧结构（arsenals/）迁移到新结构（arsenal/）',
  },
  args: {
    keepOld: {
      type: 'boolean',
      short: 'k',
      description: '保留旧文件，不删除',
    },
  },
  async run(ctx) {
    const scope: 'project' | 'global' = 'project'
    const keepOld = ctx.args.keepOld || false

    console.log(`\n🔄 开始迁移项目 arsenals 目录结构到 arsenal...`)
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

    const successCount = results.filter((r) => r.status === 'success').length
    const skippedCount = results.filter((r) => r.status === 'skipped').length
    const failedCount = results.filter((r) => r.status === 'failed').length

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
      console.log('✅ 清理完成')
    }

    console.log('\n✅ 迁移完成！')
  },
})
