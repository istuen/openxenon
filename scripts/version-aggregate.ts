/**
 * scripts/version-aggregate.ts — v0.3 stage 4 T13
 *
 * 角色:
 * - 扫描 .openxenon 下所有 .md 文件
 * - 提取 frontmatter.version + frontmatter.entity + 摘要
 * - 按版本分组聚合 CHANGELOG
 * - 输出到 stdout（默认）或指定文件
 *
 * 排除:
 * - .openxenon/forges/（外部历史源）
 * - .openxenon/pools 子目录下的 frozen.json（runtime data）
 * - .openxenon/.cache/（runtime cache）
 * - _archive/ 目录（已废弃文档）
 *
 * L0-L3 兼容性:
 * - L1-Infra 工具脚本（独立于业务代码）
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// ========================
// 类型
// ========================

export interface ChangelogEntry {
  /** 文件相对路径（从 .openxenon/ 起）*/
  path: string
  /** 资产类型（domain/blueprint/work/task/proof）*/
  entity: string
  /** 版本号（v<X.Y.Z>）*/
  version: string
  /** frontmatter.status */
  status: string
  /** 标题（一级标题）*/
  title: string
  /** 描述（从 frontmatter.description 或 file content 提取）*/
  description: string
}

export interface AggregatedChangelog {
  /** 按版本分组 */
  byVersion: Record<string, ChangelogEntry[]>
  /** 总条目数 */
  total: number
  /** 跳过的文件（无 frontmatter.version）*/
  skipped: Array<{ path: string; reason: string }>
}

export interface AggregateOptions {
  /** 项目根目录（默认 process.cwd()）*/
  projectRoot?: string
  /** 排除路径前缀（默认 ['.openxenon/forges/', '.openxenon/.cache/']）*/
  excludePrefixes?: string[]
  /** 仅包含 frontmatter 含 entity 字段的文件（默认 true）*/
  requireEntity?: boolean
}

// ========================
// 主入口
// ========================

/**
 * 扫描 .openxenon/ 聚合 CHANGELOG
 */
export function aggregateChangelog(options: AggregateOptions = {}): AggregatedChangelog {
  const projectRoot = options.projectRoot ?? process.cwd()
  const openxenonDir = join(projectRoot, '.openxenon')

  if (!existsSync(openxenonDir)) {
    throw new Error(`.openxenon/ not found in ${projectRoot}`)
  }

  const excludePrefixes = options.excludePrefixes ?? ['.openxenon/forges/', '.openxenon/.cache/']
  const requireEntity = options.requireEntity ?? true

  const allFiles: string[] = []
  walkDir(projectRoot, openxenonDir, openxenonDir, allFiles, excludePrefixes)

  const byVersion: Record<string, ChangelogEntry[]> = {}
  const skipped: AggregatedChangelog['skipped'] = []

  for (const filePath of allFiles) {
    if (!filePath.endsWith('.md')) continue
    // 跳过 _archive 与 .archived 目录
    if (filePath.includes('/_archive/') || filePath.includes('/.archived/')) {
      skipped.push({ path: filePath, reason: 'archived' })
      continue
    }

    const entry = parseChangelogEntry(filePath, projectRoot)
    if (!entry) {
      if (requireEntity) {
        skipped.push({ path: filePath, reason: 'no frontmatter' })
      }
      continue
    }

    if (!byVersion[entry.version]) {
      byVersion[entry.version] = []
    }
    byVersion[entry.version]!.push(entry)
  }

  // 排序
  for (const version of Object.keys(byVersion)) {
    byVersion[version]!.sort((a, b) => a.path.localeCompare(b.path))
  }

  return {
    byVersion,
    total: Object.values(byVersion).reduce((sum, arr) => sum + arr.length, 0),
    skipped,
  }
}

// ========================
// 输出格式
// ========================

/**
 * 格式化为 Markdown CHANGELOG
 */
export function formatChangelogMarkdown(changelog: AggregatedChangelog): string {
  const lines: string[] = []
  lines.push('# OpenXenon CHANGELOG（自动聚合）')
  lines.push('')
  lines.push(`> **生成时间**：${new Date().toISOString()}`)
  lines.push(`> **条目总数**：${changelog.total}`)
  lines.push(`> **跳过文件**：${changelog.skipped.length}`)
  lines.push('')

  // 按版本倒序
  const versions = Object.keys(changelog.byVersion).sort().reverse()
  for (const version of versions) {
    const entries = changelog.byVersion[version] ?? []
    lines.push(`## ${version}`)
    lines.push('')

    // 按 entity 分类
    const byEntity: Record<string, ChangelogEntry[]> = {}
    for (const entry of entries) {
      if (!byEntity[entry.entity]) byEntity[entry.entity] = []
      byEntity[entry.entity]!.push(entry)
    }

    for (const entity of Object.keys(byEntity).sort()) {
      const entityEntries = byEntity[entity] ?? []
      lines.push(`### ${entity}（${entityEntries.length}）`)
      lines.push('')
      for (const entry of entityEntries) {
        const status = entry.status !== 'active' ? ` _[${entry.status}]_` : ''
        lines.push(`- **${entry.title}**${status}`)
        if (entry.description) {
          lines.push(`  ${entry.description}`)
        }
        lines.push(`  - path: \`${entry.path}\``)
      }
      lines.push('')
    }
  }

  if (changelog.skipped.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('## Skipped Files（' + changelog.skipped.length + '）')
    lines.push('')
    for (const skip of changelog.skipped.slice(0, 20)) {
      lines.push(`- \`${skip.path}\` (${skip.reason})`)
    }
    if (changelog.skipped.length > 20) {
      lines.push(`- ... ${changelog.skipped.length - 20} more`)
    }
  }

  return lines.join('\n')
}

// ========================
// 辅助函数
// ========================

/** 递归扫描目录 */
function walkDir(
  projectRoot: string,
  rootDir: string,
  currentDir: string,
  result: string[],
  excludePrefixes: string[],
): void {
  let entries: string[]
  try {
    entries = readdirSync(currentDir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry)
    // 相对于 projectRoot 的路径（用于排除检查）
    const relFromProject = relative(projectRoot, fullPath).replace(/\\/g, '/')

    if (excludePrefixes.some((prefix) => relFromProject.startsWith(prefix))) {
      continue
    }

    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      // 跳过 .git, node_modules, .cache
      if (entry.startsWith('.') || entry === 'node_modules' || entry === '.cache') {
        continue
      }
      walkDir(projectRoot, rootDir, fullPath, result, excludePrefixes)
    } else if (stat.isFile()) {
      result.push(fullPath)
    }
  }
}

/** 解析单个文件的 frontmatter */
function parseChangelogEntry(filePath: string, projectRoot: string): ChangelogEntry | null {
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }

  // 提取 frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return null

  const fmContent = fmMatch[1] ?? ''
  const frontmatter = parseFrontmatter(fmContent)

  if (!frontmatter.version) return null

  // 提取 title（# Title）
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = titleMatch?.[1]?.trim() ?? ''

  // 提取 description
  const description = String(frontmatter.description ?? frontmatter.summary ?? '')

  const relPath = relative(projectRoot, filePath).replace(/\\/g, '/')

  return {
    path: relPath,
    entity: String(frontmatter.entity ?? 'unknown'),
    version: String(frontmatter.version),
    status: String(frontmatter.status ?? 'active'),
    title: title || relPath,
    description,
  }
}

/** 极简 YAML 解析（仅 key: value）*/
function parseFrontmatter(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const line of text.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx <= 0) continue
    const key = line.slice(0, colonIdx).trim()
    const rawValue = line.slice(colonIdx + 1).trim()
    if (rawValue === '') result[key] = null
    else if (rawValue === 'true') result[key] = true
    else if (rawValue === 'false') result[key] = false
    else if (/^["'].*["']$/.test(rawValue)) result[key] = rawValue.slice(1, -1)
    else result[key] = rawValue
  }
  return result
}

// ========================
// CLI 入口
// ========================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const projectRoot = process.cwd()
  const outputPath = args.find((a) => a.startsWith('--output='))?.split('=')[1]
  const isJson = args.includes('--json')

  const changelog = aggregateChangelog({ projectRoot })

  if (isJson) {
    const output = JSON.stringify(changelog, null, 2)
    if (outputPath) {
      writeFileSync(outputPath, output, 'utf-8')
      console.error(`✓ Written ${changelog.total} entries to ${outputPath}`)
    } else {
      console.log(output)
    }
  } else {
    const md = formatChangelogMarkdown(changelog)
    if (outputPath) {
      writeFileSync(outputPath, md, 'utf-8')
      console.error(`✓ Written ${changelog.total} entries to ${outputPath}`)
    } else {
      console.log(md)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
}
