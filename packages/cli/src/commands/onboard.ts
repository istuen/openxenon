// =============================================================================
// `oxn onboard` — 项目消费者 Onboarding 统一入口（ADR-0089）
//
// 4 子命令覆盖 3 入口路径：
//   --detect       探测项目状态 + 输出建议路径（Stage A：完整实现）
//   --new          新项目入口：复制 5 Asset + 跑 oxn asset check（Stage C）
//   --existing     存量项目入口：并行 2 路径（B1 Proof-First / B2 探索建 Asset）
//   --bootstrap    存量项目路径 B2：AI 探索建 Asset（Stage D / 复用 ADR-0050）
//
// 探测信号（4 类）：
//   - 语言 manifest 文件：package.json / compose.yaml / Cargo.toml / pyproject.toml
//     / go.mod / *.csproj / pom.xml / build.gradle / Gemfile / pubspec.yaml
//   - .openxenon/ 存在性 + 状态
//   - assets/ 目录是否为空
//   - bootstrap 标记文件（.openxenon/.bootstrap-done）
//
// 输出 schema（JSON / 人类可读）：
//   {
//     projectType: 'new' | 'existing-empty' | 'existing-initialized' | 'existing-completed',
//     signals: { hasPackageJson, hasCompose, hasOpenxenon, ... },
//     recommendation: { path: 'A' | 'B1' | 'B2', reason: '...' },
//     nextCommand: 'oxn onboard --new | --existing --proof-first | --existing --bootstrap'
//   }
//
// 物理位置：packages/cli/src/commands/onboard.ts
// 引入版本：v0.6.x（ADR-0089）
// =============================================================================

import { defineCommand } from 'citty'
import { existsSync, readdirSync, readFile, writeFile, mkdirSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import { t } from '@openxenon/engine/infra/i18n'
import { getBuiltinRegistry } from '@openxenon/engine/oxl/scope/oxn-builtin-registry'
import { getFormatFromArgs, output, outputError } from './output'
import { validate as validateAsset } from '@openxenon/engine/Asset'

// -----------------------------------------------------------------------------
// 探测信号定义
// -----------------------------------------------------------------------------

interface ProjectSignals {
  /** package.json 存在（Node/JS/TS 项目） */
  hasPackageJson: boolean
  /** compose.yaml 或 docker-compose.yml 存在（Docker Compose 项目） */
  hasCompose: boolean
  /** Cargo.toml 存在（Rust 项目） */
  hasCargo: boolean
  /** pyproject.toml 存在（Python 项目） */
  hasPyproject: boolean
  /** Go.mod 存在（Go 项目） */
  hasGoMod: boolean
  /** Java/Kotlin 项目文件（pom.xml / build.gradle） */
  hasJvm: boolean
  /** .NET 项目文件（*.csproj / *.sln） */
  hasDotnet: boolean
  /** 其他 manifest 文件（Gemfile / pubspec.yaml） */
  hasOther: boolean
  /** .openxenon/ 存在 */
  hasOpenxenon: boolean
  /** .openxenon/assets/ 目录存在且非空 */
  hasAssets: boolean
  /** .openxenon/.bootstrap-done 标记文件存在（5 Asset 完整 bootstrap） */
  hasBootstrapDone: boolean
  /** 工作目录中是否有任何源码文件（.ts/.py/.go/.rs/.java 等） */
  hasSourceCode: boolean
}

const LANGUAGE_MANIFESTS: Array<{ key: keyof ProjectSignals; patterns: string[] }> = [
  { key: 'hasPackageJson', patterns: ['package.json'] },
  { key: 'hasCompose', patterns: ['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml'] },
  { key: 'hasCargo', patterns: ['Cargo.toml'] },
  { key: 'hasPyproject', patterns: ['pyproject.toml', 'setup.py', 'requirements.txt'] },
  { key: 'hasGoMod', patterns: ['go.mod'] },
  { key: 'hasJvm', patterns: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
  { key: 'hasDotnet', patterns: [] }, // glob handled separately
  { key: 'hasOther', patterns: ['Gemfile', 'pubspec.yaml', 'mix.exs'] },
]

const SOURCE_CODE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.cs',
  '.rb',
  '.dart',
  '.swift',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
]

const BOUNDARY_DIR = '.openxenon'
const ASSETS_DIR = 'assets'
const BOOTSTRAP_DONE_MARKER = '.bootstrap-done'

// -----------------------------------------------------------------------------
// 探测逻辑
// -----------------------------------------------------------------------------

function detectDotnet(projectRoot: string): boolean {
  try {
    const entries = readdirSync(projectRoot)
    return entries.some((e) => e.endsWith('.csproj') || e.endsWith('.sln'))
  } catch {
    return false
  }
}

function detectSourceCode(projectRoot: string): boolean {
  try {
    const entries = readdirSync(projectRoot, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        for (const ext of SOURCE_CODE_EXTENSIONS) {
          if (entry.name.endsWith(ext)) return true
        }
      }
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        try {
          const subEntries = readdirSync(join(projectRoot, entry.name))
          for (const sub of subEntries) {
            for (const ext of SOURCE_CODE_EXTENSIONS) {
              if (sub.endsWith(ext)) return true
            }
          }
        } catch {
          // ignore subdir read errors
        }
      }
    }
  } catch {
    return false
  }
  return false
}

function detectSignals(projectRoot: string): ProjectSignals {
  const signals: ProjectSignals = {
    hasPackageJson: false,
    hasCompose: false,
    hasCargo: false,
    hasPyproject: false,
    hasGoMod: false,
    hasJvm: false,
    hasDotnet: false,
    hasOther: false,
    hasOpenxenon: false,
    hasAssets: false,
    hasBootstrapDone: false,
    hasSourceCode: false,
  }

  for (const { key, patterns } of LANGUAGE_MANIFESTS) {
    for (const pattern of patterns) {
      if (existsSync(join(projectRoot, pattern))) {
        signals[key] = true
        break
      }
    }
  }

  signals.hasDotnet = detectDotnet(projectRoot)
  signals.hasSourceCode = detectSourceCode(projectRoot)

  const boundaryPath = join(projectRoot, BOUNDARY_DIR)
  signals.hasOpenxenon = existsSync(boundaryPath)

  if (signals.hasOpenxenon) {
    const assetsPath = join(boundaryPath, ASSETS_DIR)
    if (existsSync(assetsPath)) {
      try {
        const entries = readdirSync(assetsPath)
        signals.hasAssets = entries.length > 0
      } catch {
        signals.hasAssets = false
      }
    }
    signals.hasBootstrapDone = existsSync(join(boundaryPath, BOOTSTRAP_DONE_MARKER))
  }

  return signals
}

// -----------------------------------------------------------------------------
// 项目类型判定
// -----------------------------------------------------------------------------

type ProjectType = 'new' | 'existing-empty' | 'existing-initialized' | 'existing-completed'

function determineProjectType(signals: ProjectSignals): ProjectType {
  if (!signals.hasOpenxenon) {
    return 'new'
  }
  if (signals.hasBootstrapDone) {
    return 'existing-completed'
  }
  if (signals.hasAssets) {
    return 'existing-initialized'
  }
  return 'existing-empty'
}

type OnboardingPath = 'A' | 'B1' | 'B2'

interface Recommendation {
  path: OnboardingPath
  reason: string
  nextCommand: string
}

function recommendPath(projectType: ProjectType, signals: ProjectSignals): Recommendation {
  switch (projectType) {
    case 'new':
      return {
        path: 'A',
        reason: '未检测到 .openxenon/ 边界目录，建议新项目入口（5 Asset bootstrap）',
        nextCommand: 'oxn onboard --new',
      }
    case 'existing-completed':
      return {
        path: 'B1',
        reason: '5 Asset bootstrap 已完成（检测到 .bootstrap-done 标记），可立即进入完整 IAP',
        nextCommand: 'oxn work create --blueprint md-author-blueprint',
      }
    case 'existing-initialized':
      return {
        path: 'B2',
        reason: '已有 .openxenon/ 边界 + 部分 Asset，建议补全 5 Asset 或扩展项目专属 Asset',
        nextCommand: 'oxn onboard --existing --bootstrap',
      }
    case 'existing-empty':
      if (signals.hasSourceCode) {
        return {
          path: 'B1',
          reason:
            '已有源码实现（' +
            sourceCodeSummary(signals) +
            '），但 .openxenon/assets/ 为空，建议先跑 Proof-First 5 分钟闭环',
          nextCommand: 'oxn onboard --existing --proof-first',
        }
      }
      return {
        path: 'A',
        reason: '.openxenon/ 存在但未 bootstrap，建议执行 5 Asset bootstrap',
        nextCommand: 'oxn onboard --new',
      }
  }
}

function sourceCodeSummary(signals: ProjectSignals): string {
  const stack: string[] = []
  if (signals.hasPackageJson) stack.push('Node/JS/TS')
  if (signals.hasCompose) stack.push('Docker Compose')
  if (signals.hasCargo) stack.push('Rust')
  if (signals.hasPyproject) stack.push('Python')
  if (signals.hasGoMod) stack.push('Go')
  if (signals.hasJvm) stack.push('Java/Kotlin')
  if (signals.hasDotnet) stack.push('.NET')
  if (signals.hasOther) stack.push('Other')
  if (stack.length === 0) return '未知语言'
  return stack.join(' + ')
}

// -----------------------------------------------------------------------------
// 5 Asset 完整性检查（Stage A 暂用占位，Stage C 接入 oxn asset check）
// -----------------------------------------------------------------------------

type AssetKind = 'domain' | 'workflow' | 'stack' | 'blueprint' | 'assetmap' // 🆕 v0.6.4: 'roadmap' → 'assetmap'

const REQUIRED_STARTER_ASSETS: Array<{ kind: AssetKind; name: string }> = [
  { kind: 'domain', name: 'doc-md-domain' },
  { kind: 'workflow', name: 'md-author-workflow' },
  { kind: 'stack', name: 'md-stack' },
  { kind: 'blueprint', name: 'md-author-blueprint' },
  { kind: 'assetmap', name: 'md-system' }, // 🆕 v0.6.4
]

function checkStarterAssets(projectRoot: string): {
  present: number
  missing: Array<{ kind: AssetKind; name: string }>
} {
  const missing: Array<{ kind: AssetKind; name: string }> = []
  for (const a of REQUIRED_STARTER_ASSETS) {
    const kindDir = a.kind === 'assetmap' ? 'assetmaps' : `${a.kind}s` // 🆕 v0.6.4
    const p = join(projectRoot, BOUNDARY_DIR, ASSETS_DIR, kindDir, `${a.name}.md`)
    if (!existsSync(p)) {
      missing.push(a)
    }
  }
  return { present: REQUIRED_STARTER_ASSETS.length - missing.length, missing }
}

// -----------------------------------------------------------------------------
// Stage C: --new 物理复制 + 校验
// -----------------------------------------------------------------------------

/**
 * Resolve the engine builtin source directory.
 *
 * ADR-0090 builtin 物理位置：packages/engine/src/builtin/
 * 直接调 engine 的 getBuiltinRegistry().getBuiltinDir() 复用其多候选路径解析。
 */
function resolveStarterSource(): string | null {
  return getBuiltinRegistry().getBuiltinDir()
}

interface CopyResult {
  copied: Array<{ kind: AssetKind; name: string; path: string }>
  skipped: Array<{ kind: AssetKind; name: string; reason: string }>
  validationResults: Array<{ kind: AssetKind; name: string; ok: boolean; errors: string[] }>
}

function kindDirName(kind: AssetKind): string {
  return kind === 'assetmap' ? 'assetmaps' : `${kind}s` // 🆕 v0.6.4: 'roadmap' → 'assetmap'
}

async function copyAndValidateStarterAssets(projectRoot: string): Promise<CopyResult> {
  const sourceDir = resolveStarterSource()
  if (!sourceDir) {
    throw new Error('OXN starter source not found. Expected packages/engine/src/builtin/. Did you run `bun run build`?')
  }

  const result: CopyResult = {
    copied: [],
    skipped: [],
    validationResults: [],
  }

  for (const asset of REQUIRED_STARTER_ASSETS) {
    // ADR-0090: 通过 engine registry readBuiltinAsset 读原文
    //   - 复用 engine 的多候选路径解析
    //   - 跳过路径字符串拼接的 fragile 逻辑
    const sourceFile = join(sourceDir, kindDirName(asset.kind), `${asset.name}.md`)
    const targetDir = join(projectRoot, BOUNDARY_DIR, ASSETS_DIR, kindDirName(asset.kind))
    const targetFile = join(targetDir, `${asset.name}.md`)

    if (!existsSync(sourceFile)) {
      result.skipped.push({ ...asset, reason: 'source file missing in engine builtin registry' })
      continue
    }

    if (existsSync(targetFile)) {
      result.skipped.push({ ...asset, reason: 'target file already exists' })
    } else {
      const content = readFile(sourceFile)
      if (content === null) {
        result.skipped.push({ ...asset, reason: 'failed to read source file' })
        continue
      }
      mkdirSync(targetDir, { recursive: true })
      writeFile(targetFile, content)
      result.copied.push({ ...asset, path: targetFile })
    }

    // Validate after copy (or skip if existed)
    try {
      const v = await validateAsset({
        projectRoot,
        kind: asset.kind,
        name: asset.name,
      })
      result.validationResults.push({
        ...asset,
        ok: v.ok,
        errors: v.ok ? [] : v.errors,
      })
    } catch (err) {
      result.validationResults.push({
        ...asset,
        ok: false,
        errors: [err instanceof Error ? err.message : String(err)],
      })
    }
  }

  return result
}

function createBootstrapMarker(projectRoot: string): void {
  const markerPath = join(projectRoot, BOUNDARY_DIR, BOOTSTRAP_DONE_MARKER)
  writeFile(
    markerPath,
    `# OXN bootstrap marker (ADR-0089)\n# Created at: ${new Date().toISOString()}\n# 5 starter Assets installed: ${REQUIRED_STARTER_ASSETS.map((a) => `${a.kind}/${a.name}`).join(', ')}\n`,
  )
}

function renderCopyResult(result: CopyResult): string {
  const lines: string[] = []
  lines.push('Copied Assets:')
  if (result.copied.length === 0) {
    lines.push('  (none)')
  } else {
    for (const c of result.copied) {
      lines.push(`  ✓ ${c.kind}/${c.name}`)
    }
  }
  if (result.skipped.length > 0) {
    lines.push('')
    lines.push('Skipped:')
    for (const s of result.skipped) {
      lines.push(`  - ${s.kind}/${s.name} (${s.reason})`)
    }
  }
  lines.push('')
  lines.push('Validation:')
  for (const v of result.validationResults) {
    const mark = v.ok ? '✓' : '✗'
    lines.push(`  ${mark} ${v.kind}/${v.name}${v.errors.length > 0 ? `: ${v.errors.join('; ')}` : ''}`)
  }
  return lines.join('\n')
}

async function runNew(projectRoot: string): Promise<void> {
  const result = await copyAndValidateStarterAssets(projectRoot)

  const allValid = result.validationResults.every((v) => v.ok)
  const anyCopied = result.copied.length > 0

  if (anyCopied && allValid) {
    createBootstrapMarker(projectRoot)
  }

  const data = {
    copied: result.copied.length,
    skipped: result.skipped.length,
    validated: result.validationResults.filter((v) => v.ok).length,
    totalValidations: result.validationResults.length,
    allValid,
    markerCreated: anyCopied && allValid,
    nextSteps: [
      'Fill project-specific content in copied Assets (esp. doc-md-domain terms, md-stack tools)',
      'Run `oxn asset check` to verify 5 Asset completeness',
      'Run `oxn assetmap suggest --goal "<your first task>" --scene collaborate --top 3` to discover routes',
      'Run `oxn work create --blueprint md-author-blueprint --domain doc-md-domain` to start first Work',
    ],
  }

  return output({ ok: allValid, data, human: renderCopyResult(result) }, 'human') as unknown as undefined
}

// -----------------------------------------------------------------------------
// Stage D Path B1: --existing --proof-first（输出指引，不执行）
// -----------------------------------------------------------------------------

function runProofFirst(_projectRoot: string): void {
  // phase5 T20 (cli-convergence Work, 2026-08-07): rerouted from Proof-First to Definition-First
  // 决议：grilling 锁定 "协作" 为目标，"定义边界" 是 OXN 产物；onboard 应优先体验闭环而非验证
  // 保留 --proof-first flag 作为别名（向后兼容），输出改为 definition-first 序列
  const data = {
    path: 'B1' as const,
    description: 'Definition-First 5 分钟闭环（定义边界 → 锁定 → 协作 → 收口；体验 OXN 完整闭环）',
    commands: [
      '# 1. 初始化 OXN 边界（如未初始化）',
      'oxn init',
      '',
      '# 2. 定义第一个 Blueprint（Asset 是工程师定义的协作边界）',
      'oxn asset create --kind blueprint my-first-bp',
      '',
      '# 3. 创建 Work（引用 Blueprint 进入协作）',
      'oxn work create my-first-work --blueprint my-first-bp',
      '',
      '# 4. 编排 Task',
      'oxn work add-task my-first-work --task implement --blueprint my-first-bp',
      '',
      '# 5. 校验 + 锁定边界（PlanLock 5-hash：边界从 SSOT 变成可执行约束）',
      'oxn work validate my-first-work',
      'oxn work lock my-first-work',
      '',
      '# 6. 启动协作（AI Agent 在边界内工作）',
      'oxn work run my-first-work',
      'oxn work submit my-first-work --task implement',
      '',
      '# 7. 收口（Domain invariant 校验 + 写最终 frozen.json 如实记录）',
      'oxn work finalize my-first-work',
      '',
      '# 查看 per-task 与 work 级 frozen.json（客观执行事实）',
      'cat .openxenon/works/my-first-work/.run/tasks/implement/frozen.json',
      'cat .openxenon/works/my-first-work/.run/frozen.json',
    ],
    nextStep:
      '这是 OXN 完整闭环：定义 → 锁定 → 协作 → 收口。如需验证具体产物（脚本 exitCode / 文件存在 / 测试覆盖率），运行 `oxn proof create <name>` + `oxn proof run <name>` 走独立 Proof 路径；升级到完整 Asset 体系时，运行 `oxn onboard --existing --bootstrap`（Path B2）',
  }
  const human = `${data.description}\n\n${data.commands.join('\n')}\n\n${data.nextStep}`
  output({ ok: true, data, human }, 'human')
}

// -----------------------------------------------------------------------------
// Stage D Path B2: --existing --bootstrap（输出项目专属 Asset 探索清单）
// -----------------------------------------------------------------------------

function suggestProjectAssetNames(signals: ProjectSignals): {
  domain: string
  workflow: string
  stack: string
  blueprint: string
  assetmap: string // 🆕 v0.6.4: 'roadmap' → 'assetmap'
} {
  const lang = []
  if (signals.hasPackageJson) lang.push('node')
  if (signals.hasPyproject) lang.push('py')
  if (signals.hasCargo) lang.push('rust')
  if (signals.hasGoMod) lang.push('go')
  if (signals.hasJvm) lang.push('jvm')
  if (signals.hasDotnet) lang.push('dotnet')
  const projectTag = lang.length > 0 ? `${lang[0]}-app` : 'project'

  return {
    domain: `${projectTag}-domain`,
    workflow: `${projectTag}-dev-workflow`,
    stack: `${projectTag}-stack`,
    blueprint: `${projectTag}-blueprint`,
    assetmap: `${projectTag}-system`, // 🆕 v0.6.4
  }
}

function runBootstrap(projectRoot: string): void {
  const signals = detectSignals(projectRoot)
  const names = suggestProjectAssetNames(signals)
  const data = {
    path: 'B2' as const,
    description: 'AI 探索建 Asset（项目专属 Domain/Workflow/Stack/Blueprint/AssetMap）',
    detectedLanguage: sourceCodeSummary(signals),
    suggestedNames: names,
    explorationSteps: [
      '1. 扫 README.md → 推断业务领域（电商 / 工具 / 平台 / ...）',
      '2. 读 package.json / pyproject.toml / Cargo.toml → 推断技术栈',
      '3. 看 src/ 顶层结构 → 推断模块边界',
      '4. 查 docs/ 既有文档 → 推断项目术语',
      '5. 综合推断结果 → 用下列命令创建 5 个项目专属 Asset',
    ],
    commands: [
      `# Domain（项目术语）`,
      `oxn asset create ${names.domain} --kind domain`,
      ``,
      `# Stack（项目技术栈）`,
      `oxn asset create ${names.stack} --kind stack`,
      ``,
      `# Workflow（项目开发流水线）`,
      `oxn asset create ${names.workflow} --kind workflow`,
      ``,
      `# Blueprint（组合模板，引用上面 3 个）`,
      `oxn asset create ${names.blueprint} --kind blueprint \\`,
      `  --domain ${names.domain} --stack ${names.stack} --workflow ${names.workflow}`,
      ``,
      `# AssetMap（项目场景路由）`,
      `oxn asset create ${names.assetmap} --kind assetmap`, // 🆕 v0.6.4
    ],
    finalSteps: [
      `oxn asset validate ${names.domain} --kind domain`,
      `oxn asset validate ${names.workflow} --kind workflow`,
      `oxn asset validate ${names.stack} --kind stack`,
      `oxn asset validate ${names.blueprint} --kind blueprint`,
      `oxn asset validate ${names.assetmap} --kind assetmap`, // 🆕 v0.6.4
    ],
    note: '5 Asset 全部创建后，运行 `oxn onboard --new` 可叠加 5 个 md-* 起手 Asset（基于通用 MD 工具链）',
  }
  const human =
    `${data.description}\n` +
    `\n检测到的语言/栈: ${data.detectedLanguage}\n` +
    `\n探索步骤:\n${data.explorationSteps.join('\n')}\n` +
    `\n创建命令:\n${data.commands.join('\n')}\n` +
    `\n验证:\n${data.finalSteps.join('\n')}\n` +
    `\n提示: ${data.note}\n`
  output({ ok: true, data, human }, 'human')
}

// -----------------------------------------------------------------------------
// 子命令：--detect
// -----------------------------------------------------------------------------

function buildDetectData(projectRoot: string) {
  const signals = detectSignals(projectRoot)
  const projectType = determineProjectType(signals)
  const recommendation = recommendPath(projectType, signals)
  const assetCheck = checkStarterAssets(projectRoot)

  return {
    projectType,
    signals,
    recommendation,
    assetCheck: {
      required: REQUIRED_STARTER_ASSETS.length,
      present: assetCheck.present,
      missing: assetCheck.missing.map((a) => `${a.kind}:${a.name}`),
    },
    projectRoot,
  }
}

function renderDetectHuman(data: ReturnType<typeof buildDetectData>): string {
  const lines: string[] = []
  lines.push(`Project Type: ${data.projectType}`)
  lines.push('')
  lines.push('Signals:')
  lines.push(`  - .openxenon/: ${data.signals.hasOpenxenon ? '✓' : '✗'}`)
  if (data.signals.hasOpenxenon) {
    lines.push(`    - assets/: ${data.signals.hasAssets ? '✓ present' : '✗ empty'}`)
    lines.push(`    - bootstrap-done: ${data.signals.hasBootstrapDone ? '✓' : '✗'}`)
  }
  lines.push(`  - package.json: ${data.signals.hasPackageJson ? '✓' : '✗'}`)
  lines.push(`  - compose.yaml: ${data.signals.hasCompose ? '✓' : '✗'}`)
  lines.push(`  - Cargo.toml: ${data.signals.hasCargo ? '✓' : '✗'}`)
  lines.push(`  - pyproject.toml: ${data.signals.hasPyproject ? '✓' : '✗'}`)
  lines.push(`  - go.mod: ${data.signals.hasGoMod ? '✓' : '✗'}`)
  lines.push(`  - pom.xml / build.gradle: ${data.signals.hasJvm ? '✓' : '✗'}`)
  lines.push(`  - *.csproj / *.sln: ${data.signals.hasDotnet ? '✓' : '✗'}`)
  lines.push(`  - other manifest: ${data.signals.hasOther ? '✓' : '✗'}`)
  lines.push(`  - source code: ${data.signals.hasSourceCode ? '✓' : '✗'}`)
  lines.push('')
  lines.push('Asset Check:')
  lines.push(`  - 5 starter Assets: ${data.assetCheck.present}/${data.assetCheck.required}`)
  if (data.assetCheck.missing.length > 0) {
    lines.push(`  - missing: ${data.assetCheck.missing.join(', ')}`)
  }
  lines.push('')
  lines.push('Recommendation:')
  lines.push(`  - path: ${data.recommendation.path}`)
  lines.push(`  - reason: ${data.recommendation.reason}`)
  lines.push(`  - next: ${data.recommendation.nextCommand}`)
  return lines.join('\n')
}

// -----------------------------------------------------------------------------
// 子命令：--new / --existing / --bootstrap（Stage C/D 占位）
// -----------------------------------------------------------------------------

// (Removed: replaced by Stage C/D implementations above)

// -----------------------------------------------------------------------------
// 主命令
// -----------------------------------------------------------------------------

export default defineCommand({
  meta: {
    name: 'onboard',
    description: t('onboard.description'),
  },
  args: {
    detect: {
      type: 'boolean',
      description: t('onboard.detect'),
      default: false,
    },
    new: {
      type: 'boolean',
      description: t('onboard.new'),
      default: false,
    },
    existing: {
      type: 'boolean',
      description: t('onboard.existing'),
      default: false,
    },
    'proof-first': {
      type: 'boolean',
      description: t('onboard.proofFirst'),
      default: false,
    },
    bootstrap: {
      type: 'boolean',
      description: t('onboard.bootstrap'),
      default: false,
    },
    '--json': {
      type: 'boolean',
      description: t('format.json'),
    },
    '--yaml': {
      type: 'boolean',
      description: t('format.yaml'),
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = process.cwd()

    const wantDetect = ctx.args.detect === true
    const wantNew = ctx.args.new === true
    const wantExisting = ctx.args.existing === true
    const wantProofFirst = ctx.args['proof-first'] === true
    const wantBootstrap = ctx.args.bootstrap === true

    // --detect 子命令
    if (wantDetect) {
      const data = buildDetectData(projectRoot)
      return output({ ok: true, data, human: renderDetectHuman(data) }, format)
    }

    // --new 子命令（Stage C：复制 5 Asset + 校验 + 标记）
    if (wantNew) {
      try {
        await runNew(projectRoot)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return outputError({ code: 'OXN_ONBOARD_NEW_FAILED', message: msg }, format)
      }
      return
    }

    // --existing 子命令
    if (wantExisting) {
      if (wantProofFirst) {
        return runProofFirst(projectRoot)
      }
      if (wantBootstrap) {
        return runBootstrap(projectRoot)
      }
      // 默认：探测 + 列出 3 选项
      const data = buildDetectData(projectRoot)
      return output(
        {
          ok: true,
          data: {
            ...data,
            options: [
              { id: 'B1', label: 'Proof-First（5 分钟快速闭环）', command: 'oxn onboard --existing --proof-first' },
              { id: 'B2', label: '探索建 Asset（AI 推断项目类型）', command: 'oxn onboard --existing --bootstrap' },
            ],
          },
          human: `${renderDetectHuman(data)}\n\nNext: 选择路径 B1 或 B2`,
        },
        format,
      )
    }

    // --bootstrap 子命令（Stage D Path B2）
    if (wantBootstrap) {
      return runBootstrap(projectRoot)
    }

    // 无参数：默认展示探测结果 + 三选项
    const data = buildDetectData(projectRoot)
    return output(
      {
        ok: true,
        data: {
          ...data,
          options: [
            { id: 'A', label: '新项目入口（5 Asset bootstrap）', command: 'oxn onboard --new' },
            { id: 'B1', label: '存量项目 - Proof-First', command: 'oxn onboard --existing --proof-first' },
            { id: 'B2', label: '存量项目 - 探索建 Asset', command: 'oxn onboard --existing --bootstrap' },
          ],
        },
        human:
          renderDetectHuman(data) +
          '\n\n未指定子命令。3 个入口选项：\n' +
          '  A  oxn onboard --new             (新项目 / 5 Asset bootstrap)\n' +
          '  B1 oxn onboard --existing --proof-first  (存量 - Proof-First 5 分钟)\n' +
          '  B2 oxn onboard --existing --bootstrap   (存量 - AI 探索建 Asset)',
      },
      format,
    )
  },
})
