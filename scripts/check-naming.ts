/**
 * scripts/check-naming.ts — v0.7.5 重写
 *
 * version: 0.7.5
 * synced-at: 2026-08-09
 *
 * 角色（v0.7.5）：
 * - 校验 `.openxenon/` 下的所有 .md 文件命名
 * - 遵循 v0.6+ 三情态文档规范：
 *   - Asset（5 类）：`<scope>-<topic-slug>.md`（kebab-case）
 *   - Draft（3 类）：`<DraftType>-<slug>.md`（DraftType ∈ {design, issue, report}）
 *   - RFC（子目录）：`rfc/RFC-NNNN-<theme>.md` 或 `rfc-NNNN-<theme>.md`
 *   - Doc：kebab-case（docs/{dev,product,rfc}/）
 * - 退出码：0 通过 / 1 失败
 *
 * 校验规则：
 * 1. kebab-case：仅允许 [a-z0-9-]，禁止大写字母 / 下划线 / 空格
 * 2. DraftType 前缀：design-* / issue-* / report-*
 * 3. RFC 编号：rfc-NNNN-* 或 RFC-NNNN-*
 * 4. DEPRECATED：必须带 -deprecated 后缀 + 住 .archived/
 * 5. 系统文件：.gitkeep / README.md 豁免
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

/** 跨切架构文档（v0.7.5 不再使用，可省略 version）——保留空数组兼容性 */
const CROSSCUTTING_DOCS: string[] = []

/** DraftType 前缀（v0.6+ 3 DraftType） */
const DRAFT_TYPE_PATTERN = /^(design|report|issue)-[a-z0-9-]+\.md$/

/** RFC 编号（v0.7+ 引入 RFC 体系，编号 4 位数字 + theme） */
const RFC_PATTERN = /^[Rr][Ff][Cc]-?\d{4}-?[a-z0-9-]+\.md$/

/** 通用 kebab-case（fallback） */
const KEBAB_CASE_PATTERN = /^[a-z0-9][a-z0-9-]*\.md$/

/** 审计/复盘/决策文档（保留 v0.3 兼容） */
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

  // 3. RFC 编号（v0.7+ 体系；rfc/RFC-NNNN-*.md 或顶层 RFC-NNNN-*.md）
  if (RFC_PATTERN.test(fileName)) {
    return [] // OK
  }

  // 4. DraftType 前缀（v0.6+ 3 DraftType：design/report/issue）
  if (DRAFT_TYPE_PATTERN.test(fileName)) {
    return [] // OK
  }

  // 5. 审计/复盘
  if (AUDIT_RETRO_JOURNAL_PATTERN.test(fileName)) {
    return [] // OK
  }

  // 6. Journal（日期前缀）
  if (JOURNAL_PATTERN.test(fileName)) {
    return [] // OK
  }

  // 7. v0.X.0-roadmap 形式
  if (/^v\d+\.\d+\.\d+-roadmap\.md$/.test(fileName)) {
    return [] // OK
  }

  // 8. 检查特殊模式：-v<X.Y.Z>.md 后缀（阶段文档）
  if (/-v\d+\.\d+\.\d+\.md$/.test(fileName)) {
    return [] // OK（任意带版本号的文档）
  }

  // 9. 检查 .gitkeep 等系统文件
  if (fileName === '.gitkeep') {
    return []
  }

  // 10. kebab-case fallback（最低接受条件）
  if (KEBAB_CASE_PATTERN.test(fileName)) {
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
