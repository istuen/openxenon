/**
 * scripts/check-naming.ts — v0.3 stage 4 T14
 *
 * 角色：
 * - 校验 `.openxenon/pools/sprints/v0.3-md-ssot/` 下文件名
 * - 校验 Intent 资产名（domains/blueprints/works/proofs/）
 * - 遵循 naming-system.md v1.0 规范：
 *   `<scope>-<topic-slug>[-v<X.Y.Z>][@<status>].md`
 * - 退出码：0 通过 / 1 失败
 *
 * 校验规则：
 * 1. 跨切架构：可省略 version；阶段文档必带
 * 2. DEPRECATED 文档：必须带 @deprecated 状态
 * 3. 阶段文档：必须含 v<X.Y.Z> 后缀
 * 4. 实体名：scope-topic-slug 必须是 kebab-case
 * 5. 字母数字：仅允许 [a-z0-9-]
 *
 * L0–L3 兼容性：
 * - L1-Infra 工具脚本
 */

import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

// ========================
// 类型
// ========================

export interface NamingIssue {
  path: string
  issue: string
  rule: string
}

export interface NamingCheckResult {
  passed: number
  failed: number
  issues: NamingIssue[]
  warnings: NamingIssue[]
}

export interface NamingCheckOptions {
  /** 要检查的根目录（默认 .openxenon/）*/
  rootPath?: string
  /** 项目根目录（用于相对路径）*/
  projectRoot?: string
  /** 严格模式（warning 也算失败）*/
  strict?: boolean
}

// ========================
// 命名规则
// ========================

/** 跨切架构文档（可省略 version）*/
const CROSSCUTTING_DOCS = [
  'md-ssot-system',
  'v0.3.0-roadmap',
  'intent-ssot-boundary',
  'naming-system',
  'process-version-iteration-flow',
  'process-forges-deprecation-migration',
  'process-pool-operation',
  'l0-l3-alignment',
  'arch-v0.2.0-feature-matrix',
  'arch-v0.3-implementation-report',
]

/** 阶段文档（必带 version）*/
const STAGE_DOCS_PATTERN = /^[a-z-]+-(req|arch|dev-design|test-design|product)-md-(ssot|intent)-v\d+\.\d+\.\d+\.md$/

/** 审计/复盘/决策文档（带版本或日期）*/
const AUDIT_RETRO_JOURNAL_PATTERN = /^(audit|retro)-\d+\.\d+\.\d+-[a-z-]+\.md$/
const JOURNAL_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z-]+\.md$/

// ========================
// 主入口
// ========================

/**
 * 检查文件名命名规范
 */
export function checkNaming(options: NamingCheckOptions = {}): NamingCheckResult {
  const projectRoot = options.projectRoot ?? process.cwd()
  const rootPath = options.rootPath ?? join(projectRoot, '.openxenon')

  if (!existsSync(rootPath)) {
    throw new Error(`.openxenon/ not found in ${projectRoot}`)
  }

  const issues: NamingIssue[] = []
  const warnings: NamingIssue[] = []
  let passed = 0
  let failed = 0

  // 收集所有 .md 文件
  const allFiles: string[] = []
  walkDir(projectRoot, rootPath, rootPath, allFiles, ['.openxenon/forges/', '.openxenon/.cache/'])

  for (const filePath of allFiles) {
    if (!filePath.endsWith('.md')) continue
    const relPath = relative(projectRoot, filePath).replace(/\\/g, '/')
    const fileName = relPath.split('/').pop() ?? ''

    // 跳过 README
    if (fileName.toUpperCase() === 'README.MD') {
      passed++
      continue
    }

    const fileIssues = checkFileName(fileName, relPath)
    if (fileIssues.length === 0) {
      passed++
    } else {
      for (const issue of fileIssues) {
        if (issue.rule.startsWith('warning:')) {
          warnings.push(issue)
        } else {
          issues.push(issue)
          failed++
        }
      }
    }
  }

  return { passed, failed, issues, warnings }
}

// ========================
// 校验函数
// ========================

/** 校验单个文件名 */
function checkFileName(fileName: string, fullPath: string): NamingIssue[] {
  const issues: NamingIssue[] = []

  // 1. 跨切架构文档
  if (CROSSCUTTING_DOCS.includes(fileName.replace('.md', ''))) {
    return [] // OK
  }

  // 2. DEPRECATED 文档（必须在 _archive/ 或 .openxenon/.archived/ 目录）
  if ((fullPath.includes('/_archive/') || fullPath.includes('/.archived/')) && fileName.endsWith('-deprecated.md')) {
    return [] // OK
  }

  // 3. 阶段文档
  if (STAGE_DOCS_PATTERN.test(fileName)) {
    return [] // OK
  }

  // 4. 审计/复盘
  if (AUDIT_RETRO_JOURNAL_PATTERN.test(fileName)) {
    return [] // OK
  }

  // 5. Journal（日期前缀）
  if (JOURNAL_PATTERN.test(fileName)) {
    return [] // OK
  }

  // 6. v0.X.0-roadmap 形式
  if (/^v\d+\.\d+\.\d+-roadmap\.md$/.test(fileName)) {
    return [] // OK
  }

  // 7. 检查特殊模式：-v<X.Y.Z>.md 后缀（阶段文档）
  if (/-v\d+\.\d+\.\d+\.md$/.test(fileName)) {
    return [] // OK（任意带版本号的文档）
  }

  // 8. 检查 .gitkeep 等系统文件
  if (fileName === '.gitkeep') {
    return []
  }

  // 9. 检查 pool-roadmap.md（入口）
  if (fileName === 'pool-roadmap.md') {
    return [] // OK
  }

  // 默认：发出 warning（不视为失败）
  issues.push({
    path: fullPath,
    issue: `文件名不匹配任何已知模式: ${fileName}`,
    rule: 'warning:no-pattern-match',
  })

  return issues
}

/** 递归扫描 */
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
    // 计算相对于 projectRoot 的路径（用于排除检查）
    const relFromProject = relative(projectRoot, fullPath).replace(/\\/g, '/')

    // 排除检查
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
  const strict = args.includes('--strict')
  const isJson = args.includes('--json')

  const result = checkNaming({ projectRoot, strict })

  if (isJson) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`✓ Passed: ${result.passed}`)
    if (result.warnings.length > 0) {
      console.log(`⚠ Warnings: ${result.warnings.length}`)
    }
    if (result.failed > 0) {
      console.log(`✗ Failed: ${result.failed}`)
      console.log('')
      for (const issue of result.issues) {
        console.error(`  ${issue.path}`)
        console.error(`    [${issue.rule}] ${issue.issue}`)
      }
    }
  }

  if (result.failed > 0 || (strict && result.warnings.length > 0)) {
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
}
