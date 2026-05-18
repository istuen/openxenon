import { defineCommand } from 'citty'
import { join, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import { getProjectBoundaryPath } from '../kernel'

type ExportFilter = 'draft' | 'canonical' | 'all' | 'archive'

function copyDir(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }

  const entries = readdirSync(src)
  for (const entry of entries) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)

    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

function shouldExport(fileName: string, filter: ExportFilter): boolean {
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

function exportArsenalType(
  projectArsenalsPath: string,
  targetPath: string,
  type: string,
  filter: ExportFilter
): { exported: number; skipped: number } {
  const srcDir = join(projectArsenalsPath, type)
  const destDir = join(targetPath, 'arsenals', type)

  if (!existsSync(srcDir)) {
    return { exported: 0, skipped: 0 }
  }

  let exported = 0
  let skipped = 0

  const entries = readdirSync(srcDir)
  for (const entry of entries) {
    const srcPath = join(srcDir, entry)
    const destPath = join(destDir, entry)

    if (statSync(srcPath).isDirectory()) {
      if (entry === 'archive') {
        if (filter === 'archive' || filter === 'all') {
          copyDir(srcPath, destPath)
          exported++
        } else {
          skipped++
        }
      } else if (entry === 'draft' || entry === 'canonical') {
        const stateDir = join(destDir, entry)
        if (!existsSync(stateDir)) {
          mkdirSync(stateDir, { recursive: true })
        }

        const files = readdirSync(srcPath)
        for (const file of files) {
          if (shouldExport(file, filter)) {
            copyFileSync(join(srcPath, file), join(stateDir, file))
            exported++
          } else {
            skipped++
          }
        }
      }
    } else {
      if (shouldExport(entry, filter)) {
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true })
        }
        copyFileSync(srcPath, destPath)
        exported++
      } else {
        skipped++
      }
    }
  }

  return { exported, skipped }
}

export default defineCommand({
  meta: {
    name: 'arsenal-export',
    description: '导出项目 Arsenal 到外部目录'
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: '目标目录路径'
    },
    draft: {
      type: 'boolean',
      description: '只导出 draft 资产'
    },
    canonical: {
      type: 'boolean',
      description: '只导出 canonical 资产（默认）'
    },
    all: {
      type: 'boolean',
      description: '导出所有资产（draft + canonical + archive）'
    },
    archive: {
      type: 'boolean',
      description: '只导出 archive 资产'
    }
  },
  async run(ctx) {
    const targetPath = ctx.args.path as string
    const projectPath = getProjectBoundaryPath(process.cwd())
    const projectArsenalsPath = join(projectPath, 'arsenals')

    if (!existsSync(projectArsenalsPath)) {
      console.log('项目 Arsenal 目录不存在')
      return
    }

    const filter: ExportFilter =
      ctx.args.all ? 'all' :
      ctx.args.draft ? 'draft' :
      ctx.args.archive ? 'archive' :
      'canonical'

    console.log(`导出 Arsenal 到: ${targetPath}`)
    console.log(`过滤条件: ${filter}`)

    const types = ['probes', 'blueprints', 'parts']
    let totalExported = 0
    let totalSkipped = 0

    for (const type of types) {
      const result = exportArsenalType(projectArsenalsPath, targetPath, type, filter)
      if (result.exported > 0 || result.skipped > 0) {
        console.log(`  ${type}: 导出 ${result.exported}, 跳过 ${result.skipped}`)
      }
      totalExported += result.exported
      totalSkipped += result.skipped
    }

    console.log(`\n导出完成: ${totalExported} 文件导出, ${totalSkipped} 文件跳过`)
  }
})