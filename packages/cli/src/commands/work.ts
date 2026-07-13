// =============================================================================
// `oxn work` — Work 编排与运行时
//
// 单一实体（Work）的完整生命周期，按 IAP 三阶段分组：
//
//   Intent (工程师主权):
//     create <name> --blueprint <bp>  — 写 works/<w>/work.md + auto task skeleton
//     add-task <name> --task <t> ...  — 写 works/<w>/tasks/<t>/task.md
//     lock <name> [--dry-run]        — validate 内含 + hash + 写 planLock
//     validate <name>                 — alias for lock --dry-run
//
//   Align (AI 主权):
//     run <name>                      — 启动状态机，落 .run/state.json
//     submit <name> --task <t>        — 推进 task 内 part
//     context <name> --task <t>       — 渲染 AI 上下文
//
//   Proof (Engine 主权):
//     finalize <name> [--verdict V]   — 收口 + 写 frozen.json
//
//   Auxiliary:
//     list / migrate / status / unlock / next-round / compile / sync
//
// 命名范式: V1 布局（详见 kernel/constants.ts）
//   - DSL 图纸: work.md / task.md
//   - 静态门禁: .work
//   - 运行时:  .run/state.json / .run/trace.jsonl / .run/frozen.json
//              .run/tasks/<t>/state.json / .run/tasks/<t>/trace.jsonl / .run/tasks/<t>/frozen.json
//
// 阶段守卫:
//   - NV-1: .run/state.json 存在 ⇒ add-task/edit-task/delete-task 拒绝
//   - NV-2: .run/state.json 缺失 ⇒ submit 拒绝
// =============================================================================

import { defineCommand } from 'citty'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { t } from '@openxenon/engine/infra/i18n'
import { join } from 'path'
import { BOUNDARY_DIR, RUN_DIR, TASK_OXN_FILE, WORK_OXN_FILE, WORK_RUN_STATE_JSON } from '@openxenon/engine/kernel'
import { assertDirNameConsistent } from '@openxenon/engine/kernel'
import { IAPError } from '@openxenon/engine/errors'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import type { WorkDeclaration } from '@openxenon/engine/oxl'
import { extractBlueprintIR } from '@openxenon/engine/oxl/md-pipeline/transformers/blueprint.js'
import type { WorkPart } from '@openxenon/engine/oxl/md-pipeline/transformers/work.js'
import { runTask, runWork, submitTask, submitTaskWithProbes, nextRoundWork } from '@openxenon/engine/Work'
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
import { resetCurrentRoundTasks } from '@openxenon/engine/Work/dual-state-exec'
// 🆕 v0.6.1-alpha.4 Phase B: 删除 resolveDomainFile import（Domain 引用走 Blueprint ## Refs 路径）
import { resolveBlueprintFile } from '@openxenon/engine/Work/per-work-blueprints-merger'
import { buildBlueprintDiagnostic, type RefDiagnostic } from '@openxenon/engine/oxl/compiler/ref-diagnostic'
import {
  applyPlanLock,
  clearPlanLock,
  readWorkFile as readBirthCert,
  verifyPlanLock,
  writeWorkFile,
  type BirthCert,
} from '@openxenon/engine/Work/birth-cert'
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
import { finalizeWorkDomains } from '@openxenon/engine/infra/frozen/work-domains'

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

// v0.6.1-alpha.0 #3-3: work create 后自动为 blueprint 每个 slot 生成 task.md 骨架
function writeTaskTemplate(
  projectRoot: string,
  workName: string,
  taskName: string,
  blueprintName: string,
  domainName: string,
): { written: boolean; path: string; reason?: 'exists' } {
  const taskDir = getTaskDir(projectRoot, workName, taskName)
  const taskFile = getWorkTaskFile(workName, taskName)
  if (existsSync(taskFile)) {
    return { written: false, path: taskFile, reason: 'exists' }
  }
  const refsSection = [`- blueprint: ${blueprintName}`, domainName ? `- domain: ${domainName}` : '']
    .filter(Boolean)
    .join('\n')

  const template = `---
entity: task
version: 0.3.0
name: ${taskName}
---

# Task: ${taskName}

## Parts
### slot-name
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
    if ((bp.slots ?? []).length === 0) {
      return outputError({ code: 'OXN_INVALID_BLUEPRINT', message: `Blueprint "${bp.name}" has no part slots` }, format)
    }

    const resolvedBlueprintName = parsePartName(bp.name)
    const slots = (bp.slots ?? []).map((s) => ({
      name: parsePartName(s.name),
      align: capitalize(parsePartName(s.name)),
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
      slots,
      assetFormat,
      Object.keys(assetSkeletonOptions).length > 0 ? assetSkeletonOptions : undefined,
    )
    writeFileSync(workFile, workContent, 'utf-8')

    // 4. auto-sync to other format
    if (autoSync) {
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

    // 5. 为每个 slot 生成 task.md 骨架
    const autoTasks: Array<{ name: string; path: string; status: 'created' | 'exists' }> = []
    for (const slot of slots) {
      const t = writeTaskTemplate(projectRoot, workName, slot.name, resolvedBlueprintName, '')
      autoTasks.push({
        name: slot.name,
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
            slotCount: slots.length,
            slots: slots.map((s) => s.name),
          },
          assetKind,
          domain: domainName,
          files: { work: workFile },
          tasks: autoTasks,
          nextStep:
            `Edit the task files, then run: oxn work validate ${workName} && oxn work lock ${workName} && oxn work run ${workName}\n` +
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
        if ((bp.slots ?? []).length === 0) {
          return outputError(
            { code: 'OXN_INVALID_BLUEPRINT', message: `Blueprint "${bp.name}" has no part slots` },
            format,
          )
        }
        const resolvedBlueprintName = parsePartName(bp.name)
        const slots = (bp.slots ?? []).map((s) => ({
          name: parsePartName(s.name),
          align: capitalize(parsePartName(s.name)),
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
          slots,
          assetFormat,
          Object.keys(skeletonOptions).length > 0 ? skeletonOptions : undefined,
        )
        writeFileSync(workFile, workContent, 'utf-8')

        // v0.5 Phase 3: auto-sync to other format
        if (autoSync) {
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
        // v0.6.1-alpha.0 #3-3: work create 自动为 blueprint 每个 slot 生成 task.md 骨架
        //   避免 work 锁后 run 报 "task X not found in work Y"。
        //   用户可继续手动 `add-task` 补 task 或 `--force` 覆盖。
        const autoTasks: Array<{ name: string; path: string; status: 'created' | 'exists' }> = []
        for (const slot of slots) {
          const t = writeTaskTemplate(projectRoot, workName, slot.name, resolvedBlueprintName, '')
          autoTasks.push({
            name: slot.name,
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
                slotCount: slots.length,
                slots: slots.map((s) => s.name),
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
                `Edit the task files, then run: oxn work validate ${workName} && oxn work lock ${workName} && oxn work run ${workName}\n` +
                `  Tip: view Roadmap scene for related Assets: oxn roadmap show oxn-system --scene <scene>`,
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
    if (autoSync) {
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
const validateSubcommand = defineCommand({
  meta: {
    name: 'validate',
    description: t('work.validate.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    const workFile = resolveWorkFilePath(projectRoot, workName, assetFormat)
    if (!existsSync(workFile)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work "${workName}" not found at ${workFile}` }, format)
    }

    // ── 1. 语法解析 ──
    let work: WorkDeclaration
    try {
      const result = await validateWorkFile(workFile)
      if (!result.ok || !result.work) {
        const code = result.errors.some(
          (e) => e.startsWith('[Parser]') || e.startsWith('[Lexer]') || e.includes('parse failed'),
        )
          ? 'OXN_WORK_VALIDATE_FAILED'
          : 'OXN_NO_WORK'
        return outputError({ code, message: result.errors.join('; ') }, format)
      }
      work = result.work
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return outputError({ code: 'OXN_WORK_VALIDATE_FAILED', message }, format)
    }

    // ── 1.5 v1.1: work.md 内 `work "X"` 与目录名 <w> 一致性校验（macOS-safe） ──
    const workDir = join(projectRoot, '.openxenon', 'works', workName)
    try {
      assertDirNameConsistent(work.name, workDir, 'work')
    } catch (err) {
      if (err instanceof IAPError) {
        return outputError(
          {
            code: err.name,
            message: err.message,
            ...(err.context?.suggestion !== undefined ? { suggestion: String(err.context.suggestion) } : {}),
          },
          format,
        )
      }
      throw err
    }

    // ── 2. 检查 task.md 是否都已建（沿用现有逻辑） ──
    const missingTaskOxn: string[] = []
    for (const t of work.tasks ?? []) {
      const tName = parsePartName(t.name)
      if (!existsSync(getTaskOxnPath(projectRoot, workName, tName))) {
        missingTaskOxn.push(tName)
      }
    }

    // ── 3. PR-6: 写 artifacts（解析 + 落 3 文件） ──
    const result = await validateAndWriteArtifacts({
      projectRoot,
      workName,
      work,
      missingTaskOxn,
    })

    if (!result.ok) {
      const code =
        result.warnings.some((w) => w.includes('locked')) && result.unresolved === undefined
          ? 'OXN_WORK_LOCKED'
          : 'OXN_WORK_REFS_UNRESOLVED'
      return output(
        {
          ok: false,
          data: {
            code,
            valid: false,
            unresolved: result.unresolved ?? [],
            warnings: result.warnings,
            note: 'no artifacts written (validate failed)',
          },
          human:
            `Work validate FAILED\n` +
            `  Unresolved refs: ${(result.unresolved ?? []).length}\n` +
            (result.unresolved ?? []).map((u) => `    - ${u.kind} "${u.name}": ${u.reason}`).join('\n') +
            (result.warnings.length > 0 ? `\n  Warnings: ${result.warnings.join(' | ')}` : ''),
        },
        format,
      )
    }

    const a = result.artifacts!
    output(
      {
        ok: true,
        data: {
          workName,
          blueprintRef: work.refs?.find((r) => r.kind === 'blueprint')?.name,
          valid: true,
          errors: [],
          warnings: result.warnings,
          artifacts: {
            // 🆕 Phase B: 删 domainsJson（Domain 引用走 Blueprint ## Refs）
            blueprintsJson: a.blueprintsJsonPath,
            workFile: a.workFilePath,
          },
          assetCounts: a.assetCounts,
        },
        human:
          `Work validate OK\n` +
          // 🆕 Phase B: 删 Domain refs 计数（Domain 引用走 Blueprint ## Refs）
          `  Blueprint refs: ${a.assetCounts.blueprints} resolved\n` +
          `  Task count:  ${a.assetCounts.tasks}\n` +
          `\n  Artifacts written:\n` +
          `    - ${a.blueprintsJsonPath}\n` +
          `    - ${a.workFilePath}` +
          (result.warnings.length > 0 ? `\n\n  Warnings: ${result.warnings.join(' | ')}` : ''),
      },
      format,
    )
  },
})

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
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)

    // v0.6.1-alpha.0 #3-5: work 目录整个被删 → 报 OXN_ALIGN_WORK_REMOVED
    //   区分：未 init 走 LOCK_NOT_FOUND（work 从未存在过，提案 work create）；
    //         已 init 但 .openxenon/works/<w>/ 被删 → WORK_REMOVED（暗示 work 锁后被删）
    const workDir = getWorkDir(projectRoot, workName)
    if (!existsSync(workDir)) {
      // 优先判断"未 init"：.openxenon/works/ 整目录不存在 → LOCK_NOT_FOUND
      const worksRoot = join(projectRoot, BOUNDARY_DIR, 'works')
      const code = existsSync(worksRoot) ? 'OXN_ALIGN_WORK_REMOVED' : 'OXN_ALIGN_LOCK_NOT_FOUND'
      const message =
        code === 'OXN_ALIGN_WORK_REMOVED'
          ? `work "${workName}" cannot run: work directory deleted`
          : `work "${workName}" cannot run: no works/ directory — project not initialized or never created a work`
      const suggestion =
        code === 'OXN_ALIGN_WORK_REMOVED'
          ? `run \`oxn work list\` to see existing works; or create a new one with \`oxn work create ${workName}\``
          : '先执行 `oxn work validate <name>` 生成 .work'
      return outputError({ code, message, suggestion }, format)
    }

    try {
      // PR-8: 锁守卫优先于 work.md 缺失检查——
      //   若 work.md 缺失是因为 lock 后被删（不是初建），应报 WORK_REMOVED 而非 NOT_FOUND，
      //   语义更准（"你锁的计划被破坏了" vs "你这 work 根本不存在"）。
      //   因此先调 lock 校验，再做 work.md 缺失检查。
      const birthCert = readBirthCert(projectRoot, workName)
      if (birthCert.ok && birthCert.cert.planLock !== null) {
        // 已有 planLock；再做 hash 校验（这一步会捕获 work.md 缺失 → work-removed）
        const lockVerify = verifyPlanLock(projectRoot, workName, birthCert.cert)
        if (!lockVerify.ok) {
          const code =
            lockVerify.reason === 'work-removed'
              ? 'OXN_ALIGN_WORK_REMOVED'
              : lockVerify.reason === 'no-plan-lock'
                ? 'OXN_ALIGN_LOCK_NOT_FOUND'
                : 'OXN_ALIGN_LOCK_HASH_MISMATCH'
          return outputError(
            {
              code,
              message: `Work run BLOCKED: ${lockVerify.message}`,
              suggestion: t('work.hashChangedSuggestion', { workName }),
              context: {
                reason: lockVerify.reason,
                component: lockVerify.component,
                expected: lockVerify.expected,
                actual: lockVerify.actual,
              },
            },
            format,
          )
        }
      } else if (!birthCert.ok) {
        // .work 缺失或损坏 → 提示先 validate（planLock === null 走下方再判）
        if (birthCert.reason === 'missing') {
          return outputError(
            {
              code: 'OXN_ALIGN_LOCK_NOT_FOUND',
              message: `work "${workName}" cannot run: .work missing`,
              suggestion: t('work.validateRequired'),
            },
            format,
          )
        }
        return outputError(
          {
            code: 'OXN_ALIGN_LOCK_NOT_FOUND',
            message: `work "${workName}" cannot run: .work ${birthCert.reason}`,
            suggestion: t('work.birthCertInvalid', { errors: birthCert.errors.join('; ') }),
          },
          format,
        )
      } else {
        // .work 存在但 planLock === null
        return outputError(
          {
            code: 'OXN_ALIGN_LOCK_NOT_FOUND',
            message: `work "${workName}" has no planLock; run refuses to start execution`,
            suggestion: t('work.lockHint'),
          },
          format,
        )
      }

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
        // Round 2+ re-run：重置当前 Round 的 task 状态为 pending（保留 passed 状态）
        resetCurrentRoundTasks(existingState)
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
      // 🆕 v0.6.1-alpha.4 Phase B: 删除 domain ref 诊断（Domain 引用走 Blueprint ## Refs）
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
const submitSubcommand = defineCommand({
  meta: {
    name: 'submit',
    description: t('work.submit.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    task: { type: 'string', required: true, description: t('work.args.taskName') },
    '--evidence': { type: 'string', description: t('work.submit.args.evidence') },
    '--run-probes': { type: 'boolean', description: t('work.submit.args.runProbes') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const runProbes = ctx.args['run-probes'] === true
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
      const result = runProbes
        ? await submitTaskWithProbes({
            projectRoot,
            workName,
            taskName,
            runProbes,
          })
        : submitTask({
            projectRoot,
            workName,
            taskName,
            runProbes,
          })

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
      // PR-14a: status 是观察者；以 .work（birth cert）作为 work 是否存在的真源
      const birthCert = readBirthCert(projectRoot, workName)
      if (!birthCert.ok) {
        const hint =
          birthCert.reason === 'missing'
            ? 'Work has no .work birth cert. Run `oxn work validate <name>` to generate it.'
            : `.work birth cert has ${birthCert.reason}: ${birthCert.errors.join('; ')}`
        return output(
          errorJson(
            'OXN_WORK_NOT_FOUND',
            `work "${workName}" not found (.work birth cert missing or invalid: ${birthCert.reason})`,
            hint,
          ),
          format,
        )
      }
      const workspace = loadWorkState(projectRoot, workName)
      if (!workspace) {
        // .work 存在但 .run/state.json 缺失：work 还没跑过
        return output(
          {
            ok: true,
            data: {
              workName,
              workspace: null,
              planLock: birthCert.cert.planLock
                ? {
                    present: true as const,
                    lockedAt: birthCert.cert.planLock.lockedAt,
                    allHash: birthCert.cert.planLock.allHash ?? null,
                  }
                : { present: false as const, lockedAt: null, allHash: null },
              note: 'work has been validated but not yet run; .run/state.json missing',
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

      // PR-14a: planLock 字段已在前置 .work 读取中获取，复用
      const planLockField = birthCert.cert.planLock
        ? {
            present: true as const,
            lockedAt: birthCert.cert.planLock.lockedAt,
            allHash: birthCert.cert.planLock.allHash ?? null,
          }
        : { present: false as const, lockedAt: null, allHash: null }

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
            planLock: planLockField,
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
    'unlock-check': {
      type: 'boolean',
      default: false,
      description: t('work.status.args.skipLockCheck'),
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
    const lockCheck = ctx.args['unlock-check'] !== true
    const noLockCheck = !lockCheck
    const root = getProjectRoot()
    const config = readProjectConfig(root)
    const assetFormat = resolveAssetFormat(config)

    const workFile = resolveWorkFilePath(root, workName, assetFormat)

    // PR-9: context 与 run 对称 —— 锁守卫优先于 work.md 缺失检查
    // 默认硬要求；--unlock-check 用于诊断 stale 计划
    let birthCertForHealth: { ok: boolean; cert?: BirthCert } | null = null
    if (!noLockCheck) {
      const birthCert = readBirthCert(root, workName)
      birthCertForHealth = birthCert
      if (birthCert.ok && birthCert.cert.planLock !== null) {
        // 已有 planLock；先做 hash 校验（捕获 work.md 缺失 → work-removed）
        const lockVerify = verifyPlanLock(root, workName, birthCert.cert)
        if (!lockVerify.ok) {
          const code =
            lockVerify.reason === 'work-removed'
              ? 'OXN_ALIGN_WORK_REMOVED'
              : lockVerify.reason === 'no-plan-lock'
                ? 'OXN_ALIGN_LOCK_NOT_FOUND'
                : 'OXN_ALIGN_LOCK_HASH_MISMATCH'
          return outputError(
            {
              code,
              message: `Context read BLOCKED: ${lockVerify.message}`,
              suggestion: t('work.hashChangedSuggestion', { workName }) + t('work.unlockCheckHint'),
              context: {
                reason: lockVerify.reason,
                component: lockVerify.component,
                expected: lockVerify.expected,
                actual: lockVerify.actual,
              },
            },
            format,
          )
        }
      } else if (!birthCert.ok) {
        if (birthCert.reason === 'missing') {
          return outputError(
            {
              code: 'OXN_ALIGN_LOCK_NOT_FOUND',
              message: `work "${workName}" cannot read context: .work missing`,
              suggestion: t('work.validateRequired'),
            },
            format,
          )
        }
        return outputError(
          {
            code: 'OXN_ALIGN_LOCK_NOT_FOUND',
            message: `work "${workName}" cannot read context: .work ${birthCert.reason}`,
            suggestion: t('work.birthCertInvalid', { errors: birthCert.errors.join('; ') }),
          },
          format,
        )
      } else {
        // .work 存在但 planLock === null
        return outputError(
          {
            code: 'OXN_ALIGN_LOCK_NOT_FOUND',
            message: `work "${workName}" has no planLock; context refuses stale read`,
            suggestion: t('work.lockHint') + t('work.unlockCheckHint'),
          },
          format,
        )
      }
    }

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

      const injectedDomains: Array<{ name: string; data: NonNullable<DomainFileSummary> }> = []
      if (taskDomain) {
        const kebab = camelToKebab(taskDomain)
        const candidates = [
          join(root, BOUNDARY_DIR, 'domains', `${taskDomain}.md`),
          join(root, BOUNDARY_DIR, 'domains', `${kebab}.md`),
        ]
        for (const path of candidates) {
          const domData = readDomainFile(path)
          if (domData) {
            injectedDomains.push({ name: taskDomain, data: domData })
            break
          }
        }
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
        injectedDomains: injectedDomains.map(({ name, data }) => ({
          name,
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
        },
        taskParts,
        isolationNotice: t('work.isolationNotice'),
        lockHealth: noLockCheck
          ? { status: 'bypassed', reason: 'unlock-check flag set' }
          : birthCertForHealth?.ok && birthCertForHealth.cert?.planLock
            ? {
                status: 'ok',
                lockedAt: birthCertForHealth.cert.planLock.lockedAt,
                allHash: birthCertForHealth.cert.planLock.allHash ?? null,
                components: {
                  workMdHash: birthCertForHealth.cert.planLock.workMdHash,
                  // 🆕 Phase B: 删 workDomainsHash（blueprintsHash 升级为 composite 含 Blueprint + 3 边界）
                  blueprintsHash: birthCertForHealth.cert.planLock.blueprintsHash,
                  tasksHash: birthCertForHealth.cert.planLock.tasksHash,
                },
              }
            : { status: 'unknown' },
        diagnostics,
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
  injectedDomains: Array<{ name: string; description?: string; language?: unknown }>
  allowedLanguage: { mustUseTerms: Array<{ name: string; desc: string }>; banned: string[]; invariants: string[] }
  taskParts: Array<{ name: string; skillContext?: string; probes: Array<{ name: string; ref: string }> }>
  isolationNotice: string
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
    lines.push(`### ${d.name}`)
    if (d.description) lines.push(d.description)
    const lang = d.language as { terms?: Array<{ name: string }> } | undefined
    if (lang?.terms && lang.terms.length > 0) {
      lines.push(`Terms: ${lang.terms.map((t) => t.name).join(', ')}`)
    }
  }
  lines.push('')
  lines.push('## Allowed Language')
  lines.push(`Terms (must use): ${c.allowedLanguage.mustUseTerms.map((t) => t.name).join(', ') || '(none)'}`)
  if (c.allowedLanguage.banned.length > 0) {
    lines.push(`Banned:          ${c.allowedLanguage.banned.join(', ')}`)
  }
  if (c.allowedLanguage.invariants.length > 0) {
    lines.push('')
    lines.push('## Invariants')
    for (const inv of c.allowedLanguage.invariants) {
      lines.push(`- ${inv}`)
    }
  }
  lines.push('')
  lines.push(`## ${c.isolationNotice}`)
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
// 失败模式（统一 OXN_WORK_LOCK_FAILED）：
//   - .work 不存在 → 提示先 `oxn work validate`
//   - planLock !== null → 提示先 `oxn work unlock`
//   - 4 组件 hash 有缺失（task 0 个或文件失踪）→ 报告具体 missing
//
const lockSubcommand = defineCommand({
  meta: {
    name: 'lock',
    description: t('work.lock.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
    '--dry-run': { type: 'boolean', description: 'validate only, do not write planLock' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const dryRun = ctx.args['dry-run'] === true
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    // ── 0.5 Phase D: 快速检查 — 已锁则拒绝（不需跑 validate） ──
    const existingCert = readBirthCert(projectRoot, workName)
    if (existingCert.ok && existingCert.cert.planLock !== null) {
      return outputError(
        {
          code: 'OXN_WORK_LOCK_FAILED',
          message: `work "${workName}" already locked`,
          suggestion: t('work.unlockSuggestion', { workName }),
          context: { lockedAt: existingCert.cert.planLock.lockedAt },
        },
        format,
      )
    }

    // ── 0.6 Phase D: lock 内含 validate — 先解析 work.md + 校验 + 写 .work ──
    const workFile = resolveWorkFilePath(projectRoot, workName, resolveAssetFormat(config))
    if (!existsSync(workFile)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work "${workName}" not found at ${workFile}` }, format)
    }

    let work: WorkDeclaration
    try {
      const result = await validateWorkFile(workFile)
      if (!result.ok || !result.work) {
        const code = result.errors.some(
          (e) => e.startsWith('[Parser]') || e.startsWith('[Lexer]') || e.includes('parse failed'),
        )
          ? 'OXN_WORK_VALIDATE_FAILED'
          : 'OXN_NO_WORK'
        return outputError({ code, message: result.errors.join('; ') }, format)
      }
      work = result.work
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return outputError({ code: 'OXN_WORK_VALIDATE_FAILED', message }, format)
    }

    // v1.1: work.md 内 `work "X"` 与目录名 <w> 一致性校验
    const workDir = join(projectRoot, '.openxenon', 'works', workName)
    try {
      assertDirNameConsistent(work.name, workDir, 'work')
    } catch (err) {
      if (err instanceof IAPError) {
        return outputError(
          {
            code: err.name,
            message: err.message,
            ...(err.context?.suggestion !== undefined ? { suggestion: String(err.context.suggestion) } : {}),
          },
          format,
        )
      }
      throw err
    }

    // 检查 task.md 是否都已建
    const missingTaskOxn: string[] = []
    for (const t of work.tasks ?? []) {
      const tName = parsePartName(t.name)
      if (!existsSync(getTaskOxnPath(projectRoot, workName, tName))) {
        missingTaskOxn.push(tName)
      }
    }

    // validate + 写 .work (BirthCert)
    const validationResult = await validateAndWriteArtifacts({
      projectRoot,
      workName,
      work,
      missingTaskOxn,
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
            note: dryRun ? 'validate only (dry-run)' : 'lock failed: validate did not pass',
          },
          human:
            `Work validate FAILED\n` +
            `  Unresolved refs: ${(validationResult.unresolved ?? []).length}\n` +
            (validationResult.unresolved ?? []).map((u) => `    - ${u.kind} "${u.name}": ${u.reason}`).join('\n') +
            (validationResult.warnings.length > 0 ? `\n  Warnings: ${validationResult.warnings.join(' | ')}` : ''),
        },
        format,
      )
    }

    // dry-run 模式：validate 通过即止，不写 planLock
    if (dryRun) {
      const a = validationResult.artifacts!
      output(
        {
          ok: true,
          data: {
            workName,
            valid: true,
            dryRun: true,
            warnings: validationResult.warnings,
            artifacts: {
              blueprintsJson: a.blueprintsJsonPath,
              workFile: a.workFilePath,
            },
            assetCounts: a.assetCounts,
          },
          human:
            `Work validate OK (dry-run)\n` +
            `  Blueprint refs: ${a.assetCounts.blueprints} resolved\n` +
            `  Task count:  ${a.assetCounts.tasks}\n` +
            `\n  Artifacts written:\n` +
            `    - ${a.blueprintsJsonPath}\n` +
            `    - ${a.workFilePath}` +
            (validationResult.warnings.length > 0 ? `\n\n  Warnings: ${validationResult.warnings.join(' | ')}` : ''),
        },
        format,
      )
      return
    }

    // ── 1. 重新读 .work（validate 已写，理应存在） ──
    const existing = readBirthCert(projectRoot, workName)
    if (!existing.ok) {
      const hint =
        existing.reason === 'missing'
          ? t('work.validateRequired')
          : t('work.birthCertInvalid', { errors: existing.errors.join('; ') })
      return outputError(
        {
          code: 'OXN_WORK_LOCK_FAILED',
          message: `.work not lockable: ${existing.reason}`,
          suggestion: hint,
        },
        format,
      )
    }

    // ── 2. 算 hash ──
    const hash = hashWorkPlan(projectRoot, workName)
    if (hash.allHash === null) {
      return outputError(
        {
          code: 'OXN_WORK_LOCK_FAILED',
          message: `cannot compute complete plan hash; missing: ${hash.missing.join(', ')}`,
          suggestion: t('work.lockFailed'),
        },
        format,
      )
    }

    // ── 3. 写 planLock ──
    const locked = applyPlanLock(existing.cert, hash)
    writeWorkFile(projectRoot, workName, locked)

    const pl = locked.planLock!
    output(
      {
        ok: true,
        data: {
          workName,
          lockedAt: pl.lockedAt,
          planLock: {
            workMdHash: pl.workMdHash,
            blueprintsHash: pl.blueprintsHash,
            tasksHash: pl.tasksHash,
            allHash: pl.allHash,
          },
          nextStep: `run \`oxn work run ${workName}\` to start execution`,
        },
        human: `Work "${workName}" locked ✓
  Locked at: ${pl.lockedAt}
  Components:
    - work.md:     ${pl.workMdHash.slice(0, 16)}...
    - blueprints.json: ${pl.blueprintsHash.slice(0, 16)}...
    - tasks:        ${pl.tasksHash.slice(0, 16)}...
    - all:          ${pl.allHash?.slice(0, 16) ?? '(legacy)'}...

  Next: run \`oxn work run ${workName}\` to start execution`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: unlock (PR-7)
// ---------------------------------------------------------------------------
//
// 行为：
//   1. 校验 .work 存在
//   2. 校验 planLock !== null（未锁则报错，提示 lock 才是正常路径）
//   3. 清 planLock → null；updatedAt 刷新
//
// 注意：unlock 后 work.md / domains.json / blueprints.json / tasks/*.md 可被自由修改。
//       重新 lock 时会算新 hash；旧 planLock 丢失（仅 .work.updatedAt 留痕）。
//
const unlockSubcommand = defineCommand({
  meta: {
    name: 'unlock',
    description: t('work.unlock.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    const existing = readBirthCert(projectRoot, workName)
    if (!existing.ok) {
      return outputError(
        {
          code: 'OXN_WORK_UNLOCK_FAILED',
          message: `.work not readable: ${existing.reason}`,
          suggestion: t('work.unlockHint'),
        },
        format,
      )
    }

    if (existing.cert.planLock === null) {
      return outputError(
        {
          code: 'OXN_WORK_UNLOCK_FAILED',
          message: `work "${workName}" is not locked`,
          suggestion: t('work.unlockRequired'),
        },
        format,
      )
    }

    const cleared = clearPlanLock(existing.cert)
    writeWorkFile(projectRoot, workName, cleared)

    output(
      {
        ok: true,
        data: {
          workName,
          cleared: true,
          clearedAt: cleared.updatedAt,
          previousLockedAt: existing.cert.planLock.lockedAt,
          nextStep: 'edit work.md / tasks/<t>/task.md as needed, then re-run `oxn work validate` and `oxn work lock`',
        },
        human: `Work "${workName}" unlocked ✓
  Cleared at: ${cleared.updatedAt}
  Previous lock was at: ${existing.cert.planLock.lockedAt}

  Next:
    1. Edit work.md / tasks/<t>/task.md as needed
    2. Re-run \`oxn work validate ${workName}\` to refresh domains.json / blueprints.json / .work
    3. Re-run \`oxn work lock ${workName}\` to lock the new plan`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: migrate (PR-10)
// ---------------------------------------------------------------------------
//
// 把 V0 旧布局（works/<w>/{work-state,work-trace,work-frozen}.{json,jsonl} +
//                       works/<w>/tasks/<t>/{task-state,task-trace,task-frozen}.{json,jsonl}）
// 一次性迁到 V1（.run/ 目录 + .work + per-work slim 索引）。
//
// 行为：
//   1. 探测 V0 文件存在 + V1 产物不存在 → 准备迁移
//   2. 把 V0 文件备份到 works/<w>/.migrated-v0/<rel>（不删，工程师手动清理）
//   3. 把备份恢复到 V1 路径（.run/state.json 等）
//   4. 重新生成 .work / domains.json / blueprints.json
//   5. 返回迁移报告
//
// 失败模式：
//   - work.md 缺失：OXN_WORK_NOT_FOUND
//   - 既没 V0 也没 V1：OXN_WORK_NO_V0_LAYOUT（"纯 planning work，不需要迁移"）
//   - 已 V1：kind=already-v1（no-op + warning 提示手动清理残留 V0）
//

// =============================================================================
// v0.6 PR-2: `oxn work next-round <name>` — 关闭当前 round + 开启下一轮
//
// 行为：
//   - 读取本轮 verdict（从 frozen.json.verdict）+ 失败 task 列表
//   - 关闭当前 round（追加到 roundHistory，标记 endedAt + verdict + failures）
//   - 若 verdict=PASSED → 抛 OXN_ROUND_ALREADY_PASSED（提示用 finalize 而非 next-round）
//   - 开启新 round（currentRound++，追加 PENDING 记录）
//   - 追加 trace event
//   - 写 .run/state.json
//
// 手动触发（v0.6），不自动循环（避免无限循环 + 便于人工调整 Intent）
// =============================================================================
const nextRoundSubcommand = defineCommand({
  meta: {
    name: 'next-round',
    description: '关闭当前 round + 开启下一轮 IAP 循环（v0.6 PR-2）',
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--verdict': {
      type: 'string',
      required: true,
      description: '本轮 verdict：PASSED | FAILED | INCONCLUSIVE',
    },
    '--failures': {
      type: 'string',
      description: '本轮失败的 task 名列表（逗号分隔，可选）',
    },
    '--notes': { type: 'string', description: '本轮总结备注（可选）' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const verdictRaw = ctx.args.verdict as string
    const failuresRaw = (ctx.args as Record<string, unknown>).failures as string | undefined
    const notes = (ctx.args as Record<string, unknown>).notes as string | undefined
    const projectRoot = getProjectRoot()

    // 验证 verdict
    if (verdictRaw !== 'PASSED' && verdictRaw !== 'FAILED' && verdictRaw !== 'INCONCLUSIVE') {
      return outputError(
        {
          code: 'OXN_ROUND_VERDICT_INVALID',
          message: `invalid --verdict: ${verdictRaw}`,
          suggestion: 'valid values: PASSED | FAILED | INCONCLUSIVE',
        },
        format,
      )
    }
    const verdict = verdictRaw as 'PASSED' | 'FAILED' | 'INCONCLUSIVE'

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    const failures = failuresRaw
      ? failuresRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : []

    try {
      const result = nextRoundWork({
        projectRoot,
        workName,
        verdict,
        failures,
        ...(notes ? { notes } : {}),
      })
      output(
        {
          ok: true,
          data: {
            workName,
            round: result.round,
            previousVerdict: result.previousVerdict,
            historyLength: result.historyLength,
            workspace: result.workspace,
          },
          human: renderNextRoundHuman(result),
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
      output(errorJson('OXN_NEXT_ROUND_FAILED', message), format)
    }
  },
})

// =============================================================================
// v0.6.1-alpha.0 #3-1: `oxn work finalize <name>` — 收口 work（汇总所有 round → 最终 frozen.json）
//
// 行为：
//   - 关闭当前 active round（追加 endedAt + verdict）
//   - 标记 work 终态（passed / failed / finalized）
//   - 写 trace event
//   - finalize 不强制要求最后一轮 PASSED（允许「失败收档」语义）
// =============================================================================

/**
 * A2 (D4): 收集 Work 引用 Domain 的 invariant，构造 DomainProofInput[]。
 * 从 work.md ## Refs 提取 kind:domain 的 domain → 读每个 Domain.md 的 ## Invariants。
 */
function collectWorkDomainProofs(
  projectRoot: string,
  workName: string,
  assetFormat: string,
): Array<{ domain: string; invariant: string }> {
  const workFile = resolveWorkFilePath(projectRoot, workName, assetFormat)
  if (!existsSync(workFile)) return []
  const content = readFileSync(workFile, 'utf-8')

  const refsSection = content.match(/## Refs\n([\s\S]*?)(?=\n## |\n# |$)/)
  const domains: string[] = []
  if (refsSection) {
    for (const block of refsSection[1]!.split(/\n(?=### )/)) {
      if (!block.startsWith('### ')) continue
      const name = block.replace(/^### /, '').trim()
      const kind = block.match(/- kind:\s*(\S+)/)?.[1]
      if (kind === 'domain') domains.push(name)
    }
  }

  const inputs: Array<{ domain: string; invariant: string }> = []
  for (const d of domains) {
    const candidates = [
      join(projectRoot, BOUNDARY_DIR, 'domains', `${d}.md`),
      join(projectRoot, BOUNDARY_DIR, 'domains', d.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(), 'domain.md'),
    ]
    for (const p of candidates) {
      if (!existsSync(p)) continue
      const dom = readDomainFile(p)
      if (dom?.language?.invariant) {
        for (const inv of dom.language.invariant) {
          inputs.push({ domain: d, invariant: inv })
        }
      }
      break
    }
  }
  return inputs
}

const finalizeSubcommand = defineCommand({
  meta: {
    name: 'finalize',
    description: '收口 work（汇总所有 round + 写最终状态）',
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    '--verdict': {
      type: 'string',
      description: '最终裁决：PASSED | FAILED | INCONCLUSIVE（默认沿用最后一轮 verdict）',
    },
    '--notes': { type: 'string', description: '收口备注' },
    '--force': { type: 'boolean', description: '忽略 Domain proof 硬阻断，仍记录边界违反并收口' },
    '--dry-run': { type: 'boolean', description: '仅评估 Domain proof，不写 frozen.json' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const verdictRaw = ctx.args.verdict as string | undefined
    const notes = (ctx.args as Record<string, unknown>).notes as string | undefined
    const force = ctx.args.force === true
    const dryRun = ctx.args['dry-run'] === true
    const projectRoot = getProjectRoot()

    let verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | undefined
    if (verdictRaw) {
      if (verdictRaw !== 'PASSED' && verdictRaw !== 'FAILED' && verdictRaw !== 'INCONCLUSIVE') {
        return outputError(
          {
            code: 'OXN_ROUND_VERDICT_INVALID',
            message: `invalid --verdict: ${verdictRaw}`,
            suggestion: 'valid values: PASSED | FAILED | INCONCLUSIVE',
          },
          format,
        )
      }
      verdict = verdictRaw
    }

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    // A2 (D4): 收集 Work 引用 Domain 的 invariant → 评估 Domain proof（边界违反记录）
    const domainProofs = collectWorkDomainProofs(
      projectRoot,
      workName,
      resolveAssetFormat(readProjectConfig(projectRoot)),
    )

    // dry-run：仅评估 Domain proof（若有），输出结果，绝不写 frozen.json / 收口
    if (dryRun) {
      if (domainProofs.length === 0) {
        return output(
          {
            ok: true,
            data: { workName, dryRun: true, domainProofs: [], overallVerdict: 'PASS' },
            human: `Work "${workName}" dry-run: no domain invariants declared (no-op)`,
          },
          format,
        )
      }
      try {
        const res = await finalizeWorkDomains(workName, projectRoot, domainProofs, true)
        return output(
          {
            ok: true,
            data: {
              workName,
              dryRun: true,
              domainProofs: res.node.domainProofs,
              overallVerdict: res.node.overallVerdict,
            },
            human: `Work "${workName}" dry-run: ${res.node.domainProofs.length} domain proof(s), overall=${res.node.overallVerdict}`,
          },
          format,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return output(errorJson('OXN_FINALIZE_DRYRUN_FAILED', message), format)
      }
    }

    let boundaryViolations:
      | Array<{ domain: string; invariant: string; verdict: string; failureMessage?: string }>
      | undefined
    if (domainProofs.length > 0) {
      try {
        const res = await finalizeWorkDomains(workName, projectRoot, domainProofs, force)
        boundaryViolations = res.node.domainProofs.map((e) => ({
          domain: e.domain,
          invariant: e.invariant,
          verdict: e.verdict,
          ...(e.failureMessage ? { failureMessage: e.failureMessage } : {}),
        }))
      } catch (err) {
        // Domain proof FAIL/MANUAL/INCONCLUSIVE 且无 --force → 拒绝收口（OXN_FINALIZE_REJECTED）
        if (err instanceof IAPError) {
          const ctx = err.context as { oxnCode?: unknown } | undefined
          const oxnCode = typeof ctx?.oxnCode === 'string' ? ctx.oxnCode : err.name
          return outputError({ code: oxnCode, message: err.message }, format)
        }
        const message = err instanceof Error ? err.message : String(err)
        return output(errorJson('OXN_FINALIZE_REJECTED', message), format)
      }
    }

    try {
      const { finalizeWork } = await import('@openxenon/engine/Work/dual-state-exec')
      const result = finalizeWork({
        projectRoot,
        workName,
        ...(verdict ? { verdict } : {}),
        ...(notes ? { notes } : {}),
        ...(boundaryViolations ? { boundaryViolations } : {}),
      })
      output(
        {
          ok: true,
          data: {
            workName,
            finalVerdict: result.finalVerdict,
            totalRounds: result.totalRounds,
            finalizedAt: result.finalizedAt,
            boundaryViolations: boundaryViolations ?? [],
            workspace: result.workspace,
          },
          human: renderFinalizeHuman(result),
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
      output(errorJson('OXN_FINALIZE_FAILED', message), format)
    }
  },
})

function renderFinalizeHuman(result: {
  finalVerdict: string
  totalRounds: number
  workspace: { workName: string }
}): string {
  return [
    `Work ${result.workspace.workName} finalized ✓`,
    `  Final verdict: ${result.finalVerdict}`,
    `  Total rounds: ${result.totalRounds}`,
  ].join('\n')
}

function renderNextRoundHuman(result: ReturnType<typeof nextRoundWork>): string {
  const lines: string[] = [
    `Work ${result.workspace.workName}: new round ${result.round} opened`,
    `  Previous verdict: ${result.previousVerdict}`,
    `  History length: ${result.historyLength} (1 active + ${result.historyLength - 1} closed)`,
  ]
  return lines.join('\n')
}

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
          `\n\n  Next: \`oxn work lock ${workName}\` then \`oxn work run ${workName}\`\n` +
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
    validate: validateSubcommand,
    'add-task': addTaskSubcommand,
    'list-task': listTaskSubcommand,
    'task-status': taskStatusSubcommand,
    'verify-task-path': verifyTaskPathSubcommand,
    'edit-task': editTaskSubcommand,
    'delete-task': deleteTaskSubcommand,
    run: runSubcommand,
    submit: submitSubcommand,
    status: statusSubcommand,
    context: contextSubcommand,
    lock: lockSubcommand,
    unlock: unlockSubcommand,
    'next-round': nextRoundSubcommand,
    finalize: finalizeSubcommand,
    migrate: migrateSubcommand,
  },
  run() {
    // No-op: help text is provided by citty
  },
})
