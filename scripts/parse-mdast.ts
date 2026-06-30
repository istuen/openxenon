/**
 * scripts/parse-mdast.ts — v0.3 stage 4 T15
 *
 * 角色：
 * - 扫描 .openxenon 下所有 .md 文件
 * - 通过 md-bridge pipeline 解析每个文件
 * - 报告 parse 错误（5 E_MD_xxx）
 * - 退出码：0 通过 / 1 失败
 *
 * 排除：
 * - `_archive/` 目录（已废弃文档不强制）
 * - `.cache/` 目录
 * - `forges/` 目录（外部历史源）
 *
 * L0–L3 兼容性：
 * - L1-Infra 工具脚本
 * - 依赖 L1-OXL/md-bridge 解析
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { runMdPipeline, validateMdast } from '@openxenon/engine/oxl/md-bridge/index.js'

// ========================
// 类型
// ========================

export interface ParseFailure {
  path: string
  /** 错误码 */
  code: string
  /** 错误信息 */
  message: string
  /** 行号（如果有）*/
  line?: number
  /** 列号（如果有）*/
  column?: number
}

export interface ParseWarning {
  path: string
  /** 警告码 */
  code: string
  message: string
}

export interface ParseReport {
  totalFiles: number
  success: number
  failed: number
  warnings: number
  failures: ParseFailure[]
  warningsList: ParseWarning[]
  /** 性能统计（ms）*/
  totalParseTime: number
  /** 平均每个文件解析时间 */
  avgParseTime: number
}

export interface ParseOptions {
  /** 项目根目录 */
  projectRoot?: string
  /** 排除路径 */
  excludePrefixes?: string[]
  /** 仅检查含 frontmatter 的文件（默认 true）*/
  requireFrontmatter?: boolean
  /** 报告 5 E_MD_xxx 警告（默认 true）*/
  reportWarnings?: boolean
}

// ========================
// 主入口
// ========================

/**
 * 扫描并解析 .openxenon/ 下所有 .md 文件
 */
export async function parseAllMdast(options: ParseOptions = {}): Promise<ParseReport> {
  const projectRoot = options.projectRoot ?? process.cwd()
  const openxenonDir = join(projectRoot, '.openxenon')

  if (!existsSync(openxenonDir)) {
    throw new Error(`.openxenon/ not found in ${projectRoot}`)
  }

  const excludePrefixes = options.excludePrefixes ?? ['.openxenon/forges/', '.openxenon/.cache/']
  const requireFrontmatter = options.requireFrontmatter ?? true
  const reportWarnings = options.reportWarnings ?? true

  // 收集所有 .md 文件
  const allFiles: string[] = []
  walkDir(projectRoot, openxenonDir, openxenonDir, allFiles, excludePrefixes)
  const mdFiles = allFiles.filter((f) => f.endsWith('.md'))

  const failures: ParseFailure[] = []
  const warningsList: ParseWarning[] = []
  let success = 0
  let totalParseTime = 0

  for (const filePath of mdFiles) {
    const relPath = relative(projectRoot, filePath).replace(/\\/g, '/')
    const content = readFileSyncSafe(filePath)
    if (content === null) {
      failures.push({
        path: relPath,
        code: 'E_FILE_READ',
        message: 'Failed to read file',
      })
      continue
    }

    // 1. Pipeline 解析
    const pipeline = runMdPipeline({ content, filePath })

    if (!pipeline.success) {
      for (const err of pipeline.errors) {
        failures.push({
          path: relPath,
          code: err.rule ?? 'E_PARSE_ERROR',
          message: err.message,
          line: err.line,
          column: err.column,
        })
      }
      continue
    }

    totalParseTime += pipeline.parseTime

    // 2. 校验（仅当有 frontmatter 时）
    if (requireFrontmatter && !hasFrontmatter(content)) {
      continue // skip files without frontmatter
    }

    // 3. 5 E_MD_xxx 校验
    const entity = String(pipeline.frontmatter.entity ?? 'unknown') as
      | 'domain'
      | 'blueprint'
      | 'work'
      | 'task'
      | 'proof'
      | 'unknown'
    if (entity === 'unknown') continue

    const validation = validateMdast(content, {
      entity,
      filePath,
    })

    if (!validation.valid) {
      for (const issue of validation.errors) {
        failures.push({
          path: relPath,
          code: issue.code,
          message: issue.message,
          line: issue.line,
          column: issue.column,
        })
      }
    } else {
      success++
    }

    if (reportWarnings) {
      for (const warn of validation.warnings) {
        warningsList.push({
          path: relPath,
          code: warn.code,
          message: warn.message,
        })
      }
    }
  }

  return {
    totalFiles: mdFiles.length,
    success,
    failed: failures.length,
    warnings: warningsList.length,
    failures,
    warningsList,
    totalParseTime,
    avgParseTime: mdFiles.length > 0 ? totalParseTime / mdFiles.length : 0,
  }
}

// ========================
// 辅助函数
// ========================

function readFileSyncSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

function hasFrontmatter(content: string): boolean {
  return /^---\n[\s\S]*?\n---/.test(content)
}

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
    // 计算相对于 projectRoot 的路径
    const relFromProject = relative(projectRoot, fullPath).replace(/\\/g, '/')

    if (excludePrefixes.some((p) => relFromProject.startsWith(p))) {
      continue
    }

    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      walkDir(projectRoot, rootDir, fullPath, result, excludePrefixes)
    } else if (stat.isFile()) {
      result.push(fullPath)
    }
  }
}

// ========================
// CLI 入口
// ========================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const projectRoot = process.cwd()
  const isJson = args.includes('--json')
  const strict = args.includes('--strict')

  const report = await parseAllMdast({ projectRoot })

  if (isJson) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(`Total files: ${report.totalFiles}`)
    console.log(`✓ Success: ${report.success}`)
    if (report.warnings > 0) {
      console.log(`⚠ Warnings: ${report.warnings}`)
    }
    if (report.failed > 0) {
      console.log(`✗ Failed: ${report.failed}`)
      console.log('')
      for (const f of report.failures.slice(0, 20)) {
        console.error(`  ${f.path}`)
        console.error(`    [${f.code}] ${f.message}${f.line ? ` (line ${f.line})` : ''}`)
      }
      if (report.failures.length > 20) {
        console.error(`  ... and ${report.failures.length - 20} more`)
      }
    }
    console.log('')
    console.log(`Total parse time: ${report.totalParseTime.toFixed(2)}ms`)
    console.log(`Avg per file: ${report.avgParseTime.toFixed(2)}ms`)
  }

  if (report.failed > 0 || (strict && report.warnings > 0)) {
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
}
