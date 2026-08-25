// =============================================================================
// `oxn work` — Work 编排与运行时（RFC-0033 极简化 3 步生命周期）
//
//   create <name> --blueprint <bp>      — 写 works/<w>/work.md + auto task skeleton
//   run <name> [--validate-only]        — 启动状态机 / 仅校验（替代原 `validate` 子命令）
//   submit <name> --task <t>            — 推进 task 内 part + 算 workMdHash 指纹 + DRIFT 检测
//
//   Auxiliary:
//     add-task / edit-task / delete-task / list-task / task-status
//     list / migrate / status / context / inject
//   （lock/unlock/validate/finalize/next-round 已随 RFC-0033 / RFC-0032 退役）
//
// 命名范式: V1 布局（详见 kernel/constants.ts）
//   - DSL 图纸: work.md / task.md
//   - 运行时:  .run/state.json + .run/trace.jsonl（含 SUBMIT/ASSET_DRIFT 事件）
//              .run/tasks/<t>/state.json + .run/tasks/<t>/trace.jsonl
//
// 阶段守卫（RFC-0033 D1/D2/D5）：
//   - create → run → submit：3 步顺序不可跳（add-task 可选，写 work.md ## Tasks 段）
//   - .run/state.json 存在 ⇒ add-task/edit-task/delete-task 拒绝
//   - .run/state.json 缺失 ⇒ submit 拒绝（run 必须先跑）
//   - 无 planLock / 无 IAP_ALIGN_LOCK_* 错误（RFC-0033 D2 PlanLock 已删）
// =============================================================================

import { defineCommand } from 'citty'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { t } from '@openxenon/engine/infra/i18n'
import { join, relative } from 'path'
import { BOUNDARY_DIR, RUN_DIR, TASK_OXN_FILE, WORK_OXN_FILE, WORK_RUN_STATE_JSON } from '@openxenon/engine/kernel'
// 🗑️ RFC-0033 D2: assertDirNameConsistent import 已删（PlanLock 检查的 work.name vs dirName 一致性校验随之废弃，运行时直接读 work.md）
import { IAPError } from '@openxenon/engine/errors'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import type { WorkDeclaration } from '@openxenon/engine/oxl'
import { extractBlueprintIR } from '@openxenon/engine/oxl/md-pipeline/transformers/blueprint.js'
import type { WorkPart } from '@openxenon/engine/oxl/md-pipeline/transformers/work.js'
import { runTask, runWork, submitTask } from '@openxenon/engine/Work'
import {
  ensureWorkDir,
  getTaskOxnPath,
  getTaskStatePath,
  getWorksDir,
  getTasksDir,
  loadTaskState,
  loadWorkState,
  saveWorkState,
  workStateExists,
  resolveWorkFilePath,
} from '@openxenon/engine/Work/dual-state-io'
import { resetTasksForReRun, appendWorkTrace } from '@openxenon/engine/Work/dual-state-exec'
// 🆕 v0.6.1-alpha.4 Phase B: 删除 resolveDomainFile import（Domain 引用走 Blueprint ## Use 路径）
import { resolveBlueprintFile } from '@openxenon/engine/Work/per-work-blueprints-merger'
import {
  loadPerWorkBlueprints,
  summarizeBlueprints,
  loadDomainLanguagesFromBlueprint,
  loadStackToolsFromBlueprint,
  buildTermViews,
  partitionBackgroundDomains,
  findBoundaryAssetFile,
  type TermView,
} from '@openxenon/engine/Work/work-context-builder'
import type { StackToolInfo } from '@openxenon/engine/kernel'
import { buildBlueprintDiagnostic, type RefDiagnostic } from '@openxenon/engine/oxl/compiler/ref-diagnostic'
import { readWorkFile as readBirthCert } from '@openxenon/engine/Work/birth-cert'
// 🗑️ RFC-0033 D2: writeWorkFile / BirthCert import 已删（planLock 写路径不再需要）
import { hashWorkPlan } from '@openxenon/engine/Work/plan-hash'
import { readProjectConfig } from './project-config-io'
import {
  resolveAssetPrimaryPath,
  resolveAssetAltPath,
  resolveAssetFormat,
  resolveAutoSync,
  resolveAssetDir,
  ALL_ASSET_KINDS,
  type AssetFormat,
} from '@openxenon/engine/infra/paths'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractWorkIR } from '@openxenon/engine/oxl/md-pipeline/transformers/work.js'
import { serializeWorkToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import { migrateWorkToV1 } from '@openxenon/engine/Work/work-migrator'
import { renderWorkSkeleton, type RenderWorkSkeletonOptions } from '@openxenon/engine/Work/work-skeleton'
import { validateAndWriteArtifacts } from '@openxenon/engine/Work/work-validator'
import { snapshotContext, makeReport, type DerivedWorkState } from '@openxenon/engine/Work/work-reporter'
import { collectUnresolvedRefDiagnostics } from '@openxenon/engine/Work/work-diagnostics'
import { isWorkStarted } from '@openxenon/engine/Work'
import {
  readTaskFile,
  readWorkFileFromText,
  readWorkFile,
  readDomainFile,
  type WorkFileSummary,
  type DomainFileSummary,
} from '@openxenon/engine/oxl/summary-extractors'
import { validateWorkFile } from '@openxenon/engine/oxl/work-file-loader'
// finalizeWorkDomains (work-domains.ts) 已随 RFC-0032 Phase 2 删除
// 该 import 历史用途: oxn work finalize 子命令 (200 行) 评估 Domain proof
// 解决方案: 同步删除 finalize 子命令, 该 import 行一并清理

// ---------------------------------------------------------------------------
// 报告层类型（来自 engine/work-reporter）
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function getProjectRoot(): string {
  return process.cwd()
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
}

function getWorkDir(cwd: string, workName: string): string {
  return join(cwd, BOUNDARY_DIR, 'works', workName)
}

function getTaskDir(cwd: string, workName: string, taskName: string): string {
  return join(getWorkDir(cwd, workName), 'tasks', taskName)
}

function getWorkTaskDir(workName: string, taskName: string): string {
  return getTaskDir(getProjectRoot(), workName, taskName)
}

function getWorkTaskFile(workName: string, taskName: string): string {
  return join(getWorkTaskDir(workName, taskName), TASK_OXN_FILE)
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// 🆕 v0.7: work create 后自动为 blueprint 每个 boundary 生成 task.md 骨架
function writeTaskTemplate(
  projectRoot: string,
  workName: string,
  taskName: string,
  blueprintName: string,
  domainName: string,
  boundaryName?: string,
): { written: boolean; path: string; reason?: 'exists' } {
  const taskDir = getTaskDir(projectRoot, workName, taskName)
  const taskFile = getWorkTaskFile(workName, taskName)
  if (existsSync(taskFile)) {
    return { written: false, path: taskFile, reason: 'exists' }
  }
  const refsSection = [
    `- blueprint: ${blueprintName}`,
    boundaryName ? `- boundary: ${boundaryName}` : '',
    domainName ? `- domain: ${domainName}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const template = `---
entity: task
version: 0.3.0
name: ${taskName}
---

# Task: ${taskName}

## Parts
### implement
- skill_context: "TODO: 描述 AI 执行指令"

## Refs
${refsSection}
`
  ensureDirectory(taskDir)
  writeFileSync(taskFile, template, 'utf-8')
  return { written: true, path: taskFile }
}

function validateWorkName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Name is required' }
  if (name.length < 2) return { valid: false, error: 'Name too short (min 2 chars)' }
  if (name.length > 64) return { valid: false, error: 'Name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: 'Name must be kebab-case (lowercase letter, lowercase letters/numbers, hyphens)' }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Name cannot end with hyphen' }
  return { valid: true }
}

function validateTaskName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Task name is required' }
  if (name.length < 1) return { valid: false, error: 'Task name too short' }
  if (name.length > 64) return { valid: false, error: 'Task name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return {
      valid: false,
      error: 'Task name must be kebab-case (lowercase letter, lowercase letters/numbers, hyphens)',
    }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Task name cannot end with hyphen' }
  return { valid: true }
}

function parsePartName(raw: string): string {
  return raw.replace(/^"|"$/g, '')
}

// ---------------------------------------------------------------------------
// PR-6: validate → 写 domains.json + blueprints.json + .work birth cert
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

function errorJson(
  code: string,
  message: string,
  suggestion?: string,
): { ok: false; error: { code: string; message: string; suggestion?: string } } {
  return {
    ok: false,
    error: suggestion ? { code, message, suggestion } : { code, message },
  }
}

function readTextFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8')
}

async function buildPartSpecs(
  work: WorkDeclaration,
  inlineParts: WorkPart[],
): Promise<
  Array<{
    partName: string
    align: string
    skill: { lifecycle: string; objective: string; acceptance: string[]; guidance?: string }
  }>
> {
  const inlineByName = new Map<string, WorkPart>()
  for (const p of inlineParts) inlineByName.set(parsePartName(p.name), p)

  const taskEntries = work.tasks ?? []
  const specs: Array<{
    partName: string
    align: string
    skill: { lifecycle: string; objective: string; acceptance: string[]; guidance?: string }
  }> = []
  for (const task of taskEntries) {
    const partName = parsePartName(task.name)
    const taskBlueprint = task.blueprint ?? ''
    specs.push({
      partName,
      align: taskBlueprint ?? '',
      skill: { lifecycle: 'code', objective: '', acceptance: [] },
    })
  }

  if (specs.length === 0 && inlineParts.length > 0) {
    return inlineParts.map((p) => ({
      partName: parsePartName(p.name),
      align: '',
      skill: {
        lifecycle: 'code',
        objective: p.skillContext ?? '',
        acceptance: [],
      },
    }))
  }

  return specs
}

// ---------------------------------------------------------------------------
// Phase guards
// ---------------------------------------------------------------------------

function isWorkNotStarted(projectRoot: string, workName: string): boolean {
  return !isWorkStarted(projectRoot, workName)
}

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------
const listSubcommand = defineCommand({
  meta: { name: 'list', description: t('work.list.description') },
  args: {
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const cwd = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    const worksDir = getWorksDir(cwd)
    if (!existsSync(worksDir)) {
      output({ data: { works: [] }, human: t('work.emptyList') }, format)
      return
    }

    const works: Array<{
      workName: string
      status: string
      taskCount: number
      passedTasks: number
      hasWorkOxn: boolean
      hasWorkState: boolean
    }> = []

    const workDirs = readdirSync(worksDir)
    for (const workName of workDirs) {
      const workDir = join(worksDir, workName)
      if (!existsSync(workDir)) continue

      const hasWorkOxn = existsSync(join(workDir, WORK_OXN_FILE))
      const hasWorkState = existsSync(join(workDir, RUN_DIR, WORK_RUN_STATE_JSON))
      let status = 'pending'
      let taskCount = 0
      let passedTasks = 0
      if (hasWorkState) {
        try {
          const ws = loadWorkState(cwd, workName)
          if (ws) {
            status = ws.status
            taskCount = ws.tasks.length
            passedTasks = ws.tasks.filter((t) => t.status === 'passed').length
          }
        } catch {
          status = 'error'
        }
      }
      works.push({ workName, status, taskCount, passedTasks, hasWorkOxn, hasWorkState })
    }

    if (works.length === 0) {
      output({ data: { works }, human: t('work.emptyList') }, format)
      return
    }

    const human = works
      .map(
        (w) =>
          `${w.workName}  status=${w.status}  tasks=${w.passedTasks}/${w.taskCount}  ` +
          `[${w.hasWorkOxn ? 'oxn' : '_'},${w.hasWorkState ? 'state' : '_'}]`,
      )
      .join('\n')

    output({ data: { works }, human }, format)
  },
})

// ---------------------------------------------------------------------------
// Asset Mode: --asset-kind 走标准 Work 流程（v0.6.1 Phase C）
// ---------------------------------------------------------------------------

const VALID_ASSET_KINDS = ALL_ASSET_KINDS
type ValidAssetKind = (typeof VALID_ASSET_KINDS)[number]

interface CreateWorkWithAssetModeInput {
  workName: string
  assetKind: string
  blueprintName: string
  domainName: string
  projectRoot: string
  format: 'human' | 'json' | 'yaml' | 'html' | 'md'
  force: boolean
  assetFormat: AssetFormat
  autoSync: boolean
  skeletonOptions: RenderWorkSkeletonOptions
}

/**
 * 🆕 v0.6.1 Phase C: Asset 创建走标准 Work 流程。
 * 自动选择 asset-create workflow 作为 Blueprint，Domain 为 AssetModeContext，
 * 生成4个 task（choose-kind/fork-template/fill-content/validate-commit）。
 */
async function createWorkWithAssetMode(input: CreateWorkWithAssetModeInput): Promise<unknown> {
  const {
    workName,
    assetKind,
    blueprintName,
    domainName,
    projectRoot,
    format,
    force,
    assetFormat,
    autoSync,
    skeletonOptions,
  } = input

  // 1. 解析 asset-create workflow（从 workflows/ 目录）
  const config = readProjectConfig(projectRoot)
  const wfAssetDir = resolveAssetDir(projectRoot, 'workflow', config)
  const blueprintCandidates = [
    join(wfAssetDir, `${blueprintName}.md`),
    join(wfAssetDir, blueprintName, 'workflow.md'),
    join(projectRoot, '.openxenon', 'assets', 'workflows', `${blueprintName}.md`),
    // v0.6.1-alpha.2 fallback（兼容旧 blueprints/ 目录）
    join(projectRoot, '.openxenon', 'assets', 'blueprints', `${blueprintName}.md`),
    join(projectRoot, '.openxenon', 'blueprints', `${blueprintName}.md`),
  ]
  const absBlueprint = blueprintCandidates.find((p) => existsSync(p))
  if (!absBlueprint) {
    return outputError(
      {
        code: 'OXN_FILE_NOT_FOUND',
        message: `asset-create workflow not found: tried ${blueprintCandidates.join(', ')}`,
        suggestion: 'ensure asset-create workflow exists in .openxenon/assets/workflows/',
      },
      format,
    )
  }

  try {
    const parsed = parseMarkdown(readFileSync(absBlueprint, 'utf-8'))
    const bp = extractBlueprintIR(parsed.tree, parsed.frontmatter)
    if (!bp?.name) {
      return outputError(
        { code: 'OXN_NO_BLUEPRINT', message: `No Blueprint declaration found in ${absBlueprint}` },
        format,
      )
    }
    // 🆕 v0.7: Blueprint Boundaries 替代 Slots
    if ((bp.boundaries ?? []).length === 0) {
      return outputError({ code: 'OXN_INVALID_BLUEPRINT', message: `Blueprint "${bp.name}" has no boundaries` }, format)
    }

    const resolvedBlueprintName = parsePartName(bp.name)
    const boundaries = (bp.boundaries ?? []).map((b) => ({
      name: parsePartName(b.name),
      align: capitalize(parsePartName(b.name)),
    }))

    // 2. 创建 works/<workName>/ 目录
    const outputDir = join(projectRoot, '.openxenon', 'works', workName)
    if (!force && existsSync(outputDir)) {
      return outputUserInputError('OXN_OUTPUT_DIR_EXISTS', `output directory already exists: ${outputDir}`, {
        suggestion: 'use --force to overwrite',
        format,
      })
    }
    ensureDirectory(outputDir)

    // 3. 生成 work.md（注入 asset-create blueprint + domain + goal）
    const workPrimaryPath = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
    const workAltPath = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
    const workPrimaryDir = join(workPrimaryPath, '..')
    const workAltDir = join(workAltPath, '..')
    if (!existsSync(workPrimaryDir)) mkdirSync(workPrimaryDir, { recursive: true })
    if (!existsSync(workAltDir)) mkdirSync(workAltDir, { recursive: true })

    const workFile = workPrimaryPath
    if (!force && existsSync(workFile)) {
      return outputUserInputError(
        'OXN_OUTPUT_FILE_EXISTS',
        `${assetFormat === 'oxn' ? 'work.md' : 'work.md'} already exists in ${outputDir}`,
        { suggestion: 'use --force to overwrite', format },
      )
    }

    // 构造 skeleton options（注入 domain + goal）
    const assetSkeletonOptions: RenderWorkSkeletonOptions = {
      ...skeletonOptions,
      goal: skeletonOptions.goal ?? `Create ${assetKind} Asset: ${workName.replace(/-asset-.*$/, '')}`,
    }

    const workContent = renderWorkSkeleton(
      workName,
      resolvedBlueprintName,
      boundaries,
      assetFormat,
      Object.keys(assetSkeletonOptions).length > 0 ? assetSkeletonOptions : undefined,
    )
    writeFileSync(workFile, workContent, 'utf-8')

    // 4. auto-sync to other format
    if (autoSync && workPrimaryPath !== workAltPath) {
      try {
        if (assetFormat === 'md') {
          const { tree, frontmatter: fm } = parseMarkdown(workContent)
          const ir = extractWorkIR(tree, fm)
          const { serializeWorkToOxn } = await import('@openxenon/engine/oxl/md-pipeline/oxn-serializer')
          const altContent = serializeWorkToOxn(ir)
          writeFileSync(workAltPath, altContent, 'utf-8')
        }
      } catch {
        // autoSync 失败不阻断主命令
      }
    }

    // 5. 为每个 boundary 生成 task.md 骨架（🆕 v0.7 传 boundary 名字）
    const autoTasks: Array<{ name: string; path: string; status: 'created' | 'exists' }> = []
    for (const boundary of boundaries) {
      const t = writeTaskTemplate(projectRoot, workName, boundary.name, resolvedBlueprintName, '', boundary.name)
      autoTasks.push({
        name: boundary.name,
        path: t.path,
        status: t.written ? 'created' : 'exists',
      })
    }

    return output(
      {
        ok: true,
        data: {
          workName,
          outputDir,
          blueprintPath: absBlueprint,
          blueprint: {
            name: resolvedBlueprintName,
            version: bp.version ?? '',
            boundaryCount: boundaries.length,
            boundaries: boundaries.map((b) => b.name),
          },
          assetKind,
          domain: domainName,
          files: { work: workFile },
          tasks: autoTasks,
          nextStep:
            `Edit the task files, then run: oxn work run ${workName} --validate-only && oxn work run ${workName}\n` +
            `  Asset will be created after all tasks pass through the IAP pipeline.`,
        },
      },
      format,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return output(errorJson('OXN_DSL_PARSE_FAILED', message), format)
  }
}

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------
const createSubcommand = defineCommand({
  meta: {
    name: 'create',
    description: t('work.create.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    blueprint: {
      type: 'string',
      alias: 'b',
      required: false, // --asset-kind 短路时不要求 blueprint
      description: t('work.create.args.blueprint'),
    },
    'blueprint-file': { type: 'string', description: t('work.create.args.blueprintPath') },
    'output-dir': { type: 'string', description: t('work.create.args.outputDir') },
    'asset-kind': {
      type: 'string',
      description: t('work.create.args.assetKind'),
    },
    force: { type: 'boolean', description: t('work.create.args.force') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
    // v0.6.4: 多 Asset refs + goal/constraints 直传
    domain: { type: 'string', array: true, description: 'Domain refs (1..N)，从 Roadmap suggest 选' },
    stack: { type: 'string', array: true, description: 'Stack refs (Work 级声明；不进 Task)' },
    goal: { type: 'string', description: 'Work goal (直接写入 Context.goal)' },
    constraints: { type: 'string', array: true, description: 'Work constraints (直接写入 Context.constraints)' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const assetKindArg = ctx.args['asset-kind'] as string | undefined
    const customBlueprint = ctx.args['blueprint-file'] as string | undefined
    const blueprintNameArg = ctx.args.blueprint as string | undefined
    const customOutputDir = ctx.args['output-dir'] as string | undefined
    const force = ctx.args.force === true
    const projectRoot = getProjectRoot()
    // v0.6.4: 多 Asset refs + goal/constraints 直传参数
    const domainArgs = (ctx.args.domain as string[] | string | undefined) ?? []
    const domainNames = Array.isArray(domainArgs) ? domainArgs : [domainArgs]
    const stackArgs = (ctx.args.stack as string[] | string | undefined) ?? []
    const stackNames = Array.isArray(stackArgs) ? stackArgs : [stackArgs]
    const goalArg = ctx.args.goal as string | undefined
    const constraintsArgs = (ctx.args.constraints as string[] | string | undefined) ?? []
    const constraintsArr = Array.isArray(constraintsArgs) ? constraintsArgs : [constraintsArgs]
    const skeletonOptions = {
      ...(goalArg !== undefined ? { goal: goalArg } : {}),
      ...(domainNames.length > 0 ? { domainNames: domainNames.filter(Boolean) as string[] } : {}),
      ...(stackNames.length > 0 ? { stackNames: stackNames.filter(Boolean) as string[] } : {}),
      ...(constraintsArr.length > 0 ? { constraints: constraintsArr.filter(Boolean) as string[] } : {}),
    }
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)
    const autoSync = resolveAutoSync(config)

    if (!projectBoundaryExists()) {
      return outputError(
        { code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit'), suggestion: t('errors.initHint') },
        format,
      )
    }

    // 🆕 v0.6.1 Phase C: --asset-kind 不再短路，走标准 Work 流程
    // 自动选择 asset-create workflow 作为 Blueprint，Domain 为 AssetModeContext
    if (assetKindArg) {
      if (!VALID_ASSET_KINDS.includes(assetKindArg as ValidAssetKind)) {
        return outputError(
          {
            code: 'OXN_INVALID_ASSET_KIND',
            message: `Invalid --asset-kind: '${assetKindArg}'`,
            suggestion: `Valid: ${VALID_ASSET_KINDS.join(', ')}`,
          },
          format,
        )
      }
      // work 名从 <name>-asset-<kind> 推导（自动转 kebab-case）
      const baseName = workName.includes('-asset-') ? (workName.split('-asset-')[0] ?? workName) : workName
      const assetWorkName = `${camelToKebab(baseName)}-asset-${camelToKebab(assetKindArg as string)}`
      const assetWorkValidation = validateWorkName(assetWorkName)
      if (!assetWorkValidation.valid) {
        return outputError(
          {
            code: 'OXN_INVALID_WORK_NAME',
            message: t('work.invalidId', { error: assetWorkValidation.error }),
          },
          format,
        )
      }
      // 自动选择 asset-create workflow
      const assetBlueprint = 'asset-create'
      const assetDomain = 'AssetModeContext'
      // 复用标准 Work 创建流程，注入 asset-create blueprint + domain
      return await createWorkWithAssetMode({
        workName: assetWorkName,
        assetKind: assetKindArg,
        blueprintName: assetBlueprint,
        domainName: assetDomain,
        projectRoot,
        format,
        force,
        assetFormat,
        autoSync,
        skeletonOptions,
      })
    }

    const validation = validateWorkName(workName)
    if (!validation.valid) {
      return outputError(
        { code: 'OXN_INVALID_WORK_NAME', message: t('work.invalidId', { error: validation.error }) },
        format,
      )
    }

    // (projectRoot already declared above)

    // (projectRoot already declared above)

    if (customBlueprint || blueprintNameArg) {
      // v0.6.1-alpha.3: Phase 1 — Work create 查 workflow 目录（slots/deps/observe 模板）。
      // Phase 1 后 Blueprint = 组合模板；Work 用 Workflow 做 task 渲染。
      const config = readProjectConfig(projectRoot)
      const wfAssetDir = resolveAssetDir(projectRoot, 'workflow', config)
      const defaultCandidates = blueprintNameArg
        ? [
            join(wfAssetDir, `${blueprintNameArg}.md`),
            join(wfAssetDir, blueprintNameArg, 'workflow.md'),
            // v0.6.1-alpha.2 fallback（Phase 0 后的 blueprints/ 目录可能含新组合模板）
            join(projectRoot, '.openxenon', 'assets', 'blueprints', `${blueprintNameArg}.md`),
            // v0.5 fallback
            join(projectRoot, '.openxenon', 'blueprints', `${blueprintNameArg}.md`),
            join(projectRoot, '.openxenon', 'blueprints', blueprintNameArg, 'blueprint.md'),
          ]
        : []
      const blueprintPath = customBlueprint ? join(projectRoot, customBlueprint) : null
      let absBlueprint: string | null = blueprintPath
      if (!absBlueprint || !existsSync(absBlueprint)) {
        if (customBlueprint) {
          return outputError(
            { code: 'OXN_FILE_NOT_FOUND', message: `blueprint file not found: ${customBlueprint}` },
            format,
          )
        }
        const found = defaultCandidates.find((p) => existsSync(p))
        if (!found) {
          return outputError(
            {
              code: 'OXN_FILE_NOT_FOUND',
              message: `blueprint file not found: tried ${defaultCandidates.join(', ')}`,
              suggestion: 'pass --blueprint-file to point at an existing blueprint',
            },
            format,
          )
        }
        absBlueprint = found
      }
      try {
        const parsed = parseMarkdown(readFileSync(absBlueprint, 'utf-8'))
        const bp = extractBlueprintIR(parsed.tree, parsed.frontmatter)
        if (!bp?.name) {
          return outputError(
            { code: 'OXN_NO_BLUEPRINT', message: `No Blueprint declaration found in ${absBlueprint}` },
            format,
          )
        }
        if ((bp.boundaries ?? []).length === 0) {
          return outputError(
            { code: 'OXN_INVALID_BLUEPRINT', message: `Blueprint "${bp.name}" has no boundaries` },
            format,
          )
        }
        const resolvedBlueprintName = parsePartName(bp.name)
        const boundaries = (bp.boundaries ?? []).map((b) => ({
          name: parsePartName(b.name),
          align: capitalize(parsePartName(b.name)),
        }))
        const outputDir = customOutputDir
          ? join(projectRoot, customOutputDir)
          : join(projectRoot, '.openxenon', 'works', workName)
        if (!force && existsSync(outputDir)) {
          return outputUserInputError('OXN_OUTPUT_DIR_EXISTS', `output directory already exists: ${outputDir}`, {
            suggestion: 'use --force to overwrite, or --output-dir to pick a new location',
            format,
          })
        }
        ensureDirectory(outputDir)
        // v0.5 Phase 3: 主路径由 config.assetFormat 决定
        const workPrimaryPath = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
        const workAltPath = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
        const workPrimaryDir = join(workPrimaryPath, '..')
        const workAltDir = join(workAltPath, '..')
        if (!existsSync(workPrimaryDir)) mkdirSync(workPrimaryDir, { recursive: true })
        if (!existsSync(workAltDir)) mkdirSync(workAltDir, { recursive: true })
        const workFile = workPrimaryPath
        if (!force && existsSync(workFile)) {
          return outputUserInputError(
            'OXN_OUTPUT_FILE_EXISTS',
            `${assetFormat === 'oxn' ? 'work.md' : 'work.md'} already exists in ${outputDir}`,
            {
              suggestion: 'use --force to overwrite',
              format,
            },
          )
        }
        const workContent = renderWorkSkeleton(
          workName,
          resolvedBlueprintName,
          boundaries,
          assetFormat,
          Object.keys(skeletonOptions).length > 0 ? skeletonOptions : undefined,
        )
        writeFileSync(workFile, workContent, 'utf-8')

        // v0.5 Phase 3: auto-sync to other format
        // v0.7+：work 实体 workAltPath === workPrimaryPath (work.md)，跳过 alt 写入避免覆盖 MD 内容
        if (autoSync && workPrimaryPath !== workAltPath) {
          try {
            if (assetFormat === 'md') {
              // v0.7.0: .oxn format removed
              const { tree, frontmatter: fm } = parseMarkdown(workContent)
              const ir = extractWorkIR(tree, fm)
              const { serializeWorkToOxn } = await import('@openxenon/engine/oxl/md-pipeline/oxn-serializer')
              const altContent = serializeWorkToOxn(ir)
              writeFileSync(workAltPath, altContent, 'utf-8')
            }
          } catch {
            // autoSync 失败不阻断主命令
          }
        }
        // 🆕 v0.7: work create 自动为 blueprint 每个 boundary 生成 task.md 骨架
        //   避免 work 锁后 run 报 "task X not found in work Y"。
        //   用户可继续手动 `add-task` 补 task 或 `--force` 覆盖。
        const autoTasks: Array<{ name: string; path: string; status: 'created' | 'exists' }> = []
        for (const boundary of boundaries) {
          const t = writeTaskTemplate(projectRoot, workName, boundary.name, resolvedBlueprintName, '', boundary.name)
          autoTasks.push({
            name: boundary.name,
            path: t.path,
            status: t.written ? 'created' : 'exists',
          })
        }
        return output(
          {
            ok: true,
            data: {
              workName,
              outputDir,
              blueprintPath: absBlueprint,
              blueprint: {
                name: resolvedBlueprintName,
                version: bp.version ?? '',
                boundaryCount: boundaries.length,
                boundaries: boundaries.map((b) => b.name),
              },
              // v0.6.4: 把传入的 Asset refs 回显给用户（便于核对）
              declaredRefs: {
                domains: domainNames.filter(Boolean),
                stacks: stackNames.filter(Boolean),
                blueprint: resolvedBlueprintName,
              },
              files: { work: workFile },
              tasks: autoTasks,
              nextStep:
                `Edit the task files, then run: oxn work run ${workName} --validate-only && oxn work run ${workName}\n` +
                `  Tip: view AssetMap scene for related Assets: oxn assetmap show oxn-system --scene <scene>`,
            },
          },
          format,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return output(errorJson('OXN_DSL_PARSE_FAILED', message), format)
      }
    }

    // 无 blueprint：写 .openxenon/works/<w>/work.md 简化骨架
    // v0.7+：移除 workType 子目录（旧 mvp 路径），统一在 works/<w>/ 下
    const workFileFinal = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
    const workAltFileFinal = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
    const workFileDir = join(workFileFinal, '..')
    if (!existsSync(workFileDir)) mkdirSync(workFileDir, { recursive: true })
    if (existsSync(workFileFinal)) {
      return outputError({ code: 'OXN_WORK_EXISTS', message: t('work.workExists', { workName }) }, format)
    }

    const workOxnContent = renderWorkSkeleton(
      workName,
      'TODO-blueprint',
      [{ name: 'stage-1', align: 'TODO' }],
      assetFormat,
      Object.keys(skeletonOptions).length > 0 ? skeletonOptions : undefined,
    )
    writeFileSync(workFileFinal, workOxnContent, 'utf-8')

    // autoSync
    // v0.7+：work 实体 workAltFileFinal === workFileFinal (work.md)，跳过 alt 写入避免覆盖 MD 内容
    if (autoSync && workFileFinal !== workAltFileFinal) {
      try {
        if (assetFormat === 'md') {
          const { tree, frontmatter: fm } = parseMarkdown(workOxnContent)
          const ir = extractWorkIR(tree, fm)
          const { serializeWorkToOxn } = await import('@openxenon/engine/oxl/md-pipeline/oxn-serializer')
          const altContent = serializeWorkToOxn(ir)
          writeFileSync(workAltFileFinal, altContent, 'utf-8')
        }
      } catch {
        // autoSync 失败不阻断
      }
    }

    return output(
      {
        ok: true,
        data: {
          workId: workName,
          workName,
          path: workFileFinal,
        },
        human: t('work.created', { workName, workFilePath: workFileFinal }),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: validate
// ---------------------------------------------------------------------------
// Subcommand: add-task (Phase 1: P1 守卫 + 写 task.md)
// ---------------------------------------------------------------------------
const addTaskSubcommand = defineCommand({
  meta: {
    name: 'add-task',
    description: t('work.addTask.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', required: true, description: t('work.addTask.args.taskName') },
    blueprint: {
      type: 'string',
      required: true,
      description: t('work.addTask.args.blueprint'),
    },
    domain: { type: 'string', description: t('work.addTask.args.domain') },
    force: { type: 'boolean', alias: 'f', description: t('work.addTask.args.force') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const blueprintName = ctx.args.blueprint as string
    const domainName = (ctx.args.domain as string | undefined) ?? ''
    const force = ctx.args.force === true || ctx.args.f === true
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    const workValidation = validateWorkName(workName)
    if (!workValidation.valid) {
      return outputError(
        { code: 'OXN_INVALID_WORK_NAME', message: t('work.invalidId', { error: workValidation.error }) },
        format,
      )
    }
    const taskValidation = validateTaskName(taskName)
    if (!taskValidation.valid) {
      return outputError(
        { code: 'OXN_INVALID_TASK_NAME', message: t('work.invalidTaskName', { error: taskValidation.error }) },
        format,
      )
    }

    // NV-1: 状态机已启动 → 拒
    if (!isWorkNotStarted(projectRoot, workName)) {
      outputError(
        {
          code: 'OXN_WORK_ALREADY_RUNNING',
          message: t('work.alreadyRunning', { workName }),
          suggestion: t('work.modifyHint'),
        },
        format,
      )
      return
    }

    const workFile = resolveWorkFilePath(projectRoot, workName, assetFormat)
    if (!existsSync(workFile)) {
      return outputError(
        {
          code: 'OXN_WORK_NOT_FOUND',
          message: `work "${workName}" not found at ${workFile}`,
          suggestion: 'create the work first with `oxn work create <name>`',
        },
        format,
      )
    }

    const taskFile = getWorkTaskFile(workName, taskName)
    if (existsSync(taskFile) && !force) {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `task.md already exists at ${taskFile}`, {
        suggestion: 'use --force to overwrite',
        format,
      })
    }

    let allowedBlueprints: string[] = []
    let allowedDomains: string[] = []
    try {
      // v1.1 fix-p1-architecture parseoxn-migration: 改用 Langium AST 提取声明名,
      // 避免 regex 误匹配注释/字符串字面量。v0.5 Phase 3: validateWorkFile 支持 .md
      const validated = await validateWorkFile(workFile)
      if (validated.ok && validated.work) {
        const refs = validated.work.refs ?? []
        allowedBlueprints = refs
          .filter((r) => r.kind === 'blueprint')
          .map((r) => r.name)
          .filter((n): n is string => typeof n === 'string' && n.length > 0)
        allowedDomains = refs
          .filter((r) => r.kind === 'domain')
          .map((r) => r.name)
          .filter((n): n is string => typeof n === 'string' && n.length > 0)
      }
    } catch {
      // 软降级：AST 解析失败时不阻塞 add-task (用户可手动校对)
    }

    if (allowedBlueprints.length > 0 && !allowedBlueprints.includes(blueprintName)) {
      return outputError(
        {
          code: 'OXN_BLUEPRINT_NOT_IN_WORK',
          message: `blueprint "${blueprintName}" not declared in work "${workName}" (allowed: ${allowedBlueprints.join(', ')})`,
          suggestion: `add 'blueprint "${blueprintName}" ref "...";' to ${workFile}`,
        },
        format,
      )
    }

    if (domainName && allowedDomains.length > 0 && !allowedDomains.includes(domainName)) {
      return outputError(
        {
          code: 'OXN_DOMAIN_NOT_IN_WORK',
          message: `domain "${domainName}" not declared in work "${workName}" (allowed: ${allowedDomains.join(', ')})`,
          suggestion: `add 'domain "${domainName}" ref "...";' to ${workFile}`,
        },
        format,
      )
    }

    const writeResult = writeTaskTemplate(getProjectRoot(), workName, taskName, blueprintName, domainName)
    if (!writeResult.written && writeResult.reason === 'exists') {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `task.md already exists at ${taskFile}`, {
        suggestion: 'use --force to overwrite',
        format,
      })
    }

    output(
      {
        ok: true,
        data: {
          workName,
          taskName,
          blueprint: blueprintName,
          domain: domainName,
          path: taskFile,
        },
        human: `Created task ${taskName} in work ${workName} at ${taskFile}\nBlueprint: ${blueprintName}\nDomain: ${domainName || '(none)'}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: list-task
// ---------------------------------------------------------------------------
const listTaskSubcommand = defineCommand({
  meta: { name: 'list-task', description: t('work.listTask.description') },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const tasksDir = getTasksDir(getProjectRoot(), workName)

    if (!existsSync(tasksDir)) {
      output(
        {
          ok: true,
          data: { tasks: [] },
          human: `No tasks in work "${workName}". Run \`oxn work add-task <name> --task <t> --blueprint <bp>\` to create one.`,
        },
        format,
      )
      return
    }

    const dirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const tasks = dirs
      .map((name) => {
        const file = join(tasksDir, name, TASK_OXN_FILE)
        if (!existsSync(file)) return null
        const data = readTaskFile(file)
        if (!data) return null
        return {
          name,
          file,
          blueprint: data.blueprint,
          domain: data.domain,
        }
      })
      .filter((t) => t !== null)

    output(
      {
        ok: true,
        data: { tasks },
        human:
          tasks.length > 0
            ? `Tasks in work "${workName}":\n${tasks.map((t) => `  - ${t.name} (blueprint: ${t.blueprint ?? '?'}, domain: ${t.domain ?? 'none'})\n    Path: ${t.file}`).join('\n')}`
            : `No tasks in work "${workName}".`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: task-status
// ---------------------------------------------------------------------------
const taskStatusSubcommand = defineCommand({
  meta: { name: 'task-status', description: t('work.taskStatus.description') },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', required: true, description: t('work.args.taskName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const taskFile = getWorkTaskFile(workName, taskName)

    if (!existsSync(taskFile)) {
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task.md not found at ${taskFile}` }, format)
    }

    const data = readTaskFile(taskFile)
    const blueprint = data?.blueprint
    const domain = data?.domain
    const parsedName = data?.name

    output(
      {
        ok: true,
        data: {
          workName,
          taskName: parsedName ?? taskName,
          blueprint,
          domain,
          file: taskFile,
        },
        human: `Task ${taskName} (work: ${workName})
  Blueprint: ${blueprint ?? '(none)'}
  Domain:    ${domain ?? '(none)'}
  File:      ${taskFile}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: verify-task-path — 提交手写后的 task.md 路径验证
// ---------------------------------------------------------------------------
const verifyTaskPathSubcommand = defineCommand({
  meta: { name: 'verify-task-path', description: t('work.verifyTaskPath.description') },
  args: {
    work: { type: 'string', required: true, description: t('work.args.workName') },
    path: { type: 'positional', required: true, description: t('work.verifyTaskPath.args.filePath') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.work as string
    let filePath = ctx.args.path as string

    // Resolve to absolute
    if (!filePath.startsWith('/')) {
      filePath = join(getProjectRoot(), filePath)
    }

    // 1) 文件存在？
    if (!existsSync(filePath)) {
      return outputError({ code: 'OXN_PATH_NOT_FOUND', message: t('oxnCompile.notFound', { path: filePath }) }, format)
    }

    // 2) 文件名必须是 task.md？
    const basename = filePath.split('/').pop()
    if (basename !== TASK_OXN_FILE) {
      return outputError(
        { code: 'OXN_INVALID_TASK_FILE', message: t('work.invalidTaskFile', { taskOxnFile: TASK_OXN_FILE, basename }) },
        format,
      )
    }

    // 3) 属于指定 work 的 tasks 目录？
    const expectedDir = getTasksDir(getProjectRoot(), workName)
    const parentDir = filePath.split('/').slice(0, -1).join('/')
    if (!parentDir.startsWith(expectedDir)) {
      return outputError(
        {
          code: 'OXN_PATH_NOT_IN_WORK',
          message: t('work.pathNotInWork', { workName, expectedDir, parentDir }),
        },
        format,
      )
    }

    // 4) 解析基本信息
    const data = readTaskFile(filePath)
    const taskName = data?.name ?? '(unknown)'
    const blueprint = data?.blueprint
    const domain = data?.domain
    const partCount = data?.parts.length ?? 0

    const taskDirName = filePath.split('/').slice(-2, -1)[0]

    output(
      {
        ok: true,
        data: {
          workName,
          path: filePath,
          taskName,
          taskDirName,
          blueprint,
          domain,
          partCount,
        },
        human: t('work.verifyTaskPath.passed', {
          workName,
          taskName,
          taskDirName,
          blueprint: blueprint ?? '(none)',
          domain: domain ?? '(none)',
          partCount,
          filePath,
        }),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: edit-task (Phase 1: P1 守卫)
// ---------------------------------------------------------------------------
const editTaskSubcommand = defineCommand({
  meta: { name: 'edit-task', description: t('work.editTask.description') },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', required: true, description: t('work.args.taskName') },
    objective: { type: 'string', description: t('work.editTask.args.objective') },
    'add-constraint': { type: 'string', description: t('work.editTask.args.constraint') },
    'add-domain': { type: 'string', description: t('work.editTask.args.domain') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const newObjective = ctx.args.objective as string | undefined
    const addConstraint = (ctx.args['add-constraint'] as string | undefined) ?? ''
    const addDomain = (ctx.args['add-domain'] as string | undefined) ?? ''
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)

    // NV-1: 状态机已启动 → 拒
    if (!isWorkNotStarted(projectRoot, workName)) {
      outputError(
        {
          code: 'OXN_WORK_ALREADY_RUNNING',
          message: t('work.alreadyRunning', { workName }),
          suggestion: t('work.modifyHint'),
        },
        format,
      )
      return
    }

    const taskFile = getWorkTaskFile(workName, taskName)
    if (!existsSync(taskFile)) {
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task.md not found at ${taskFile}` }, format)
    }
    let content = readFileSync(taskFile, 'utf-8')

    const ensureRefs = (c: string): string => {
      if (/^## Refs/m.test(c)) return c
      return `${c.replace(/\n+$/, '')}\n\n## Refs\n`
    }
    const setRef = (c: string, key: string, value: string): string => {
      c = ensureRefs(c)
      const re = new RegExp(`^- ${key}:.*$`, 'm')
      if (re.test(c)) return c.replace(re, `- ${key}: ${value}`)
      return c.replace(/(## Refs\n)/, `$1- ${key}: ${value}\n`)
    }
    const appendRef = (c: string, key: string, value: string): string => {
      c = ensureRefs(c)
      return c.replace(/(## Refs\n)/, `$1- ${key}: ${value}\n`)
    }

    if (newObjective !== undefined) {
      content = setRef(content, 'objective', `"${newObjective.replace(/"/g, '\\"')}"`)
    }

    if (addConstraint) {
      content = appendRef(content, 'constraint', `"${addConstraint.replace(/"/g, '\\"')}"`)
    }

    if (addDomain) {
      const workFile = resolveWorkFilePath(projectRoot, workName, assetFormat)
      if (existsSync(workFile)) {
        // v0.5 Phase 3: .md 走 md-pipeline 反向序列化, 然后正则提取 domain 声明
        let workContent = readFileSync(workFile, 'utf-8')
        if (workFile.endsWith('.md')) {
          try {
            const parsed = parseMarkdown(workContent)
            const ir = extractWorkIR(parsed.tree, parsed.frontmatter)
            workContent = serializeWorkToOxn(ir)
          } catch {
            // 软降级: 仍用原文正则
          }
        }
        const allowed = Array.from(workContent.matchAll(/domain\s+"([^"]+)"/g)).map((m) => m[1]!)
        if (allowed.length > 0 && !allowed.includes(addDomain)) {
          return outputError(
            {
              code: 'OXN_DOMAIN_NOT_IN_WORK',
              message: `domain "${addDomain}" not declared in work "${workName}" (allowed: ${allowed.join(', ')})`,
              suggestion: `add 'domain "${addDomain}" ref "...";' to ${workFile}`,
            },
            format,
          )
        }
      }
      content = setRef(content, 'domain', addDomain)
    }

    writeFileSync(taskFile, content, 'utf-8')
    output(
      { ok: true, data: { workName, taskName, file: taskFile, edited: true }, human: `Edited task.md at ${taskFile}` },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: delete-task (Phase 1: P1 守卫)
// ---------------------------------------------------------------------------
const deleteTaskSubcommand = defineCommand({
  meta: { name: 'delete-task', description: t('work.deleteTask.description') },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', required: true, description: t('work.args.taskName') },
    force: { type: 'boolean', alias: 'f', description: t('work.deleteTask.args.force') },
    'keep-state': { type: 'boolean', description: t('work.deleteTask.args.keepTraces') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const force = ctx.args.force === true || ctx.args.f === true
    const keepState = ctx.args['keep-state'] === true
    const projectRoot = getProjectRoot()

    // NV-1: 状态机已启动 → 拒
    if (!isWorkNotStarted(projectRoot, workName)) {
      outputError(
        {
          code: 'OXN_WORK_ALREADY_RUNNING',
          message: t('work.alreadyRunning', { workName }),
          suggestion: t('work.modifyHint'),
        },
        format,
      )
      return
    }

    const taskDir = getWorkTaskDir(workName, taskName)
    if (!existsSync(taskDir)) {
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task directory not found: ${taskDir}` }, format)
    }

    if (!force) {
      return outputError(
        {
          code: 'OXN_CONFIRM_REQUIRED',
          message: `deletion requires --force. pass --force to confirm deletion of ${taskDir}`,
        },
        format,
      )
    }

    if (keepState) {
      const taskOxn = join(taskDir, TASK_OXN_FILE)
      if (existsSync(taskOxn)) {
        unlinkSync(taskOxn)
      }
    } else {
      rmSync(taskDir, { recursive: true, force: true })
    }

    output(
      {
        ok: true,
        data: { workName, taskName, deleted: true, keptState: keepState },
        human: `Deleted task "${taskName}" in work "${workName}"${keepState ? ' (kept state)' : ''}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: run (Phase 2: 启动状态机)
// ---------------------------------------------------------------------------
const runSubcommand = defineCommand({
  meta: {
    name: 'run',
    description: t('work.run.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
    // RFC-0033 D1: --validate-only = 只跑校验不启动状态机（替代原独立 `oxn work validate` 子命令）
    '--validate-only': { type: 'boolean', description: t('work.run.args.validateOnly') },
    // PR-13/PRD: escape hatch — 跳过 Workflow slot DAG 闭合校验（仅 --validate-only 生效）
    '--skip-workflow-dag-check': { type: 'boolean', description: t('work.run.args.skipDagCheck') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)
    const validateOnly = ctx.args['validate-only'] === true
    const skipDagCheck = ctx.args['skip-workflow-dag-check'] === true

    // RFC-0033 D2: 工作目录缺失即报 NOT_FOUND，不再区分 LOCK_NOT_FOUND / WORK_REMOVED（PlanLock 已删）
    const workDir = getWorkDir(projectRoot, workName)
    if (!existsSync(workDir)) {
      const worksRoot = join(projectRoot, BOUNDARY_DIR, 'works')
      const code = existsSync(worksRoot) ? 'OXN_WORK_NOT_FOUND' : 'OXN_NO_PROJECT'
      const message =
        code === 'OXN_WORK_NOT_FOUND'
          ? `work "${workName}" not found at ${workDir}`
          : `works/ directory missing — run \`oxn init\` first or create a work with \`oxn work create ${workName}\``
      const suggestion =
        code === 'OXN_WORK_NOT_FOUND'
          ? `run \`oxn work create ${workName}\` to create it`
          : 'run `oxn init` to initialize the project'
      return outputError({ code, message, suggestion }, format)
    }

    try {
      // RFC-0033 D2: 锁守卫已删；不再校验 .work 文件 / planLock。work.md 可自由修改。

      const filePath = resolveWorkFilePath(projectRoot, workName, assetFormat)
      if (!existsSync(filePath)) {
        return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work file not found at ${filePath}` }, format)
      }
      // v0.5 Phase 3: .md 走 md-pipeline 路径
      const result = await validateWorkFile(filePath)
      if (!result.ok || !result.work) {
        const code = result.errors.some(
          (e) => e.startsWith('[Parser]') || e.startsWith('[Lexer]') || e.includes('parse failed'),
        )
          ? 'OXN_WORK_VALIDATE_FAILED'
          : 'OXN_NO_WORK'
        return outputError({ code, message: result.errors.join('; ') }, format)
      }
      const work = result.work
      const inlineParts = (result.work.tasks ?? []).flatMap((t) => t.parts ?? [])

      // RFC-0033 D1: --validate-only 模式：parse + 校验 + 写 work assets 后退出，不启动状态机
      if (validateOnly) {
        try {
          const missing: string[] = []
          const taskEntries = work.tasks ?? []
          const declaredTaskNames = taskEntries.map((t) => parsePartName(t.name))
          for (const name of declaredTaskNames) {
            if (!existsSync(getTaskOxnPath(projectRoot, workName, name))) {
              missing.push(name)
            }
          }
          if (missing.length > 0) {
            return output(
              errorJson(
                'OXN_TASK_OXN_MISSING',
                `work "${workName}" declares ${declaredTaskNames.length} tasks but ${missing.length} task.md missing: ${missing.join(', ')}`,
                `create them with: oxn work add-task <name> --task <task> --blueprint <bp>`,
              ),
              format,
            )
          }
          const validationResult = await validateAndWriteArtifacts({
            projectRoot,
            workName,
            work,
            missingTaskOxn: missing,
            ...(skipDagCheck ? { skipDagCheck: true } : {}),
          })
          if (!validationResult.ok) {
            return output(
              {
                ok: false,
                data: {
                  code: 'OXN_WORK_REFS_UNRESOLVED',
                  valid: false,
                  unresolved: validationResult.unresolved ?? [],
                  warnings: validationResult.warnings,
                  note: 'validate-only failed: refs unresolved',
                },
                human:
                  `Work validate FAILED (--validate-only)\n` +
                  `  Unresolved refs: ${(validationResult.unresolved ?? []).length}\n` +
                  (validationResult.unresolved ?? [])
                    .map((u) => `    - ${u.kind} "${u.name}": ${u.reason}`)
                    .join('\n') +
                  (validationResult.warnings.length > 0
                    ? `\n  Warnings: ${validationResult.warnings.join(' | ')}`
                    : ''),
              },
              format,
            )
          }
          const a = validationResult.artifacts!
          return output(
            {
              ok: true,
              data: {
                workName,
                valid: true,
                validateOnly: true,
                warnings: validationResult.warnings,
                ...(validationResult.legacyDomainRefs && validationResult.legacyDomainRefs.length > 0
                  ? { legacyDomainRefs: validationResult.legacyDomainRefs }
                  : {}),
                artifacts: {
                  blueprintsJson: a.blueprintsJsonPath,
                  // 🗑️ RFC-0033 D5: 删 workFile（.work 文件已退役；运行时改读 work.md）
                },
                assetCounts: a.assetCounts,
              },
              human:
                `Work validate OK (--validate-only)\n` +
                `  Blueprint refs: ${a.assetCounts.blueprints} resolved\n` +
                `  Task count:  ${a.assetCounts.tasks}\n` +
                `\n  Artifacts written:\n` +
                `    - ${a.blueprintsJsonPath}` +
                (validationResult.warnings.length > 0
                  ? `\n\n  Warnings: ${validationResult.warnings.join(' | ')}`
                  : ''),
            },
            format,
          )
        } catch (err) {
          if (err instanceof IAPError) {
            const ctx = err.context as { oxnCode?: unknown } | undefined
            const oxnCode = typeof ctx?.oxnCode === 'string' ? ctx.oxnCode : err.name
            return outputError({ code: oxnCode, message: err.message, ...(ctx ? { context: ctx } : {}) }, format)
          }
          throw err
        }
      }

      // 🆕 v0.6.1-alpha.5 Phase A.1: 允许 Round 2+ re-run（state.status=pending/running 时）
      // 只有 state.status ∈ {passed, failed, error}（已收口）时才拒绝（避免重跑已结束 Work）
      if (workStateExists(projectRoot, workName)) {
        const existingState = loadWorkState(projectRoot, workName)
        if (existingState === null) {
          // 状态文件存在但解析失败：罕见错误，回退到原行为
          return output(
            errorJson(
              'OXN_WORK_ALREADY_EXISTS',
              `work "${workName}" already exists`,
              'use `oxn work status <name>` to view',
            ),
            format,
          )
        }
        if (
          existingState.status === 'passed' ||
          existingState.status === 'failed' ||
          existingState.status === 'error'
        ) {
          return output(
            errorJson(
              'OXN_WORK_ALREADY_FINALIZED',
              `work "${workName}" already finalized (status=${existingState.status})`,
              'use `oxn work status <name>` to view; finalized work cannot be re-run',
            ),
            format,
          )
        }
        // Re-run：重置 task 状态（failed / running → pending，passed 保留；RFC-0033 D6 Round 退役）
        resetTasksForReRun(existingState)
        saveWorkState(projectRoot, workName, existingState)
        // 不报错，继续 re-run 流程
      }

      ensureWorkDir(projectRoot, workName)

      const blueprintNames = (work.refs ?? []).filter((r) => r.kind === 'blueprint').map((r) => r.name)
      const domainNames = (work.refs ?? []).filter((r) => r.kind === 'domain').map((r) => r.name)
      const taskEntries = work.tasks ?? []
      const declaredTaskNames = taskEntries.map((t) => parsePartName(t.name))

      // 校验 task.md 是否都已建
      const missing: string[] = []
      for (const name of declaredTaskNames) {
        if (!existsSync(getTaskOxnPath(projectRoot, workName, name))) {
          missing.push(name)
        }
      }
      if (missing.length > 0) {
        return output(
          errorJson(
            'OXN_TASK_OXN_MISSING',
            `work "${workName}" declares ${declaredTaskNames.length} tasks but ${missing.length} task.md missing: ${missing.join(', ')}`,
            `create them with: oxn work add-task <name> --task <task> --blueprint <bp>`,
          ),
          format,
        )
      }

      const partSpecs = await buildPartSpecs(work, inlineParts)
      // v0.4.1: loopPolicy 移出 WorkContext, 改读 work.loopPolicy
      const maxIters = (work as { loopPolicy?: { maxIterations?: number } }).loopPolicy?.maxIterations ?? 3

      // PR-14c: 收集未解析的 ref diagnostics，持久化到 .run/state.json
      // 🆕 v0.6.1-alpha.4 Phase B: 删除 domain ref 诊断（Domain 引用走 Blueprint ## Use）
      const runDiagnostics: RefDiagnostic[] = []
      for (const r of work.refs ?? []) {
        if (r.kind !== 'blueprint') continue
        if (!resolveBlueprintFile(r.ref ?? null, r.name, projectRoot)) {
          const reason = r.ref?.startsWith('@oxn/')
            ? '@oxn/ scope has no builtin blueprint registry (V1)'
            : `blueprint file not found for ref "${r.ref ?? r.name}"`
          runDiagnostics.push(buildBlueprintDiagnostic(r.name, r.ref ?? null, reason))
        }
      }
      // 持久化时只接受 'warn' severity（state.json schema 锁死；'error' 仅用于 in-flight）
      const persistedDiagnostics = runDiagnostics.map((d) => ({ ...d, severity: 'warn' as const }))

      const workspace = runWork({
        projectRoot,
        workName,
        blueprintNames,
        domainNames,
        tasks: taskEntries.map((t) => {
          const tBlueprint = t.blueprint ?? ''
          return {
            taskName: parsePartName(t.name),
            blueprint: tBlueprint ?? blueprintNames[0] ?? '',
            injects: [],
          }
        }),
        goal: work.context?.goal,
        constraints: work.context?.constraints,
        maxIterations: maxIters,
        ...(persistedDiagnostics.length > 0 ? { diagnostics: persistedDiagnostics } : {}),
      })

      for (const taskName of declaredTaskNames) {
        const taskOxnPath = getTaskOxnPath(projectRoot, workName, taskName)
        const data = readTaskFile(taskOxnPath)
        const blueprint = data?.blueprint ?? blueprintNames[0] ?? ''
        const injects: string[] = []
        const slotNames = data?.parts.map((p) => p.name) ?? []
        const objective = data?.parts[0]?.skillContext
        const constraints: string[] = []

        runTask({
          projectRoot,
          workName,
          taskName,
          blueprint,
          injects,
          partNames: slotNames,
          objective,
          constraints,
        })
      }

      const legacyState: DerivedWorkState = {
        workName,
        status: 'running',
        currentPart: partSpecs[0]?.partName ?? null,
        completedParts: [],
        loopMeta: { currentIteration: 0, maxIterations: maxIters },
        frozenPath: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        skillContext: snapshotContext(
          work.context,
          maxIters,
          (work as { loopPolicy?: { maxIterations?: number } }).loopPolicy,
        ),
        partSpecs: partSpecs as DerivedWorkState['partSpecs'],
        partExecutions: partSpecs.map((p) => ({
          partName: p.partName,
          align: p.align,
          status: 'pending' as const,
          probes: [],
        })),
      }
      // 写入 legacy state.json（work.ts 兼容层）— 实际上 work.ts 不再需要该文件
      // 但 status / makeReport 仍从 WorkState 派生
      void legacyState

      output(
        {
          ok: true,
          data: {
            ...makeReport(legacyState),
            tasks: declaredTaskNames.map((name) => {
              const ts = loadTaskState(projectRoot, workName, name)
              return {
                taskName: name,
                status: ts?.status ?? 'pending',
                currentPart: ts?.currentPart ?? null,
                completedParts: ts?.completedParts ?? [],
                partCount: ts?.partExecutions.length ?? 0,
              }
            }),
            workspace,
            diagnostics: runDiagnostics,
          },
        },
        format,
      )
    } catch (err) {
      if (err instanceof IAPError) {
        const ctx = err.context as { oxnCode?: unknown } | undefined
        const oxnCode = typeof ctx?.oxnCode === 'string' ? ctx.oxnCode : err.name
        return outputError({ code: oxnCode, message: err.message }, format)
      }
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_DSL_PARSE_FAILED', message), format)
    }
  },
})

// ---------------------------------------------------------------------------
// Subcommand: submit (Phase 2: 推进 task 内 part)
// ---------------------------------------------------------------------------
//
// RFC-0033 D3/D4 submit 扩展：
//   1. submitTask 完成后调 hashWorkPlan 算 workMdHash（完成指纹）
//   2. 读 trace.jsonl 找上次 SUBMIT 事件的 workMdHash
//   3. 不一致 → append ASSET_DRIFT 事件（不阻断 submit）
//   4. append SUBMIT 事件（带 workMdHash + probeResult）
const submitSubcommand = defineCommand({
  meta: {
    name: 'submit',
    description: t('work.submit.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', required: true, description: t('work.args.taskName') },
    '--evidence': { type: 'string', description: t('work.submit.args.evidence') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const projectRoot = getProjectRoot()

    // NV-2: 状态机未启动 → 拒
    if (!isWorkStarted(projectRoot, workName)) {
      outputError(
        {
          code: 'OXN_WORK_NOT_STARTED',
          message: t('work.notStarted', { workName }),
          suggestion: t('work.notStartedHint'),
        },
        format,
      )
      return
    }

    try {
      const result = submitTask({
        projectRoot,
        workName,
        taskName,
      })

      // RFC-0033 D3/D4: submit 时算 workMdHash + DRIFT 检测 + append SUBMIT 事件
      const workMdHash = hashWorkPlan(projectRoot, workName).workMdHash
      const previousHash = workMdHash !== null ? readLastSubmitWorkMdHash(projectRoot, workName) : null
      let submitIndex = readSubmitIndex(projectRoot, workName) + 1
      let driftDetected = false
      if (workMdHash !== null && previousHash !== null && previousHash !== workMdHash) {
        // 漂移可观测不阻断：append ASSET_DRIFT 事件
        appendWorkTrace(projectRoot, workName, {
          event: 'ASSET_DRIFT',
          workName,
          component: 'workMd',
          previousHash,
          currentHash: workMdHash,
          submitIndex,
        })
        driftDetected = true
      }

      // 决定本次 SUBMIT 事件的 submitIndex（已写 ASSET_DRIFT 时用新计数，否则 +1）
      // 注：上面读到的 submitIndex 是漂移前的计数；写完 DRIFT 后 SUBMIT 沿用同一 submitIndex（即"这次 submit 检测到漂移"）
      // 简化：submitIndex 在 append SUBMIT 后递增，DRIFT 用 current submitIndex（同一个）
      const probeResult: 'COMPLETED' | 'DEVIATED' = result.status === 'passed' ? 'COMPLETED' : 'DEVIATED'
      const partName = result.nextPart ?? result.taskState.completedParts.at(-1) ?? 'unknown'
      if (workMdHash !== null) {
        appendWorkTrace(projectRoot, workName, {
          event: 'SUBMIT',
          workName,
          taskName,
          partName,
          probeResult,
          workMdHash,
        })
        submitIndex = readSubmitIndex(projectRoot, workName) // 重读以反映已追加
      }

      const probeResults: Array<{
        probe: string
        passed: boolean
        output?: unknown
        durationMs?: number
      }> = result.probeResults.map((p) => ({
        probe: p.probe,
        passed: p.passed,
        ...(p.output !== undefined ? { output: p.output } : {}),
        ...(p.durationMs !== undefined ? { durationMs: p.durationMs } : {}),
      }))

      const taskFrozenPath = result.frozen
        ? join(projectRoot, BOUNDARY_DIR, 'works', workName, RUN_DIR, 'tasks', taskName, 'frozen.json')
        : null

      const workFrozenPath =
        loadWorkState(projectRoot, workName)?.status === 'passed'
          ? join(projectRoot, BOUNDARY_DIR, 'works', workName, RUN_DIR, 'frozen.json')
          : null

      output(
        {
          ok: true,
          data: {
            workName,
            taskName,
            taskStatus: result.status,
            nextPart: result.nextPart,
            completedParts: result.taskState.completedParts,
            probeResults,
            taskFrozen: taskFrozenPath,
            workFrozen: workFrozenPath,
            workspaceStatus: loadWorkState(projectRoot, workName)?.status ?? 'pending',
            // RFC-0033 D4: 漂移可观测字段
            ...(workMdHash !== null ? { workMdHash } : {}),
            ...(driftDetected ? { drift: { component: 'workMd', previousHash, currentHash: workMdHash } } : {}),
          },
        },
        format,
      )
    } catch (err) {
      if (err instanceof IAPError) {
        const ctx = err.context as { oxnCode?: unknown } | undefined
        const oxnCode = typeof ctx?.oxnCode === 'string' ? ctx.oxnCode : err.name
        return outputError({ code: oxnCode, message: err.message }, format)
      }
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_LEADER_NEXT_FAILED', message), format)
    }
  },
})

// =============================================================================
// RFC-0033 D4 helpers：读 trace.jsonl 上次 SUBMIT hash + submit 计数
// =============================================================================

/**
 * 逆序读 trace.jsonl 找最后一条 SUBMIT 事件的 workMdHash。
 * 返回 null 表示首次 submit 或 trace 缺失。
 */
function readLastSubmitWorkMdHash(projectRoot: string, workName: string): string | null {
  const tracePath = join(projectRoot, BOUNDARY_DIR, 'works', workName, RUN_DIR, 'trace.jsonl')
  if (!existsSync(tracePath)) return null
  let content: string
  try {
    content = readFileSync(tracePath, 'utf-8')
  } catch {
    return null
  }
  const lines = content.split('\n').filter((l) => l.trim())
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]!) as Record<string, unknown>
      if (obj.event === 'SUBMIT' && typeof obj.workMdHash === 'string') {
        return obj.workMdHash
      }
    } catch {
      // skip malformed line
    }
  }
  return null
}

/**
 * 数 trace.jsonl 中 SUBMIT 事件总数（含本次即将追加的）。
 */
function readSubmitIndex(projectRoot: string, workName: string): number {
  const tracePath = join(projectRoot, BOUNDARY_DIR, 'works', workName, RUN_DIR, 'trace.jsonl')
  if (!existsSync(tracePath)) return 0
  let content: string
  try {
    content = readFileSync(tracePath, 'utf-8')
  } catch {
    return 0
  }
  let count = 0
  for (const line of content.split('\n')) {
    if (!line.trim()) continue
    try {
      const obj = JSON.parse(line) as Record<string, unknown>
      if (obj.event === 'SUBMIT') count++
    } catch {
      // skip
    }
  }
  return count
}

// ---------------------------------------------------------------------------
// Subcommand: inject (v0.7+ Blueprint Context Template)
// ---------------------------------------------------------------------------
// 3-flag 注入：--paths / --context / --memory
//   - --paths：返回 Work 三件套路径（轻量 JSON）
//   - --context：输出 context.md 内容（Markdown）
//   - --memory：输出 memory.md 内容（Markdown；Phase 2 前返回 null）
//   - --task <name>：限定到指定 task（同样 3-flag 适用）
//
// 设计：design-blueprint-context-template Draft（2026-08-06 grilling）
// ---------------------------------------------------------------------------
const injectSubcommand = defineCommand({
  meta: {
    name: 'inject',
    description: 'Inject Work/Task Context (3-flag: --paths/--context/--memory)',
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', description: 'Limit to specified task' },
    paths: { type: 'boolean', description: 'Return three-piece set file paths (JSON)' },
    context: { type: 'boolean', description: 'Output context.md content (Markdown)' },
    memory: { type: 'boolean', description: 'Output memory.md content (Markdown; Phase 2 returns null)' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string | undefined
    const wantPaths = ctx.args.paths === true
    const wantContext = ctx.args.context === true
    const wantMemory = ctx.args.memory === true
    const projectRoot = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    // 至少需要一个 flag
    if (!wantPaths && !wantContext && !wantMemory) {
      return outputError(
        {
          code: 'OXN_CLI_INPUT_ERROR',
          message: 'inject requires at least one of --paths / --context / --memory',
          suggestion: 'Run `oxn work inject <name> --paths` to get file paths, or `--context` for Work Context.',
        },
        format,
      )
    }

    const workDir = getWorkDir(projectRoot, workName)
    if (!existsSync(workDir)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work "${workName}" not found at ${workDir}` }, format)
    }

    // Task 模式：限定到 tasks/<t>/
    if (taskName) {
      const taskDir = join(workDir, 'tasks', taskName)
      if (!existsSync(taskDir)) {
        return outputError(
          { code: 'OXN_TASK_NOT_FOUND', message: `task "${taskName}" not found in work "${workName}"` },
          format,
        )
      }

      if (wantPaths) {
        const paths = {
          task_md: relative(projectRoot, join(taskDir, 'task.md')),
          context_md: relative(projectRoot, join(taskDir, 'context.md')),
          memory_md: relative(projectRoot, join(taskDir, 'memory.md')),
        }
        return output({ ok: true, data: paths, human: JSON.stringify(paths, null, 2) }, format)
      }
      if (wantContext) {
        const ctxPath = join(taskDir, 'context.md')
        if (!existsSync(ctxPath)) {
          return outputError(
            { code: 'OXN_INTENT_CONTEXT_MISSING', message: `task "${taskName}" context.md not found at ${ctxPath}` },
            format,
          )
        }
        const content = readFileSync(ctxPath, 'utf-8')
        return output({ ok: true, data: { content }, human: content }, format)
      }
      if (wantMemory) {
        const memPath = join(taskDir, 'memory.md')
        if (!existsSync(memPath)) {
          return output(
            { ok: true, data: { content: null }, human: '(memory.md not yet implemented — Phase 2)' },
            format,
          )
        }
        const content = readFileSync(memPath, 'utf-8')
        return output({ ok: true, data: { content }, human: content }, format)
      }
      return // unreachable
    }

    // Work 模式
    if (wantPaths) {
      const paths = {
        work_md: relative(projectRoot, join(workDir, 'work.md')),
        context_md: relative(projectRoot, join(workDir, 'context.md')),
        memory_md: relative(projectRoot, join(workDir, 'memory.md')),
        tasks: listTaskDirs(workDir).map((t) => ({
          name: t,
          task_md: relative(projectRoot, join(workDir, 'tasks', t, 'task.md')),
          context_md: relative(projectRoot, join(workDir, 'tasks', t, 'context.md')),
          memory_md: relative(projectRoot, join(workDir, 'tasks', t, 'memory.md')),
        })),
      }
      return output({ ok: true, data: paths, human: JSON.stringify(paths, null, 2) }, format)
    }
    if (wantContext) {
      const ctxPath = join(workDir, 'context.md')
      if (!existsSync(ctxPath)) {
        return outputError(
          { code: 'OXN_INTENT_CONTEXT_MISSING', message: `work "${workName}" context.md not found at ${ctxPath}` },
          format,
        )
      }
      const content = readFileSync(ctxPath, 'utf-8')
      return output({ ok: true, data: { content }, human: content }, format)
    }
    if (wantMemory) {
      const memPath = join(workDir, 'memory.md')
      if (!existsSync(memPath)) {
        return output({ ok: true, data: { content: null }, human: '(memory.md not yet implemented — Phase 2)' }, format)
      }
      const content = readFileSync(memPath, 'utf-8')
      return output({ ok: true, data: { content }, human: content }, format)
    }
    return // unreachable
  },
})

/**
 * 列出 work 下所有 task 目录名（按字母序）。
 */
function listTaskDirs(workDir: string): string[] {
  const tasksDir = join(workDir, 'tasks')
  if (!existsSync(tasksDir)) return []
  try {
    return readdirSync(tasksDir)
      .filter((name) => {
        if (name.startsWith('.')) return false
        try {
          return statSync(join(tasksDir, name)).isDirectory()
        } catch {
          return false
        }
      })
      .sort()
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Subcommand: status
// ---------------------------------------------------------------------------
const statusSubcommand = defineCommand({
  meta: { name: 'status', description: t('work.status.description') },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()
    try {
      // RFC-0033 D5: status 是观察者；以 work.md（运行时读 ## Use）作为 work 是否存在的真源；
      // .work 文件仅作为 assets 快照（向后兼容），存在与否不影响 status。
      const config = readProjectConfig(projectRoot)
      const assetFormat = resolveAssetFormat(config)
      const workMdPath = resolveWorkFilePath(projectRoot, workName, assetFormat)
      if (!existsSync(workMdPath)) {
        return outputError(
          { code: 'OXN_WORK_NOT_FOUND', message: `work "${workName}" not found at ${workMdPath}` },
          format,
        )
      }
      const birthCert = readBirthCert(projectRoot, workName)
      // birthCert 仅作为旧 .work 文件读取（向后兼容）；本状态输出不以 planLock 为准
      void birthCert
      const workspace = loadWorkState(projectRoot, workName)
      if (!workspace) {
        // .work 存在但 .run/state.json 缺失：work 还没跑过（RFC-0033 D5/D6：不再报 planLock 状态）
        return output(
          {
            ok: true,
            data: {
              workName,
              workspace: null,
              note: 'work created but not yet run; .run/state.json missing',
            },
          },
          format,
        )
      }
      const taskBreakdown = workspace.tasks.map((idx) => {
        const ts = loadTaskState(projectRoot, workName, idx.taskName)
        return {
          taskName: idx.taskName,
          blueprint: idx.blueprint,
          injects: idx.injects,
          status: ts?.status ?? idx.status,
          currentPart: ts?.currentPart ?? null,
          completedParts: ts?.completedParts ?? [],
          partCount: ts?.partExecutions.length ?? 0,
          startedAt: ts?.createdAt ?? idx.startedAt,
          completedAt: ts?.status === 'passed' ? ts.updatedAt : idx.completedAt,
        }
      })

      // 派生 legacy WorkState 用于 makeReport
      const derivedState: DerivedWorkState = {
        workName,
        status: workspace.status,
        currentPart: null,
        completedParts: taskBreakdown.flatMap((t) => t.completedParts),
        loopMeta: { currentIteration: 0, maxIterations: workspace.skillContext?.maxIterations ?? 3 },
        frozenPath: null,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        skillContext: workspace.skillContext
          ? {
              overallGoal: workspace.skillContext.overallGoal,
              constraints: workspace.skillContext.constraints,
              maxIterations: workspace.skillContext.maxIterations,
            }
          : { overallGoal: '', constraints: [], maxIterations: 3 },
        partSpecs: taskBreakdown.map((t) => ({
          partName: t.taskName,
          align: t.taskName,
          skill: { lifecycle: 'code', objective: '', acceptance: [] },
        })),
        partExecutions: taskBreakdown.map((t) => ({
          partName: t.taskName,
          align: t.taskName,
          status: t.status,
          probes: [],
        })),
      }

      const report = makeReport(derivedState)

      // 🗑️ RFC-0033 D2: planLock 字段已删（PlanLock 退役，status 输出无锁状态）
      output(
        {
          ok: true,
          data: {
            ...report,
            workspace: {
              status: workspace.status,
              domains: workspace.domains,
              blueprints: workspace.blueprints,
              taskCount: workspace.tasks.length,
            },
            tasks: taskBreakdown,
          },
        },
        format,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_STATUS_FAILED', message), format)
    }
  },
})

// ---------------------------------------------------------------------------
// Subcommand: context
// ---------------------------------------------------------------------------

function camelToKebab(s: string): string {
  return s
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

const contextSubcommand = defineCommand({
  meta: {
    name: 'context',
    description: t('work.context.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', description: t('work.context.args.task') },
    'state-path': { type: 'string', description: t('work.status.args.statePath') },
    'emit-md': { type: 'string', description: t('work.status.args.reportPath') },
    // RFC-0033 D2: --unlock-check 已删（PlanLock 退役，context 不再校验锁状态）
    /** 🆕 v0.7.3 P3 (ADR-0061 §D1+D2 + §5.1 token 预算缓解):
     *  - full (默认): 多 Domain 主/背景视角注入 + 块状 termViews 渲染
     *  - lean: 单 Domain 老路径（向后兼容；skip 背景 domain 加载） */
    'context-mode': {
      type: 'string',
      default: 'full',
      description: t('work.context.args.contextMode'),
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string | undefined
    const statePathArg = ctx.args['state-path'] as string | undefined
    const emitMdPath = ctx.args['emit-md'] as string | undefined
    // 🆕 v0.7.3 P3: contextMode flag (full|lean)
    const rawContextMode = String(ctx.args['context-mode'] ?? 'full')
    const contextMode: 'full' | 'lean' = rawContextMode === 'lean' ? 'lean' : 'full'
    const root = getProjectRoot()
    const config = readProjectConfig(root)
    const assetFormat = resolveAssetFormat(config)

    const workFile = resolveWorkFilePath(root, workName, assetFormat)

    // 🗑️ RFC-0033 D2: 锁守卫已删（PlanLock 整体退役，context 直接读 work.md）
    // 旧逻辑：planLock === null → OXN_ALIGN_LOCK_NOT_FOUND；hash mismatch → OXN_ALIGN_LOCK_HASH_MISMATCH

    if (!existsSync(workFile)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work "${workName}" not found at ${workFile}` }, format)
    }
    // v0.5 Phase 3: .md 走 md-pipeline 路径 (parseMarkdown → extractWorkIR)
    //   然后用 readWorkFileFromText 在合成的 oxn 文本上做正则摘要。
    //   MD 合成失败（legacy .oxn 工作流: 无 frontmatter name）→ 回退直读 oxn（RFC D11 fallback）
    let work: WorkFileSummary | null = null
    if (workFile.endsWith('.md')) {
      try {
        const content = readTextFile(workFile)
        const parsed = parseMarkdown(content)
        const ir = extractWorkIR(parsed.tree, parsed.frontmatter)
        const synthesizedOxn = serializeWorkToOxn(ir)
        work = readWorkFileFromText(synthesizedOxn, workFile)
      } catch {
        work = null
      }
    }
    if (!work) {
      work = readWorkFile(workFile)
    }
    if (!work) {
      return outputError({ code: 'OXN_DSL_PARVE_FAILED', message: `Failed to parse ${workFile}` }, format)
    }

    // PR-14b: 扫描未解析的 domain/blueprint ref，作为软警告返回
    const diagnostics: RefDiagnostic[] = collectUnresolvedRefDiagnostics(work, root)

    if (taskName) {
      const task = work.tasks.find((t) => t.name === taskName)
      let taskDomain: string | undefined = task?.domain
      let taskBlueprint: string | undefined = task?.blueprint
      let taskParts: Array<{
        name: string
        skillContext?: string
        probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
      }> = []
      let taskDeps: string[] = task?.deps ?? []

      const taskFile = getTaskOxnPath(root, workName, taskName)
      if (existsSync(taskFile)) {
        const taskFileData = readTaskFile(taskFile)
        if (taskFileData) {
          taskDomain = taskDomain ?? taskFileData.domain
          taskBlueprint = taskBlueprint ?? taskFileData.blueprint
          taskParts = taskFileData.parts
          taskDeps = taskFileData.deps.length > 0 ? taskFileData.deps : taskDeps
        }
      }

      const injectedDomains: Array<{
        name: string
        data: NonNullable<DomainFileSummary>
        role: 'main' | 'background'
      }> = []
      if (taskDomain) {
        // 🆕 v0.7.3 P3: 用 findBoundaryAssetFile 而非硬编码 .openxenon/domains/
        //   - 旧 path 只命中 .archived 或老布局；新 path 优先 .openxenon/assets/domains/
        const filePath = findBoundaryAssetFile(root, 'domain', taskDomain)
        if (filePath) {
          const domData = readDomainFile(filePath)
          if (domData) {
            injectedDomains.push({ name: taskDomain, data: domData, role: 'main' })
          }
        }
      }

      // 🆕 v0.7.3 P3: full mode 加载 background Domain languages + 聚合 termViews
      let termViews: TermView[] = []
      let backgroundDomainNames: string[] = []
      let stackTools: StackToolInfo[] = [] // 🆕 v0.7.3 P6 (ADR-0061 §D5)
      const mainLang = injectedDomains[0]?.data.language ?? null

      if (contextMode === 'full') {
        const perWorkBpIdx = loadPerWorkBlueprints(root, workName)
        const blueprintIR = perWorkBpIdx ? summarizeBlueprints(perWorkBpIdx) : null
        const allLoaded = blueprintIR ? loadDomainLanguagesFromBlueprint(blueprintIR, root) : []
        const partition = partitionBackgroundDomains(allLoaded, taskDomain)
        const backgrounds = partition.backgrounds

        for (const bg of backgrounds) {
          if (!bg.language) continue
          injectedDomains.push({
            name: bg.name,
            data: {
              name: bg.name,
              description: '',
              language: bg.language,
            },
            role: 'background',
          })
        }

        const result = buildTermViews(mainLang, backgrounds, { maxBackgroundFull: 3 })
        termViews = result.termViews
        backgroundDomainNames = result.backgroundDomains

        // 🆕 v0.7.3 P6 (ADR-0061 §D5): 加载 StackTool 列表（CLI mirror 与 engine 对齐）
        stackTools = blueprintIR ? loadStackToolsFromBlueprint(blueprintIR, root) : []
      }

      const allowedTerms: Array<{ name: string; desc: string }> = []
      const banned: string[] = []
      const invariants: string[] = []
      for (const { data } of injectedDomains) {
        if (data.language) {
          allowedTerms.push(...data.language.terms)
          banned.push(...data.language.ban)
          invariants.push(...data.language.invariant)
        }
      }

      const statePath = statePathArg ?? getTaskStatePath(root, workName, taskName)
      let currentFocus: string | null = taskParts[0]?.name ?? null
      let taskStatus = 'pending'
      if (existsSync(statePath)) {
        try {
          const state = JSON.parse(readFileSync(statePath, 'utf-8'))
          if (state.currentPart) currentFocus = state.currentPart
          if (state.status) taskStatus = state.status
        } catch {
          // ignore
        }
      }

      const context = {
        workspace: workName,
        task: taskName,
        blueprint: taskBlueprint,
        currentPart: currentFocus,
        taskStatus,
        workContext: {
          overallGoal: work.goal ?? '',
          constraints: work.constraints,
        },
        taskContext: {
          deps: taskDeps,
        },
        injectedDomains: injectedDomains.map(({ name, data, role }) => ({
          name,
          role,
          ...(data.description ? { description: data.description } : {}),
          ...(data.language
            ? {
                language: {
                  terms: data.language.terms,
                  ban: data.language.ban,
                  invariant: data.language.invariant,
                },
              }
            : {}),
        })),
        allowedLanguage: {
          mustUseTerms: allowedTerms,
          banned,
          invariants,
          ...(contextMode === 'full' && termViews.length > 0
            ? {
                termViews,
                mainDomain: taskDomain,
                backgroundDomains: backgroundDomainNames,
                contextMode: 'full' as const,
              }
            : contextMode === 'lean'
              ? { contextMode: 'lean' as const }
              : {}),
        },
        taskParts,
        isolationNotice: t('work.isolationNotice'),
        // 🗑️ RFC-0033 D2: lockHealth 字段已删（PlanLock 退役，context 不再校验锁状态）
        // 保留字段位置占位以保持向后兼容 schema（status: 'disabled' 表明该字段不再追踪）
        lockHealth: { status: 'disabled', reason: 'planlock retired per RFC-0033 D2' },
        diagnostics,
        ...(stackTools && stackTools.length > 0 ? { stackTools } : {}),
      }

      if (emitMdPath) {
        const md = renderContextHuman(context as Parameters<typeof renderContextHuman>[0])
        writeFileSync(emitMdPath, md, 'utf-8')
      }

      return output(
        {
          ok: true,
          data: context,
          human: renderContextHuman(context as Parameters<typeof renderContextHuman>[0]),
        },
        format,
      )
    }

    // 🆕 External injection: collect Domain externals at Work level (metadata only; AI reads content during Intent)
    const domainExternals: Array<{ domainName: string; externals: NonNullable<DomainFileSummary>['externals'] }> = []
    for (const d of work.domains) {
      const kebab = camelToKebab(d.name)
      const candidates = [
        join(root, BOUNDARY_DIR, 'domains', `${d.name}.md`),
        join(root, BOUNDARY_DIR, 'domains', `${kebab}.md`),
      ]
      for (const path of candidates) {
        const domData = readDomainFile(path)
        if (domData?.externals && domData.externals.length > 0) {
          domainExternals.push({ domainName: d.name, externals: domData.externals })
          break
        }
      }
    }

    // 🆕 v0.7.3 P1 (F1 fix): load per-work blueprints.json → BlueprintIR snapshot
    const perWorkBpIdx = loadPerWorkBlueprints(root, workName)
    const blueprintIR = perWorkBpIdx ? summarizeBlueprints(perWorkBpIdx) : undefined

    // 🆕 v0.7.3 P1 (F2 fix): from Blueprint boundary refs load Domain languages
    const domainLanguages = blueprintIR ? loadDomainLanguagesFromBlueprint(blueprintIR, root) : []

    // 🆕 v0.7.3 P6 (ADR-0061 §D5): from Blueprint.use.stack load StackTool 列表
    const stackTools = blueprintIR ? loadStackToolsFromBlueprint(blueprintIR, root) : []

    const externalsHuman =
      domainExternals.length > 0
        ? `\n  External References (read during Intent):\n${domainExternals
            .map(
              (de) =>
                `    ${de.domainName}:\n${(de.externals ?? [])
                  .map((e) => `      - ${e.name} (${e.kind || 'unknown'}): ${e.path ?? e.url ?? '(no location)'}`)
                  .join('\n')}`,
            )
            .join('\n')}`
        : ''

    return output(
      {
        ok: true,
        data: {
          workspace: workName,
          level: 'work',
          workContext: {
            overallGoal: work.goal ?? '',
            constraints: work.constraints,
          },
          domains: work.domains,
          blueprints: work.blueprints,
          parts: work.parts,
          probes: work.probes,
          tasks: work.tasks,
          diagnostics,
          ...(domainExternals.length > 0 ? { domainExternals } : {}),
          ...(blueprintIR ? { blueprintIR } : {}),
          ...(domainLanguages.length > 0 ? { domainLanguages } : {}),
          ...(stackTools.length > 0 ? { stackTools } : {}),
        },
        human: `Work ${workName} (no --task specified, returning workspace-level context)
  Domains:    ${work.domains.map((d) => d.name).join(', ')}
  Blueprints: ${work.blueprints.map((b) => b.name).join(', ')}
  Parts:      ${work.parts.map((p) => p.name).join(', ')}
  Probes:     ${work.probes.map((p) => p.name).join(', ')}
  Tasks:      ${work.tasks.length}${externalsHuman}
  ${t('work.context.taskLevelHint')}${diagnostics.length > 0 ? `\n  ⚠ Diagnostics: ${diagnostics.length} unresolved ref(s)\n${diagnostics.map((d) => `    - [${d.type}] ${d.ref}: ${d.message}`).join('\n')}` : ''}`,
      },
      format,
    )
  },
})

function renderContextHuman(c: {
  workspace: string
  task: string
  blueprint?: string
  currentPart: string | null
  taskStatus: string
  workContext: { overallGoal: string; constraints: string[] }
  taskContext: { deps: string[] }
  injectedDomains: Array<{ name: string; description?: string; language?: unknown; role?: 'main' | 'background' }>
  allowedLanguage: {
    mustUseTerms: Array<{ name: string; desc: string }>
    banned: string[]
    invariants: string[]
    /** 🆕 v0.7.3 P3 (D2): 多视角 term 视图 */
    termViews?: Array<{
      name: string
      views: Array<{ domain: string; desc: string; isMain: boolean; isNameOnly: boolean }>
    }>
    mainDomain?: string
    backgroundDomains?: string[]
    contextMode?: 'full' | 'lean'
  }
  taskParts: Array<{ name: string; skillContext?: string; probes: Array<{ name: string; ref: string }> }>
  isolationNotice: string
  /** 🆕 v0.7.3 P6 (ADR-0061 §D5): Stack tools 列表（CLI mirror 与 engine 对齐） */
  stackTools?: Array<{ name: string; version?: string; command?: string; config?: string; role?: string }>
}): string {
  const lines: string[] = []
  lines.push(`# Context for ${c.workspace} / ${c.task}`)
  lines.push('')
  lines.push(`Blueprint: ${c.blueprint ?? '(none)'}`)
  lines.push(`Current part: ${c.currentPart ?? '(none)'}`)
  lines.push(`Status: ${c.taskStatus}`)
  lines.push('')
  lines.push('## Work-level')
  lines.push(`Goal: ${c.workContext.overallGoal}`)
  if (c.workContext.constraints.length > 0) {
    lines.push('Constraints:')
    for (const x of c.workContext.constraints) lines.push(`  - ${x}`)
  }
  lines.push('')
  lines.push('## Task-level')
  if (c.taskContext.deps.length > 0) {
    lines.push(`Deps: ${c.taskContext.deps.join(', ')}`)
  }
  lines.push('')
  lines.push('## Injected Domains (isolated)')
  for (const d of c.injectedDomains) {
    const roleTag = d.role ? ` [${d.role}]` : ''
    lines.push(`### ${d.name}${roleTag}`)
    if (d.description) lines.push(d.description)
    const lang = d.language as { terms?: Array<{ name: string }> } | undefined
    if (lang?.terms && lang.terms.length > 0) {
      lines.push(`Terms: ${lang.terms.map((t) => t.name).join(', ')}`)
    }
  }
  // 🆕 v0.7.3 P3 (D2): 多视角 ## Allowed Language 块状渲染
  const al = c.allowedLanguage
  const isFullMode = al.contextMode === 'full' && al.termViews && al.termViews.length > 0
  if (isFullMode) {
    lines.push('')
    lines.push('## Allowed Language (multi-view)')
    lines.push(
      `> Main view: \`${al.mainDomain ?? '(unknown)'}\` · Background views: ${(al.backgroundDomains ?? []).map((d) => `\`${d}\``).join(', ') || '(none)'}`,
    )
    lines.push('> Token budget: 前 3 个 background 满注入（同名 term desc），其余仅 term 名列表')
    lines.push('')
    lines.push('### Terms')
    for (const tv of al.termViews ?? []) {
      lines.push(`#### ${tv.name}`)
      for (const v of tv.views) {
        const mainTag = v.isMain ? ' [main]' : ''
        const nameOnlyTag = v.isNameOnly ? ' [name-only]' : ''
        const domainLabel = v.isMain ? `${al.mainDomain ?? 'main'}` : v.domain
        if (v.isNameOnly) {
          lines.push(`- [${domainLabel}${mainTag}${nameOnlyTag}] (no description)`)
        } else {
          lines.push(`- [${domainLabel}${mainTag}] ${v.desc}`)
        }
      }
    }
    if (al.banned.length > 0) {
      lines.push('')
      lines.push('### Bans')
      for (const b of al.banned) lines.push(`- ${b}`)
    }
    if (al.invariants.length > 0) {
      lines.push('')
      lines.push('### Invariants')
      for (const iv of al.invariants) lines.push(`- ${iv}`)
    }
  } else {
    lines.push('')
    if (al.contextMode === 'lean') {
      lines.push('## Allowed Language (lean mode)')
    } else {
      lines.push('## Allowed Language')
    }
    lines.push(`Terms (must use): ${al.mustUseTerms.map((t) => t.name).join(', ') || '(none)'}`)
    if (al.banned.length > 0) {
      lines.push(`Banned:          ${al.banned.join(', ')}`)
    }
    if (al.invariants.length > 0) {
      lines.push('')
      lines.push('## Invariants')
      for (const inv of al.invariants) {
        lines.push(`- ${inv}`)
      }
    }
  }
  lines.push('')
  lines.push(`## ${c.isolationNotice}`)
  // 🆕 v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5): Stack tools 列表
  if (c.stackTools && c.stackTools.length > 0) {
    lines.push('')
    lines.push(`## Stack Tools (${c.stackTools.length})`)
    lines.push('> Probe runtime metadata; merge into ProbeContext.stackTools for env injection.')
    for (const t of c.stackTools) {
      const meta: string[] = []
      if (t.version) meta.push(`v=${t.version}`)
      if (t.command) meta.push(`cmd=${t.command}`)
      if (t.config) meta.push(`config=${t.config}`)
      if (t.role) meta.push(`role=${t.role}`)
      const tag = meta.length > 0 ? ` (${meta.join(' | ')})` : ''
      lines.push(`  - ${t.name}${tag}`)
    }
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Subcommand: lock (PR-7)
// ---------------------------------------------------------------------------
//
// 行为：
//   1. 校验 .work 存在（PR-6 validate 后才有；否则提示先 validate）
//   2. 校验 .work.planLock === null（已锁则报错，提示先 unlock）
//   3. 算 hashWorkPlan() → 4 组件 hash
//   4. 写 .work.planLock = { lockedAt, workMdHash, workDomainsHash, blueprintsHash, tasksHash }
//   5. 返回 planLock 详情
//
// 失败模式（RFC-0033 D2 已删 lock 步）：
//   - .work 不存在 → 提示先 `oxn work run --validate-only`
//   - planLock 已退役 → 无对应错误
//   - 4 组件 hash 概念已退役 → 改为 workMdHash 单组件
//
const migrateSubcommand = defineCommand({
  meta: {
    name: 'migrate',
    description: t('work.migrate.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    const result = await migrateWorkToV1(projectRoot, workName)

    if (!result.ok) {
      if (result.kind === 'work-not-found') {
        return outputError({ code: 'OXN_WORK_NOT_FOUND', message: result.message }, format)
      }
      if (result.kind === 'no-v0-layout') {
        return outputError(
          {
            code: 'OXN_WORK_NO_V0_LAYOUT',
            message: result.message,
            suggestion: t('work.migrateRequired'),
          },
          format,
        )
      }
      // io-error / partial-v0
      return outputError(
        { code: 'OXN_WORK_MIGRATE_FAILED', message: result.message, suggestion: result.warnings.join('; ') },
        format,
      )
    }

    if (result.kind === 'already-v1') {
      return output(
        {
          ok: true,
          data: {
            workName,
            migrated: false,
            reason: 'already-v1',
            warnings: result.warnings,
            diagnostics: result.invalidRefs ?? [],
          },
          human: `Work "${workName}" already migrated; nothing to do.\n${result.warnings.join('\n')}`,
        },
        format,
      )
    }

    output(
      {
        ok: true,
        data: {
          workName,
          migrated: true,
          v0FilesMoved: result.v0FilesMoved,
          backupDir: result.backupDir,
          artifactsWritten: result.artifactsWritten,
          warnings: result.warnings,
          diagnostics: result.invalidRefs ?? [],
        },
        human:
          `Work "${workName}" migrated to V1 ✓\n` +
          `  V0 files moved: ${result.v0FilesMoved}\n` +
          `  Backup dir:     ${result.backupDir}\n` +
          `  Artifacts:\n` +
          result.artifactsWritten.map((a) => `    - ${a}`).join('\n') +
          (result.warnings.length > 0
            ? `\n\n  Warnings:\n${result.warnings.map((w) => `    ! ${w}`).join('\n')}`
            : '') +
          ((result.invalidRefs?.length ?? 0) > 0
            ? `\n\n  Diagnostics (${result.invalidRefs!.length}):\n${result.invalidRefs!.map((d) => `    ! [${d.type}] ${d.ref}: ${d.message}`).join('\n')}`
            : '') +
          `\n\n  Next: \`oxn work run ${workName}\`\n` +
          t('work.migrate.cleanupHint'),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Top-level command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'work',
    description: t('work.description'),
  },
  subCommands: {
    list: listSubcommand,
    create: createSubcommand,
    // RFC-0033 D1: validate 子命令已删；校验并入 `oxn work run --validate-only`
    'add-task': addTaskSubcommand,
    'list-task': listTaskSubcommand,
    'task-status': taskStatusSubcommand,
    'verify-task-path': verifyTaskPathSubcommand,
    'edit-task': editTaskSubcommand,
    'delete-task': deleteTaskSubcommand,
    run: runSubcommand,
    submit: submitSubcommand,
    status: statusSubcommand,
    inject: injectSubcommand,
    context: contextSubcommand,
    // RFC-0033 D2: lock/unlock 子命令已删（PlanLock 整体退役，work.md 可自由修改）
    // RFC-0032 Phase 3: next-round 子命令已删 (D6 推翻 Round 模型)
    // RFC-0032 Phase 2: finalize 子命令已删 (依赖 frozen/work-domains.ts)
    // RFC-0032 D25: 后续计划让 finalize 不依赖 frozen/ 重新引入
    migrate: migrateSubcommand,
  },
  run() {
    // No-op: help text is provided by citty
  },
})
