import { defineCommand } from 'citty'
import { join, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import { getProjectBoundaryPath } from '../kernel'

type ImportFilter = 'draft' | 'canonical' | 'all' | 'archive'

function shouldImport(fileName: string, filter: ImportFilter): boolean {
  if (filter === 'all') return true

  const isDraft = fileName === 'draft.json' || fileName === 'draft.yaml' || fileName === 'draft.md'
  const isCanonical = fileName === 'canonical.json' || fileName === 'canonical.yaml' || fileName === 'canonical.md'
  const isArchive = basename(fileName).startsWith('v') && fileName.endsWith('.json')

  switch (filter) {
    case 'draft':
      return isDraft
    case 'canonical':
      return isCanonical
    case 'archive':
      return isArchive
    default:
      return isCanonical
  }
}

function importArsenalType(
  sourcePath: string,
  projectArsenalsPath: string,
  type: string,
  filter: ImportFilter,
  force: boolean
): { imported: number; skipped: number; overwritten: number } {
  const srcDir = join(sourcePath, 'arsenals', type)
  const destDir = join(projectArsenalsPath, type)

  if (!existsSync(srcDir)) {
    return { imported: 0, skipped: 0, overwritten: 0 }
  }

  let imported = 0
  let skipped = 0
  let overwritten = 0

  const entries = readdirSync(srcDir)
  for (const entry of entries) {
    const srcPath = join(srcDir, entry)
    const destPath = join(destDir, entry)

    if (statSync(srcPath).isDirectory()) {
      if (entry === 'archive') {
        if (filter === 'archive' || filter === 'all') {
          if (!existsSync(destPath)) {
            mkdirSync(destPath, { recursive: true })
          }
          const files = readdirSync(srcPath)
          for (const file of files) {
            const archiveDest = join(destPath, file)
            if (existsSync(archiveDest)) {
              skipped++
            } else {
              copyFileSync(join(srcPath, file), archiveDest)
              imported++
            }
          }
        } else {
          skipped++
        }
      } else if (entry === 'draft' || entry === 'canonical') {
        const stateSrcDir = join(srcDir, entry)
        const stateDestDir = join(destDir, entry)

        if (!existsSync(stateDestDir)) {
          mkdirSync(stateDestDir, { recursive: true })
        }

        const files = readdirSync(stateSrcDir)
        for (const file of files) {
          if (!shouldImport(file, filter)) {
            skipped++
            continue
          }

          const fileDest = join(stateDestDir, file)
          if (existsSync(fileDest)) {
            if (force) {
              copyFileSync(join(stateSrcDir, file), fileDest)
              overwritten++
            } else {
              skipped++
            }
          } else {
            copyFileSync(join(stateSrcDir, file), fileDest)
            imported++
          }
        }
      }
    } else {
      if (!shouldImport(entry, filter)) {
        skipped++
        continue
      }

      if (existsSync(destPath)) {
        if (force) {
          copyFileSync(srcPath, destPath)
          overwritten++
        } else {
          skipped++
        }
      } else {
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true })
        }
        copyFileSync(srcPath, destPath)
        imported++
      }
    }
  }

  return { imported, skipped, overwritten }
}

export default defineCommand({
  meta: {
    name: 'arsenal-import',
    description: '从外部目录导入 Arsenal 到当前项目'
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: '源目录路径'
    },
    draft: {
      type: 'boolean',
      description: '只导入 draft 资产'
    },
    canonical: {
      type: 'boolean',
      description: '只导入 canonical 资产（默认）'
    },
    all: {
      type: 'boolean',
      description: '导入所有资产（draft + canonical + archive）'
    },
    archive: {
      type: 'boolean',
      description: '只导入 archive 资产'
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: '覆盖已存在的文件',
      default: false
    }
  },
  async run(ctx) {
    const sourcePath = ctx.args.path as string
    const projectPath = getProjectBoundaryPath(process.cwd())
    const projectArsenalsPath = join(projectPath, 'arsenals')

    if (!existsSync(sourcePath)) {
      console.error(`源目录不存在: ${sourcePath}`)
      return
    }

    const filter: ImportFilter =
      ctx.args.all ? 'all' :
      ctx.args.draft ? 'draft' :
      ctx.args.archive ? 'archive' :
      'canonical'

    console.log(`从 ${sourcePath} 导入 Arsenal`)
    console.log(`过滤条件: ${filter}`)
    console.log(`模式: ${ctx.args.force ? '覆盖已存在文件' : '跳过已存在文件'}`)

    const types = ['probes', 'blueprints', 'parts']
    let totalImported = 0
    let totalSkipped = 0
    let totalOverwritten = 0

    for (const type of types) {
      const result = importArsenalType(sourcePath, projectArsenalsPath, type, filter, ctx.args.force as boolean)
      if (result.imported > 0 || result.skipped > 0 || result.overwritten > 0) {
        console.log(`  ${type}: 导入 ${result.imported}, 跳过 ${result.skipped}, 覆盖 ${result.overwritten}`)
      }
      totalImported += result.imported
      totalSkipped += result.skipped
      totalOverwritten += result.overwritten
    }

    console.log(`\n导入完成: ${totalImported} 文件导入, ${totalSkipped} 文件跳过, ${totalOverwritten} 文件覆盖`)
  }
})