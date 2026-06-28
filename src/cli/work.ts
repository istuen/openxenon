// =============================================================================
// `oxn work` — Work 编排与运行时
//
// 单一实体（Work）的完整生命周期，按"阶段"分组：
//
//   Phase 1: Planning（仅读写 .oxn 图纸）
//     list                            — 浏览所有 work
//     create <name> --blueprint <bp>  — 写 works/<w>/work.oxn
//     validate <name>                 — work.oxn 语法校验
//     add-task <name> --task <t> ...  — 写 works/<w>/tasks/<t>/task.oxn
//     edit-task <name> --task <t> ... — 改 task.oxn 内容
//     list-task <name>                — 列 task 子实体
//     task-status <name> --task <t>   — 读 task.oxn 元信息
//     verify-task-path --work <w> <p> — 验证手写 task.oxn 路径
//     delete-task <name> --task <t>   — 删 task 目录（仅 P1）
//
//   Phase 2: Execution（驱动 .json 状态机）
//     run <name>                      — 启动状态机，落 .run/state.json
//     submit <name> --task <t>        — 推进 task 内 part
//     status <name>                   — 读 .run/state.json 进度
//     context <name> --task <t>       — 渲染 AI 上下文
//
// 命名范式: V1 布局（详见 kernel/constants.ts）
//   - DSL 图纸: work.oxn / task.oxn
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
  statSync,
  unlinkSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { t } from '@openxenon/engine/infra/i18n'
import { join } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR, RUN_DIR, TASK_OXN_FILE, WORK_OXN_FILE, WORK_RUN_STATE_JSON } from '@openxenon/engine/kernel'
import { assertDirNameConsistent } from '@openxenon/engine/kernel'
import { IAPError } from '@openxenon/engine/errors'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import {
  isWorkDeclaration,
  createOxnParser,
  isBlueprintDeclaration,
  type BlueprintDeclaration,
  isDomainDeclaration,
  isPartDeclaration,
  type PartDeclaration,
  type WorkContext,
  type WorkDeclaration,
  type OXNDocument as OxnAstDocument,
} from '@openxenon/engine/oxl'
import { runTask, runWork, submitTask, nextRoundWork } from '../work'
import {
  ensureWorkDir,
  getTaskOxnPath,
  getTaskStatePath,
  getWorkOxnPath,
  getWorkGatePath,
  getWorksDir,
  getTasksDir,
  getWorkMdPath,
  loadTaskState,
  loadWorkState,
  workStateExists,
} from '../work/dual-state-io'
import {
  buildPerWorkDomainsIndex,
  writePerWorkDomainsIndex,
  getPerWorkDomainsJsonPath,
  resolveDomainFile,
} from '../work/per-work-domains-merger'
import {
  buildPerWorkBlueprintsIndex,
  writePerWorkBlueprintsIndex,
  getPerWorkBlueprintsJsonPath,
  resolveBlueprintFile,
} from '../work/per-work-blueprints-merger'
import {
  buildDomainDiagnostic,
  buildBlueprintDiagnostic,
  type RefDiagnostic,
} from '@openxenon/engine/oxl/compiler/ref-diagnostic'
import {
  applyPlanLock,
  createBirthCert,
  clearPlanLock,
  readWorkFile as readBirthCert,
  verifyPlanLock,
  writeWorkFile,
  type WorkMode,
  type BirthCert,
  type DomainAssetEntry,
  type BlueprintAssetEntry,
} from '../work/birth-cert'
import { hashFile, hashWorkPlan } from '../work/plan-hash'
import { readProjectConfig } from './project-config-io'
import {
  resolveAssetPrimaryPath,
  resolveAssetAltPath,
  resolveAssetFormat,
  resolveAutoSync,
  type AssetFormat,
} from '@openxenon/engine/infra/paths'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractWorkIR } from '@openxenon/engine/oxl/md-pipeline/transformers/work.js'
import { serializeWorkToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import { migrateWorkToV1 } from '../work/work-migrator'

// ---------------------------------------------------------------------------
// 报告层类型（派生自 WorkspaceState，CLI 报告使用）
// ---------------------------------------------------------------------------

type WorkStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error'

interface DerivedSkillSnapshot {
  lifecycle: string
  objective: string
  acceptance: string[]
  guidance?: string
}

interface DerivedPartExecution {
  partName: string
  align: string
  status: WorkStatus
  startedAt?: string
  completedAt?: string
  durationMs?: number
  probes: Array<{
    probeName: string
    passed: boolean
    output?: unknown
    errorMessage?: string
    durationMs?: number
    executedAt?: string
  }>
  skill?: DerivedSkillSnapshot
}

interface DerivedPartSpec {
  partName: string
  align: string
  ref?: string
  skill: DerivedSkillSnapshot
}

interface DerivedSkillContext {
  overallGoal: string
  constraints: string[]
  maxIterations: number
}

interface DerivedWorkState {
  workName: string
  status: WorkStatus
  currentPart: string | null
  completedParts: string[]
  loopMeta: { currentIteration: number; maxIterations: number }
  frozenPath: string | null
  createdAt: string
  updatedAt: string
  skillContext?: DerivedSkillContext
  partSpecs?: DerivedPartSpec[]
  partExecutions?: DerivedPartExecution[]
}

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

/**
 * 把 workType (--type) 映射到 .work.mode 枚举。
 * 非法值兜底为 'task'，并在 response.warnings 里报告。
 */
function workTypeToMode(workType: string): { mode: WorkMode; warning?: string } {
  if (workType === 'task' || workType === 'explore' || workType === 'edit') {
    return { mode: workType }
  }
  return { mode: 'task', warning: `unknown workType "${workType}" → mode fallback to "task"` }
}

interface UnresolvedRef {
  kind: 'domain' | 'blueprint'
  name: string
  ref: string | null
  reason: string
}

interface ValidateArtifactsResult {
  ok: boolean
  /** 仅当 ok=true 时有值 */
  artifacts?: {
    domainsJsonPath: string
    blueprintsJsonPath: string
    workFilePath: string
    assetCounts: { domains: number; blueprints: number; tasks: number }
  }
  /** 仅当 ok=false 时有值 */
  unresolved?: UnresolvedRef[]
  warnings: string[]
}

/**
 * PR-6: 解析 work.oxn 资源池引用 → 落 3 个产物。
 *
 * 行为：
 *   1. 用 PR-3 merger 扫描 work.oxn 中 domain/blueprint ref 列表
 *   2. 解析每个 ref（@prj/domains/X、@prj/blueprints/X、bare name fallback）
 *   3. 全部解析成功 → 写 domains.json + blueprints.json + .work
 *   4. 任一解析失败 → 不写任何产物，返回 unresolved 列表
 *
 * .work 写策略：
 *   - 已存在 + 已 lock（planLock !== null）→ 拒绝覆盖，错误返回
 *   - 已存在 + 未 lock → 刷新（planLock=null；assets 重写）
 *   - 不存在 → 全新创建
 *
 * 这保证：lock 后的图纸不能被 validate 静默改写。
 */
async function validateAndWriteArtifacts(params: {
  projectRoot: string
  workName: string
  work: WorkDeclaration
  workType: string
  /** 显式 task.oxn 缺失列表（已经过 parseOxnFile + 任务存在性检查） */
  missingTaskOxn: string[]
}): Promise<ValidateArtifactsResult> {
  const { projectRoot, workName, work, workType, missingTaskOxn } = params
  const warnings: string[] = []

  // ── 1. 跑 merger 解析 domain/blueprint ref ──
  const workOxnPath = getWorkOxnPath(projectRoot, workName)
  const domainsIdx = await buildPerWorkDomainsIndex({ projectRoot, workName, workOxnPath })
  const blueprintsIdx = buildPerWorkBlueprintsIndex({ projectRoot, workName, workOxnPath })

  // ── 2. 收集 unresolved ──
  const unresolved: UnresolvedRef[] = []
  for (const d of domainsIdx.domains) {
    if (d.status === 'invalid') {
      unresolved.push({
        kind: 'domain',
        name: d.name,
        ref: d.ref,
        reason: d.errors[0] ?? 'invalid',
      })
    }
  }
  for (const b of blueprintsIdx.blueprints) {
    if (b.status === 'invalid') {
      unresolved.push({
        kind: 'blueprint',
        name: b.name,
        ref: b.ref,
        reason: b.errors[0] ?? 'invalid',
      })
    }
  }
  for (const t of missingTaskOxn) {
    unresolved.push({
      kind: 'blueprint', // 复用 kind 字段语义不严格；这里 task 缺失算 work-level 错误
      name: t,
      ref: null,
      reason: `task "${t}" declared in work.oxn but tasks/${t}/task.oxn missing`,
    })
  }

  if (unresolved.length > 0) {
    return { ok: false, unresolved, warnings }
  }

  // ── 3. 写 domains.json + blueprints.json ──
  const domainsJsonPath = getPerWorkDomainsJsonPath(projectRoot, workName)
  const blueprintsJsonPath = getPerWorkBlueprintsJsonPath(projectRoot, workName)
  await writePerWorkDomainsIndex({ projectRoot, workName, workOxnPath, outPath: domainsJsonPath })
  writePerWorkBlueprintsIndex({
    projectRoot,
    workName,
    workOxnPath,
    outPath: blueprintsJsonPath,
  })

  // ── 4. 构建 + 写 .work birth cert ──
  const { mode, warning: modeWarn } = workTypeToMode(workType)
  if (modeWarn) warnings.push(modeWarn)

  // 检查现有 .work 是否 lock：lock 后不允许 validate 覆盖
  const existing = readBirthCert(projectRoot, workName)
  if (existing.ok && existing.cert.planLock !== null) {
    return {
      ok: false,
      warnings: [
        ...warnings,
        `work is locked (planLock.lockedAt=${existing.cert.planLock.lockedAt}); ` +
          `validate refuses to overwrite .work. Run \`oxn work unlock ${workName}\` first.`,
      ],
    }
  }

  // 资产列表：fileHash 必须 64-hex；ref 解析已成功 → 一定能算
  const domainAssets: DomainAssetEntry[] = domainsIdx.domains.map((d) => ({
    name: d.name,
    scope: d.scope,
    version: 1,
    fileHash: hashFile(join(projectRoot, d.file)) ?? '',
  }))
  const blueprintAssets: BlueprintAssetEntry[] = blueprintsIdx.blueprints.map((b) => ({
    name: b.name,
    version: b.version,
    fileHash: hashFile(join(projectRoot, b.file)) ?? '',
  }))

  // 校验所有 fileHash 真的算出来了（防御性：resolved=true 但 hash 缺失）
  for (const a of [...domainAssets, ...blueprintAssets]) {
    if (!/^[0-9a-f]{64}$/.test(a.fileHash)) {
      return {
        ok: false,
        warnings: [...warnings, `fileHash missing for ${a.name} (file unreadable after resolve)`],
      }
    }
  }

  // work.oxn context → goal / constraints
  // v0.4.1: loopPolicy 移出 WorkContext, 改读 work.loopPolicy
  const goal = work.context?.goal ?? ''
  const constraints = work.context?.constraints ?? []
  const maxIterations = (work as { loopPolicy?: { maxIterations?: number } }).loopPolicy?.maxIterations ?? 3

  const cert: BirthCert = createBirthCert({
    workName,
    mode,
    goal,
    constraints,
    maxIterations,
    assets: { domains: domainAssets, blueprints: blueprintAssets },
  })
  // 保留旧 cert 的 createdAt（如果存在）以稳定时间戳
  if (existing.ok) {
    cert.createdAt = existing.cert.createdAt
  }
  writeWorkFile(projectRoot, workName, cert)

  return {
    ok: true,
    artifacts: {
      domainsJsonPath,
      blueprintsJsonPath,
      workFilePath: getWorkGatePath(projectRoot, workName),
      assetCounts: {
        domains: domainAssets.length,
        blueprints: blueprintAssets.length,
        tasks: (work.tasks ?? []).length,
      },
    },
    warnings,
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

function snapshotContext(
  ctx: WorkContext | undefined,
  maxIters: number,
  loopPolicy: { maxIterations?: number } | undefined,
): DerivedSkillContext {
  return {
    overallGoal: ctx?.goal ?? '',
    constraints: ctx?.constraints ?? [],
    // v0.4.1: loopPolicy 移出 WorkContext, 改读独立参数
    maxIterations: loopPolicy?.maxIterations ?? maxIters,
  }
}

function partStatus(partName: string, state: DerivedWorkState): 'pending' | 'running' | 'passed' | 'failed' {
  if (state.completedParts.includes(partName)) return 'passed'
  if (state.currentPart === partName) return 'running'
  return 'pending'
}

function makeContextJson(
  ctx: DerivedSkillContext | undefined,
  currentFocus: string,
  state: DerivedWorkState,
): {
  overallGoal: string
  constraints: string[]
  currentFocus: string
  loopPolicy: { currentIteration: number; maxIterations: number }
} {
  return {
    overallGoal: ctx?.overallGoal ?? '',
    constraints: ctx?.constraints ?? [],
    currentFocus,
    loopPolicy: {
      currentIteration: state.loopMeta.currentIteration,
      maxIterations: state.loopMeta.maxIterations,
    },
  }
}

function makeReport(state: DerivedWorkState): {
  workName: string
  overallStatus: 'pending' | 'running' | 'passed' | 'failed' | 'error'
  skillContext: {
    overallGoal: string
    constraints: string[]
    currentFocus: string
    loopPolicy: { currentIteration: number; maxIterations: number }
  }
  parts: Array<{
    partName: string
    align: string
    ref?: string
    lifecycle: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    stepSkillContext: { lifecycle: string; objective: string; acceptance: string[]; guidance?: string }
    probeResults: Array<{
      probe: string
      passed: boolean
      output?: unknown
      errorMessage?: string
      durationMs?: number
    }>
  }>
  loopMeta: { isLooping: boolean; iteration: number; maxIterations: number }
  frozen: string | null
} {
  const partSpecs = state.partSpecs ?? []
  const executions = state.partExecutions ?? []
  const execByName = new Map<string, DerivedPartExecution>()
  for (const ex of executions) execByName.set(ex.partName, ex)

  return {
    workName: state.workName,
    overallStatus: state.status,
    skillContext: makeContextJson(state.skillContext, state.currentPart ?? '', state),
    parts: partSpecs.map((p) => {
      const exec = execByName.get(p.partName)
      return {
        partName: p.partName,
        align: p.align,
        ...(p.ref !== undefined ? { ref: p.ref } : {}),
        lifecycle: p.skill.lifecycle,
        status: partStatus(p.partName, state),
        stepSkillContext: {
          lifecycle: p.skill.lifecycle,
          objective: p.skill.objective,
          acceptance: p.skill.acceptance,
          ...(p.skill.guidance !== undefined ? { guidance: p.skill.guidance } : {}),
        },
        probeResults: (exec?.probes ?? []).map((pr) => ({
          probe: pr.probeName,
          passed: pr.passed,
          ...(pr.output !== undefined ? { output: pr.output } : {}),
          ...(pr.errorMessage !== undefined ? { errorMessage: pr.errorMessage } : {}),
          ...(pr.durationMs !== undefined ? { durationMs: pr.durationMs } : {}),
        })),
      }
    }),
    loopMeta: {
      isLooping: state.loopMeta.currentIteration > 0,
      iteration: state.loopMeta.currentIteration,
      maxIterations: state.loopMeta.maxIterations,
    },
    frozen: state.frozenPath,
  }
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

async function parseOxnFile(
  filePath: string,
): Promise<{ doc: OxnAstDocument; work: WorkDeclaration | null; parts: PartDeclaration[] }> {
  const parser = createOxnParser()
  const content = readTextFile(filePath)
  const result = await parser.parse(content, URI.file(filePath))
  if (result.parseErrors.length > 0 || result.lexerErrors.length > 0) {
    throw new Error(`DSL parse failed: ${[...result.parseErrors, ...result.lexerErrors].join('; ')}`)
  }
  const doc = result.ast as OxnAstDocument
  const work = doc.entities.find(isWorkDeclaration) ?? null
  const parts = doc.entities.filter(isPartDeclaration)
  return { doc, work, parts }
}

// v0.5 Phase 3: format-aware work file loader
//   - .oxn → 直接 langium 解析
//   - .md  → parseMarkdown → extractWorkIR → serializeWorkToOxn → 内存 langium 解析
// 返回 WorkDeclaration + inline parts,失败抛 OXNCrash
async function validateWorkFile(filePath: string): Promise<{
  ok: boolean
  doc?: OxnAstDocument
  work?: WorkDeclaration
  parts?: PartDeclaration[]
  errors: string[]
}> {
  if (!existsSync(filePath)) {
    return { ok: false, errors: [`work file not found: ${filePath}`] }
  }
  // v0.5 Phase 3: .md 走 md-pipeline 路径
  if (filePath.endsWith('.md')) {
    return validateWorkFromMd(filePath)
  }
  try {
    const r = await parseOxnFile(filePath)
    if (!r.work) {
      return { ok: false, errors: ['no WorkDeclaration found in file'] }
    }
    return { ok: true, doc: r.doc, work: r.work, parts: r.parts, errors: [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: [message] }
  }
}

async function validateWorkFromMd(filePath: string): Promise<{
  ok: boolean
  doc?: OxnAstDocument
  work?: WorkDeclaration
  parts?: PartDeclaration[]
  errors: string[]
}> {
  const content = readTextFile(filePath)
  let ir: import('@openxenon/engine/oxl/md-pipeline/transformers/work').WorkIR
  try {
    const parsed = parseMarkdown(content)
    ir = extractWorkIR(parsed.tree, parsed.frontmatter)
  } catch (e) {
    return {
      ok: false,
      errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`],
    }
  }
  // IR → 临时 .oxn → 走 langium 拿到 AST (下游 buildPartSpecs 等需要 WorkDeclaration)
  const oxnContent = serializeWorkToOxn(ir)
  const parser = createOxnParser()
  const r = await parser.parse(oxnContent, URI.file(`${filePath}.oxn`))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const doc = r.ast as OxnAstDocument
  const work = doc.entities.find(isWorkDeclaration) ?? null
  const parts = doc.entities.filter(isPartDeclaration)
  if (!work) {
    return { ok: false, doc, errors: ['no WorkDeclaration derived from md'] }
  }
  return { ok: true, doc, work, parts, errors: [] }
}

async function buildPartSpecs(
  work: WorkDeclaration,
  inlineParts: PartDeclaration[],
): Promise<
  Array<{
    partName: string
    align: string
    skill: { lifecycle: string; objective: string; acceptance: string[]; guidance?: string }
  }>
> {
  const inlineByName = new Map<string, PartDeclaration>()
  for (const p of inlineParts) inlineByName.set(parsePartName(p.name), p)

  const taskEntries = work.tasks ?? []
  const specs: Array<{
    partName: string
    align: string
    skill: { lifecycle: string; objective: string; acceptance: string[]; guidance?: string }
  }> = []
  for (const task of taskEntries) {
    const partName = parsePartName(task.name)
    // v0.3 follow-up: task.blueprint 在 body[] 内
    const taskBody = (task.body ?? []) as Array<{ $type: string; blueprint?: string }>
    const taskBlueprint = taskBody.find((el) => el.$type === 'TaskBlueprintField')?.blueprint
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
        lifecycle: p.skill?.lifecycle ?? 'code',
        objective: p.skill?.objective ?? '',
        acceptance: p.skill?.acceptance ?? [],
        ...(p.skill?.guidance !== undefined ? { guidance: p.skill.guidance } : {}),
      },
    }))
  }

  return specs
}

function renderWorkSkeleton(
  workName: string,
  blueprintName: string,
  slots: Array<{ name: string; align: string }>,
  format: AssetFormat = 'oxn',
): string {
  if (format === 'md') {
    const partEntries = slots
      .map((s) => {
        return `### ${s.name}
- blueprint: ${blueprintName}
- part: slot-name
  - skill_context: TODO: 描述 ${s.name} 阶段要做什么`
      })
      .join('\n\n')
    return `---
entity: work
version: 0.3.0
name: ${workName}
---

# Work: ${workName}

## Context

### primary
- goal: TODO: 描述这个 work 要达成什么
- max_iterations: 3
- constraints:
  - TODO: 列出硬约束

## LoopPolicy

### primary
- max_iterations: 3

## Refs

### ${blueprintName}
- kind: blueprint
- ref: "@prj/blueprints/${blueprintName}"

## Tasks

${partEntries}
`
  }
  const header = [
    `// Generated by \`oxn work create\` from blueprint "${blueprintName}"`,
    `// Edit goal/constraints and each task's objective, then run:`,
    `//   oxn work run <name>`,
    '',
  ].join('\n')
  const partEntries = slots
    .map((s) => {
      return `  task "${s.name}" {
    blueprint "${blueprintName}"
    part "slot-name" {
      skill_context = "TODO: 描述 ${s.name} 阶段要做什么"
    }
  }`
    })
    .join('\n')
  return `${header}work "${workName}" {
  context {
    goal = "TODO: 描述这个 work 要达成什么";
    constraints = [
      "TODO: 列出硬约束"
    ];
    } loop_policy {
      max_iterations = 3;
    }

  blueprint "${blueprintName}" ref "@prj/blueprints/${blueprintName}";

${partEntries}
}
`
}

// ---------------------------------------------------------------------------
// Phase guards
// ---------------------------------------------------------------------------

function guardWorkNotStarted<T>(
  projectRoot: string,
  workName: string,
  format: ReturnType<typeof getFormatFromArgs>,
  onOk: () => T,
): T | { __guardError: true } {
  if (workStateExists(projectRoot, workName)) {
    outputError(
      {
        code: 'OXN_WORK_ALREADY_RUNNING',
        message: t('work.alreadyRunning', { workName }),
        suggestion: t('work.modifyHint'),
      },
      format,
    )
    return { __guardError: true }
  }
  return onOk()
}

function guardWorkStarted<T>(
  projectRoot: string,
  workName: string,
  format: ReturnType<typeof getFormatFromArgs>,
  onOk: () => T,
): T | { __guardError: true } {
  if (!workStateExists(projectRoot, workName)) {
    outputError(
      {
        code: 'OXN_WORK_NOT_STARTED',
        message: t('work.notStarted', { workName }),
        suggestion: t('work.notStartedHint'),
      },
      format,
    )
    return { __guardError: true }
  }
  return onOk()
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
      description: t('work.create.args.blueprint'),
    },
    'blueprint-file': { type: 'string', description: t('work.create.args.blueprintPath') },
    'output-dir': { type: 'string', description: t('work.create.args.outputDir') },
    type: { type: 'string', alias: 't', default: 'task', description: t('work.create.args.workType') },
    force: { type: 'boolean', description: t('work.create.args.force') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const workType = (ctx.args.type as string) || 'task'
    const customBlueprint = ctx.args['blueprint-file'] as string | undefined
    const blueprintNameArg = ctx.args.blueprint as string | undefined
    const customOutputDir = ctx.args['output-dir'] as string | undefined
    const force = ctx.args.force === true
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)
    const autoSync = resolveAutoSync(config)

    if (!projectBoundaryExists()) {
      return outputError(
        { code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit'), suggestion: t('errors.initHint') },
        format,
      )
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
      const defaultCandidates = blueprintNameArg
        ? [
            join(projectRoot, '.openxenon', 'blueprints', `${blueprintNameArg}.oxn`),
            join(projectRoot, '.openxenon', 'blueprints', blueprintNameArg, 'blueprint.oxn'),
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
        const { doc } = await parseOxnFile(absBlueprint)
        const blueprint = doc.entities.find(isBlueprintDeclaration) as BlueprintDeclaration | undefined
        if (!blueprint) {
          return outputError(
            { code: 'OXN_NO_BLUEPRINT', message: `No Blueprint declaration found in ${absBlueprint}` },
            format,
          )
        }
        if (!blueprint.name) {
          return outputError({ code: 'OXN_INVALID_BLUEPRINT', message: 'Blueprint has no name' }, format)
        }
        if (blueprint.partSlots.length === 0) {
          return outputError(
            { code: 'OXN_INVALID_BLUEPRINT', message: `Blueprint "${blueprint.name}" has no part slots` },
            format,
          )
        }
        const resolvedBlueprintName = parsePartName(blueprint.name)
        const slots = blueprint.partSlots.map((s) => ({
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
            `${assetFormat === 'oxn' ? 'work.oxn' : 'work.md'} already exists in ${outputDir}`,
            {
              suggestion: 'use --force to overwrite',
              format,
            },
          )
        }
        const workContent = renderWorkSkeleton(workName, resolvedBlueprintName, slots, assetFormat)
        writeFileSync(workFile, workContent, 'utf-8')

        // v0.5 Phase 3: auto-sync to other format
        if (autoSync) {
          try {
            if (assetFormat === 'oxn') {
              // .oxn → .md
              const altResult = await compileOxnToMd(workContent, { entity: 'work', frontmatter: true })
              writeFileSync(workAltPath, altResult.md, 'utf-8')
            } else {
              // .md → .oxn
              const { tree, frontmatter: fm } = parseMarkdown(workContent)
              const ir = extractWorkIR(tree, fm)
              const altContent = serializeWorkToOxn(ir)
              writeFileSync(workAltPath, altContent, 'utf-8')
            }
          } catch {
            // autoSync 失败不阻断主命令
          }
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
                version: blueprint.version ?? 1,
                slotCount: slots.length,
                slots: slots.map((s) => s.name),
              },
              files: { work: workFile },
              nextStep: `Edit the file, then run: oxn work add-task <name> --task <slot> --blueprint ${resolvedBlueprintName}\n  oxn work run <name>`,
            },
          },
          format,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return output(errorJson('OXN_DSL_PARSE_FAILED', message), format)
      }
    }

    // 无 blueprint：写 .openxenon/work/<type>/<id>.oxn 简化骨架（旧 mvp 路径）
    // v0.5 Phase 3: 路径由 config 决定
    const workDir = join(projectRoot, BOUNDARY_DIR, 'work', workType)
    if (!existsSync(workDir)) {
      ensureDirectory(workDir)
    }

    // v0.5 Phase 3: 主路径由 config.assetFormat 决定（与 blueprint-based 路径对称）
    const workFileFinal = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
    const workAltFileFinal = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
    const workFileDir = join(workFileFinal, '..')
    if (!existsSync(workFileDir)) mkdirSync(workFileDir, { recursive: true })
    if (existsSync(workFileFinal)) {
      return outputError({ code: 'OXN_WORK_EXISTS', message: t('work.workExists', { workName, workType }) }, format)
    }

    const workOxnContent = renderWorkSkeleton(
      workName,
      'TODO-blueprint',
      [{ name: 'stage-1', align: 'TODO' }],
      assetFormat,
    )
    writeFileSync(workFileFinal, workOxnContent, 'utf-8')

    // autoSync
    if (autoSync) {
      try {
        if (assetFormat === 'oxn') {
          const altResult = await compileOxnToMd(workOxnContent, { entity: 'work', frontmatter: true })
          writeFileSync(workAltFileFinal, altResult.md, 'utf-8')
        } else {
          const { tree, frontmatter: fm } = parseMarkdown(workOxnContent)
          const ir = extractWorkIR(tree, fm)
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
          type: workType,
          path: workFileFinal,
        },
        human: t('work.created', { workName, workType, workFilePath: workFileFinal }),
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
    type: { type: 'string', description: t('work.validate.args.type') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const workType = (ctx.args.type as string | undefined) ?? 'task'
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    // v0.5 Phase 3: 路径由 config.assetFormat 决定（默认 oxn），但若主格式不存在,
    // 自动 fall back 到 alt 格式 (向后兼容老 .oxn-only 项目)
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
    const altPath = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
    const legacyPath = getWorkOxnPath(projectRoot, workName)
    const workFile = existsSync(primaryPath)
      ? primaryPath
      : existsSync(altPath)
        ? altPath
        : existsSync(legacyPath)
          ? legacyPath
          : primaryPath // 默认指向主格式,validate 时报 OXN_WORK_NOT_FOUND
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

    // ── 1.5 v1.1: work.oxn 内 `work "X"` 与目录名 <w> 一致性校验（macOS-safe）
    // 与 oxn domain/blueprint validate 对称：CLI 硬阻断,目录式布局下用 assertDirNameConsistent。
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

    // ── 2. 检查 task.oxn 是否都已建（沿用现有逻辑） ──
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
      workType,
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
          workType: 'workspace',
          mode: workTypeToMode(workType).mode,
          blueprintRef: work.blueprints?.[0]?.name,
          valid: true,
          errors: [],
          warnings: result.warnings,
          artifacts: {
            domainsJson: a.domainsJsonPath,
            blueprintsJson: a.blueprintsJsonPath,
            workFile: a.workFilePath,
          },
          assetCounts: a.assetCounts,
        },
        human:
          `Work validate OK\n` +
          `  Mode:        ${workTypeToMode(workType).mode}\n` +
          `  Domain refs: ${a.assetCounts.domains} resolved\n` +
          `  Blueprint refs: ${a.assetCounts.blueprints} resolved\n` +
          `  Task count:  ${a.assetCounts.tasks}\n` +
          `\n  Artifacts written:\n` +
          `    - ${a.domainsJsonPath}\n` +
          `    - ${a.blueprintsJsonPath}\n` +
          `    - ${a.workFilePath}` +
          (result.warnings.length > 0 ? `\n\n  Warnings: ${result.warnings.join(' | ')}` : ''),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: add-task (Phase 1: P1 守卫 + 写 task.oxn)
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
    const addGuard = guardWorkNotStarted(projectRoot, workName, format, () => null)
    if (addGuard) return

    // v0.5 Phase 3: 路径由 config.assetFormat 决定 (fallback primary → alt → legacy)
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
    const altPath = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
    const legacyPath = getWorkOxnPath(projectRoot, workName)
    const workFile = existsSync(primaryPath)
      ? primaryPath
      : existsSync(altPath)
        ? altPath
        : existsSync(legacyPath)
          ? legacyPath
          : primaryPath
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

    const taskDir = getWorkTaskDir(workName, taskName)
    const taskFile = getWorkTaskFile(workName, taskName)
    if (existsSync(taskFile) && !force) {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `task.oxn already exists at ${taskFile}`, {
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
      if (validated.ok && validated.doc) {
        allowedBlueprints = validated.doc.entities
          .filter(isBlueprintDeclaration)
          .map((bp) => bp.name)
          .filter((n): n is string => typeof n === 'string' && n.length > 0)
        allowedDomains = validated.doc.entities
          .filter(isDomainDeclaration)
          .map((d) => d.name)
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

    const domainLine = domainName ? `  domain "${domainName}"` : ''
    const template = `// Task: ${taskName} (work: ${workName}, blueprint: ${blueprintName})
// Created by: oxn work add-task <name> --task ${taskName} --blueprint ${blueprintName} ${domainName ? `--domain ${domainName}` : ''}
//
// 任务执行：
//   oxn work status <name>
//   oxn work context <name> --task ${taskName}

task "${taskName}" {
  blueprint "${blueprintName}"
${domainLine}
  part "slot-name" {
    skill_context = "TODO: 描述 AI 执行指令"
  }
}
`
    ensureDirectory(taskDir)
    writeFileSync(taskFile, template, 'utf-8')

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
        const content = readFileSync(file, 'utf-8')
        const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)
        const domainMatch = content.match(/domain\s+"([^"]+)"/)
        return {
          name,
          file,
          blueprint: blueprintMatch?.[1],
          domain: domainMatch?.[1],
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
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task.oxn not found at ${taskFile}` }, format)
    }

    const content = readFileSync(taskFile, 'utf-8')
    const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)
    const blueprint = blueprintMatch?.[1]
    const domainMatch = content.match(/domain\s+"([^"]+)"/)
    const domain = domainMatch?.[1]
    const taskNameMatch = content.match(/task\s+"([^"]+)"/)
    const parsedName = taskNameMatch?.[1]

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
// Subcommand: verify-task-path — 提交手写后的 task.oxn 路径验证
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

    // 2) 文件名必须是 task.oxn？
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
    const content = readFileSync(filePath, 'utf-8')
    const taskNameMatch = content.match(/task\s+"([^"]+)"/)
    const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)
    const domainMatch = content.match(/domain\s+"([^"]+)"/)
    const partCount = (content.match(/part\s+"[^"]+"/g) ?? []).length

    const taskName = taskNameMatch?.[1] ?? '(unknown)'
    const taskDirName = filePath.split('/').slice(-2, -1)[0]

    output(
      {
        ok: true,
        data: {
          workName,
          path: filePath,
          taskName,
          taskDirName,
          blueprint: blueprintMatch?.[1],
          domain: domainMatch?.[1],
          partCount,
        },
        human: t('work.verifyTaskPath.passed', {
          workName,
          taskName,
          taskDirName,
          blueprint: blueprintMatch?.[1] ?? '(none)',
          domain: domainMatch?.[1] ?? '(none)',
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
    const editGuard = guardWorkNotStarted(projectRoot, workName, format, () => null)
    if (editGuard) return

    const taskFile = getWorkTaskFile(workName, taskName)
    if (!existsSync(taskFile)) {
      return outputError({ code: 'OXN_TASK_NOT_FOUND', message: `task.oxn not found at ${taskFile}` }, format)
    }
    let content = readFileSync(taskFile, 'utf-8')

    if (newObjective !== undefined) {
      const replaced = content.replace(
        /objective\s*=\s*"((?:[^"\\]|\\.)*)"/,
        `objective = "${newObjective.replace(/"/g, '\\"')}"`,
      )
      if (replaced === content) {
        return outputError(
          { code: 'OXN_EDIT_NO_OBJECTIVE', message: 'task.oxn has no objective field; cannot update' },
          format,
        )
      }
      content = replaced
    }

    if (addConstraint) {
      const newConstraint = addConstraint.replace(/"/g, '\\"')
      const re = /(constraints\s*=\s*\[)([^\]]*?)(\])/m
      if (re.test(content)) {
        content = content.replace(re, (_m, head, body, tail) => {
          if (body.trim() === '') {
            return `${head}"${newConstraint}"${tail}`
          }
          const newBody =
            body.trimEnd().endsWith(',') || body.trimEnd() === ''
              ? `${body} "${newConstraint}",`
              : `${body}, "${newConstraint}",`
          return `${head}${newBody} ${tail}`
        })
      } else {
        content = content.replace(
          /(context\s*\{)([^}]*?)(\})/m,
          (_m, head, body, tail) => `${head}\n    constraints = ["${newConstraint}"];${body}${tail}`,
        )
      }
    }

    if (addDomain) {
      // v0.5 Phase 3: 路径由 config.assetFormat 决定
      const primaryPath = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
      const altPath = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
      const legacyPath = getWorkOxnPath(projectRoot, workName)
      const workFile = existsSync(primaryPath)
        ? primaryPath
        : existsSync(altPath)
          ? altPath
          : existsSync(legacyPath)
            ? legacyPath
            : primaryPath
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
      if (/\bblueprint\b/.test(content)) {
        content = content.replace(/(blueprint\s+"[^"]+"\s*;)/, `$1\n  domain "${addDomain}";`)
      } else {
        content = content.replace(/(task\s+"[^"]+"\s*\{)/, `$1\n  domain "${addDomain}";`)
      }
    }

    writeFileSync(taskFile, content, 'utf-8')
    output(
      { ok: true, data: { workName, taskName, file: taskFile, edited: true }, human: `Edited task.oxn at ${taskFile}` },
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
    const deleteGuard = guardWorkNotStarted(projectRoot, workName, format, () => null)
    if (deleteGuard) return

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
    try {
      // PR-8: 锁守卫优先于 work.oxn 缺失检查——
      //   若 work.oxn 缺失是因为 lock 后被删（不是初建），应报 WORK_REMOVED 而非 NOT_FOUND，
      //   语义更准（"你锁的计划被破坏了" vs "你这 work 根本不存在"）。
      //   因此先调 lock 校验，再做 work.oxn 缺失检查。
      const birthCert = readBirthCert(projectRoot, workName)
      if (birthCert.ok && birthCert.cert.planLock !== null) {
        // 已有 planLock；再做 hash 校验（这一步会捕获 work.oxn 缺失 → work-removed）
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

      const primaryPath = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
      const altPath = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
      const legacyPath = getWorkOxnPath(projectRoot, workName)
      const filePath = existsSync(primaryPath)
        ? primaryPath
        : existsSync(altPath)
          ? altPath
          : existsSync(legacyPath)
            ? legacyPath
            : primaryPath
      if (!existsSync(filePath)) {
        return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work file not found at ${filePath}` }, format)
      }
      // v0.5 Phase 3: .md 走 md-pipeline 路径, .oxn 走 langium 解析
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
      const inlineParts = result.parts ?? []

      if (workStateExists(projectRoot, workName)) {
        return output(
          errorJson(
            'OXN_WORK_ALREADY_EXISTS',
            `work "${workName}" already exists`,
            'use `oxn work status <name>` to view',
          ),
          format,
        )
      }

      ensureWorkDir(projectRoot, workName)

      const blueprintNames = (work.blueprints ?? []).map((u) => u.name)
      const domainNames = (work.domains ?? []).map((u) => u.name)
      const taskEntries = work.tasks ?? []
      const declaredTaskNames = taskEntries.map((t) => parsePartName(t.name))

      // 校验 task.oxn 是否都已建
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
            `work "${workName}" declares ${declaredTaskNames.length} tasks but ${missing.length} task.oxn missing: ${missing.join(', ')}`,
            `create them with: oxn work add-task <name> --task <task> --blueprint <bp>`,
          ),
          format,
        )
      }

      const partSpecs = await buildPartSpecs(work, inlineParts)
      // v0.4.1: loopPolicy 移出 WorkContext, 改读 work.loopPolicy
      const maxIters = (work as { loopPolicy?: { maxIterations?: number } }).loopPolicy?.maxIterations ?? 3

      // PR-14c: 收集未解析的 ref diagnostics，持久化到 .run/state.json
      const runDiagnostics: RefDiagnostic[] = []
      for (const d of work.domains ?? []) {
        if (!resolveDomainFile(d.ref ?? null, d.name, projectRoot)) {
          const reason = d.ref?.startsWith('@oxn/')
            ? '@oxn/ scope has no builtin domain registry (V1)'
            : `domain file not found for ref "${d.ref ?? d.name}"`
          runDiagnostics.push(buildDomainDiagnostic(d.name, d.ref ?? null, reason))
        }
      }
      for (const b of work.blueprints ?? []) {
        if (!resolveBlueprintFile(b.ref ?? null, b.name, projectRoot)) {
          const reason = b.ref?.startsWith('@oxn/')
            ? '@oxn/ scope has no builtin blueprint registry (V1)'
            : `blueprint file not found for ref "${b.ref ?? b.name}"`
          runDiagnostics.push(buildBlueprintDiagnostic(b.name, b.ref ?? null, reason))
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
          // v0.3 follow-up: task.blueprint 在 body[] 内
          const tBody = (t.body ?? []) as Array<{ $type: string; blueprint?: string }>
          const tBlueprint = tBody.find((el) => el.$type === 'TaskBlueprintField')?.blueprint
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
        const content = readFileSync(taskOxnPath, 'utf-8')
        const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)
        const blueprint = blueprintMatch?.[1] ?? blueprintNames[0] ?? ''
        const injects = Array.from(content.matchAll(/inject\s+"([^"]+)"/g)).map((m) => m[1]!)
        const slotNames = Array.from(content.matchAll(/part\s+"([^"]+)"\s*\{/g)).map((m) => m[1]!)
        const objectiveMatch = content.match(/objective\s*=\s*"((?:[^"\\]|\\.)*)"/)
        const constraintsMatch = content.match(/constraints\s*=\s*\[([^\]]*)\]/)
        const constraints = constraintsMatch
          ? Array.from(constraintsMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!)
          : []

        runTask({
          projectRoot,
          workName,
          taskName,
          blueprint,
          injects,
          partNames: slotNames,
          objective: objectiveMatch?.[1]?.replace(/\\"/g, '"'),
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
    const submitGuard = guardWorkStarted(projectRoot, workName, format, () => null)
    if (submitGuard) return

    try {
      const result = submitTask({
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
type WorkFileSummary = {
  name: string
  goal?: string
  constraints: string[]
  domains: Array<{ name: string; ref?: string }>
  blueprints: Array<{ name: string; ref?: string }>
  parts: Array<{ name: string; ref?: string }>
  probes: Array<{ name: string; ref?: string }>
  tasks: Array<{ name: string; domain?: string; blueprint?: string; deps: string[] }>
}

type DomainFileSummary = {
  name: string
  description?: string
  language?: {
    terms: Array<{ name: string; desc: string }>
    ban: string[]
    invariant: string[]
  }
} | null

type TaskFileSummary = {
  name: string
  domain?: string
  blueprint?: string
  parts: Array<{
    name: string
    skillContext?: string
    probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
  }>
  deps: string[]
} | null

function readDomainFile(filePath: string): DomainFileSummary {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  const nameMatch = content.match(/domain\s+"([^"]+)"/)
  if (!nameMatch) return null

  const descMatch = content.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/)

  const termBlock = content.match(/term\s*\{([\s\S]*?)\}/)
  const terms: Array<{ name: string; desc: string }> = []
  if (termBlock) {
    const termMatches = termBlock[1]!.matchAll(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)
    for (const m of termMatches) {
      terms.push({ name: m[1]!, desc: m[2]!.replace(/\\"/g, '"') })
    }
  }

  const banBlock = content.match(/ban\s*\{([\s\S]*?)\}/)
  const ban: string[] = []
  if (banBlock) {
    const banMatches = banBlock[1]!.matchAll(/"([^"]+)"/g)
    for (const m of banMatches) {
      ban.push(m[1]!)
    }
  }

  // v0.1.1: 允许多个 invariant 块；遍历收集所有块
  const invariant: string[] = []
  for (const invBlock of content.matchAll(/invariant\s*\{([\s\S]*?)\}/g)) {
    const invMatches = invBlock[1]!.matchAll(/"([^"]+)"/g)
    for (const m of invMatches) {
      invariant.push(m[1]!)
    }
  }

  return {
    name: nameMatch[1]!,
    ...(descMatch ? { description: descMatch[1]!.replace(/\\"/g, '"') } : {}),
    ...(terms.length > 0 || ban.length > 0 || invariant.length > 0 ? { language: { terms, ban, invariant } } : {}),
  }
}

function readTaskFile(filePath: string): TaskFileSummary {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

  const nameMatch = content.match(/task\s+"([^"]+)"/)
  if (!nameMatch) return null

  const domainMatch = content.match(/domain\s+"([^"]+)"/)
  const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)

  const parts: Array<{
    name: string
    skillContext?: string
    probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
  }> = []
  const partBlocks = Array.from(content.matchAll(/part\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
  for (const m of partBlocks) {
    const partName = m[1]!
    const partBody = m[2]!

    const skillMatch = partBody.match(/skill_context\s*=\s*"((?:[^"\\]|\\.)*)"/)
    const skillContext = skillMatch ? skillMatch[1]!.replace(/\\"/g, '"') : undefined

    const probes: Array<{ name: string; ref: string; params?: Record<string, string> }> = []
    const probeBlocks = Array.from(partBody.matchAll(/probe\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
    for (const pm of probeBlocks) {
      const probeName = pm[1]!
      const probeBody = pm[2]!
      const refMatch = probeBody.match(/ref\s+"([^"]+)"/)
      const ref = refMatch?.[1] ?? ''

      const params: Record<string, string> = {}
      const paramsBlock = probeBody.match(/params\s*=\s*\{([\s\S]*?)\}/)
      if (paramsBlock) {
        const paramMatches = paramsBlock[1]!.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)
        for (const p of paramMatches) {
          params[p[1]!] = p[2]!
        }
      }

      probes.push({ name: probeName, ref, ...(Object.keys(params).length > 0 ? { params } : {}) })
    }

    parts.push({ name: partName, skillContext, probes })
  }

  const depsMatch = content.match(/deps\s*=\s*\[([^\]]*)\]/)
  const deps = depsMatch ? Array.from(depsMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!) : []

  return {
    name: nameMatch[1]!,
    domain: domainMatch?.[1],
    blueprint: blueprintMatch?.[1],
    parts,
    deps,
  }
}

function camelToKebab(s: string): string {
  return s
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

// PR-14b: 扫描 work.oxn 中声明的 domain/blueprint ref，收集未解析的 diagnostics。
// 用于 context / run / migrate 在 lock 守卫通过后显式报告"声明的资产不存在"软警告。
function collectUnresolvedRefDiagnostics(work: WorkFileSummary, projectRoot: string): RefDiagnostic[] {
  const diagnostics: RefDiagnostic[] = []
  for (const d of work.domains) {
    if (!resolveDomainFile(d.ref ?? null, d.name, projectRoot)) {
      const reason = d.ref?.startsWith('@oxn/')
        ? '@oxn/ scope has no builtin domain registry (V1)'
        : `domain file not found for ref "${d.ref ?? d.name}"`
      diagnostics.push(buildDomainDiagnostic(d.name, d.ref ?? null, reason))
    }
  }
  for (const b of work.blueprints) {
    if (!resolveBlueprintFile(b.ref ?? null, b.name, projectRoot)) {
      const reason = b.ref?.startsWith('@oxn/')
        ? '@oxn/ scope has no builtin blueprint registry (V1)'
        : `blueprint file not found for ref "${b.ref ?? b.name}"`
      diagnostics.push(buildBlueprintDiagnostic(b.name, b.ref ?? null, reason))
    }
  }
  return diagnostics
}

function readWorkFileFromText(content: string, _sourcePath: string): WorkFileSummary | null {
  const nameMatch = content.match(/work\s+"([^"]+)"/)
  if (!nameMatch) return null

  const domains: Array<{ name: string; ref?: string }> = []
  const domainMatches = Array.from(content.matchAll(/domain\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of domainMatches) {
    domains.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const blueprints: Array<{ name: string; ref?: string }> = []
  const bpMatches = Array.from(content.matchAll(/blueprint\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of bpMatches) {
    blueprints.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const parts: Array<{ name: string; ref?: string }> = []
  const partMatches = Array.from(content.matchAll(/part\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of partMatches) {
    parts.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const probes: Array<{ name: string; ref?: string }> = []
  const probeMatches = Array.from(content.matchAll(/probe\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g))
  for (const m of probeMatches) {
    probes.push({ name: m[1]!, ...(m[2] ? { ref: m[2] } : {}) })
  }

  const ctxBlock = content.match(/context\s*\{([\s\S]*?)\}/)
  let goal: string | undefined
  let constraints: string[] = []
  if (ctxBlock) {
    const gMatch = ctxBlock[1]!.match(/goal\s*=\s*"((?:[^"\\]|\\.)*)"/)
    if (gMatch) goal = gMatch[1]!.replace(/\\"/g, '"')
    const cMatch = ctxBlock[1]!.match(/constraints\s*=\s*\[([^\]]*)\]/)
    if (cMatch) {
      constraints = Array.from(cMatch[1]!.matchAll(/"([^"]+)"/g)).map((m) => m[1]!)
    }
  }

  const tasks: Array<{ name: string; domain?: string; blueprint?: string; deps: string[] }> = []
  const taskBlocks = Array.from(content.matchAll(/task\s+"([^"]+)"\s*\{([\s\S]*?)\}/g))
  for (const m of taskBlocks) {
    const taskName = m[1]!
    const taskBody = m[2]!
    const taskDomainMatch = taskBody.match(/domain\s+"([^"]+)"/)
    const taskBpMatch = taskBody.match(/blueprint\s+"([^"]+)"/)
    const taskDepsMatch = taskBody.match(/deps\s*=\s*\[([^\]]*)\]/)
    const taskDeps = taskDepsMatch ? Array.from(taskDepsMatch[1]!.matchAll(/"([^"]+)"/g)).map((dm) => dm[1]!) : []
    tasks.push({
      name: taskName,
      domain: taskDomainMatch?.[1],
      blueprint: taskBpMatch?.[1],
      deps: taskDeps,
    })
  }

  return { name: nameMatch[1]!, goal, constraints, domains, blueprints, parts, probes, tasks }
}

function readWorkFile(filePath: string): WorkFileSummary | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')
  return readWorkFileFromText(content, filePath)
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

    // v0.5 Phase 3: 路径由 config.assetFormat 决定（默认 oxn），fallback 到 alt + legacy
    const primaryPath = resolveAssetPrimaryPath(root, 'work', workName, assetFormat)
    const altPath = resolveAssetAltPath(root, 'work', workName, assetFormat)
    const legacyPath = getWorkOxnPath(root, workName)
    const workFile = existsSync(primaryPath)
      ? primaryPath
      : existsSync(altPath)
        ? altPath
        : existsSync(legacyPath)
          ? legacyPath
          : primaryPath

    // PR-9: context 与 run 对称 —— 锁守卫优先于 work.oxn 缺失检查
    // 默认硬要求；--unlock-check 用于诊断 stale 计划
    let birthCertForHealth: { ok: boolean; cert?: BirthCert } | null = null
    if (!noLockCheck) {
      const birthCert = readBirthCert(root, workName)
      birthCertForHealth = birthCert
      if (birthCert.ok && birthCert.cert.planLock !== null) {
        // 已有 planLock；先做 hash 校验（捕获 work.oxn 缺失 → work-removed）
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
    // v0.5 Phase 3: .md 走 md-pipeline 路径 (parseMarkdown → extractWorkIR → serializeWorkToOxn)
    //   然后用 readWorkFile 在合成的 .oxn 文本上做正则摘要。
    let work: WorkFileSummary | null = null
    if (workFile.endsWith('.md')) {
      try {
        const content = readTextFile(workFile)
        const parsed = parseMarkdown(content)
        const ir = extractWorkIR(parsed.tree, parsed.frontmatter)
        const synthesizedOxn = serializeWorkToOxn(ir)
        work = readWorkFileFromText(synthesizedOxn, workFile)
      } catch (e) {
        return outputError(
          {
            code: 'OXN_DSL_PARVE_FAILED',
            message: `Failed to parse ${workFile}: ${e instanceof Error ? e.message : String(e)}`,
          },
          format,
        )
      }
    } else {
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
          join(root, BOUNDARY_DIR, 'domains', `${taskDomain}.oxn`),
          join(root, BOUNDARY_DIR, 'domains', `${kebab}.oxn`),
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

      const statePath =
        statePathArg ?? getTaskStatePath(root, workName, taskName)
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
                  workOxnHash: birthCertForHealth.cert.planLock.workOxnHash,
                  workDomainsHash: birthCertForHealth.cert.planLock.workDomainsHash,
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
        },
        human: `Work ${workName} (no --task specified, returning workspace-level context)
  Domains:    ${work.domains.map((d) => d.name).join(', ')}
  Blueprints: ${work.blueprints.map((b) => b.name).join(', ')}
  Parts:      ${work.parts.map((p) => p.name).join(', ')}
  Probes:     ${work.probes.map((p) => p.name).join(', ')}
  Tasks:      ${work.tasks.length}
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
//   4. 写 .work.planLock = { lockedAt, workOxnHash, workDomainsHash, blueprintsHash, tasksHash }
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
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    // ── 1. 校验 .work 存在 ──
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

    // ── 2. 校验 planLock === null ──
    if (existing.cert.planLock !== null) {
      return outputError(
        {
          code: 'OXN_WORK_LOCK_FAILED',
          message: `work "${workName}" already locked`,
          suggestion: t('work.unlockSuggestion', { workName }),
          context: { lockedAt: existing.cert.planLock.lockedAt },
        },
        format,
      )
    }

    // ── 3. 算 hash ──
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

    // ── 4. 写 planLock ──
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
            workOxnHash: pl.workOxnHash,
            workDomainsHash: pl.workDomainsHash,
            blueprintsHash: pl.blueprintsHash,
            tasksHash: pl.tasksHash,
            allHash: pl.allHash,
          },
          nextStep: `run \`oxn work run ${workName}\` to start execution`,
        },
        human: `Work "${workName}" locked ✓
  Locked at: ${pl.lockedAt}
  Components:
    - work.oxn:     ${pl.workOxnHash.slice(0, 16)}...
    - domains.json: ${pl.workDomainsHash.slice(0, 16)}...
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
// 注意：unlock 后 work.oxn / domains.json / blueprints.json / tasks/*.oxn 可被自由修改。
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
          nextStep: 'edit work.oxn / tasks/<t>/task.oxn as needed, then re-run `oxn work validate` and `oxn work lock`',
        },
        human: `Work "${workName}" unlocked ✓
  Cleared at: ${cleared.updatedAt}
  Previous lock was at: ${existing.cert.planLock.lockedAt}

  Next:
    1. Edit work.oxn / tasks/<t>/task.oxn as needed
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
//   - work.oxn 缺失：OXN_WORK_NOT_FOUND
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
// Subcommand: compile (v0.4 PR-B Q5 foundation)
//
// 把 work.oxn (langium source) 编译为 v0.3 MD canonical 格式 (work.md).
// 输出位置: .openxenon/works/<w>/work.md
// v0.4 Q5 路径: 后续 PR 把 work.oxn 改名为 work.md (单文件), tasks/ 目录全删.
// 当前 PR 仅提供 compile 命令作为基础, 28 works 全量迁移留待后续 PR.
// ---------------------------------------------------------------------------

import { compileOxnToMd, DecompilerParseError } from '@openxenon/engine/oxl/md-bridge/oxl-md-decompiler.js'
import {
  computeSha256,
  readSyncMetadata,
  composeSyncContent,
  writeCacheSha,
  getCachePath,
  getCacheMdPath,
} from '@openxenon/engine/oxl/md-pipeline/sync-hash.js'
import { validateOxnParseable, verifyWorkRoundTrip } from '@openxenon/engine/oxl/md-pipeline/sync-validation.js'

// ---------------------------------------------------------------------------
// Subcommand: sync (v0.4 Phase 1 — work.oxn → work.md 自动同步)
// ---------------------------------------------------------------------------
const syncSubcommand = defineCommand({
  meta: {
    name: 'sync',
    description: '[v0.4 Phase 1] Sync work.oxn → work.md: regenerate only when .oxn changed',
  },
  args: {
    name: { type: 'positional', required: false },
    all: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const all = ctx.args.all === true
    const dryRun = ctx.args['dry-run'] === true
    const singleName = ctx.args.name as string | undefined
    const projectRoot = getProjectRoot()

    if (!all && !singleName) {
      return outputError({ code: 'OXN_SYNC_ARGS_MISSING', message: 'either <name> or --all is required' }, format)
    }

    const worksDir = join(projectRoot, BOUNDARY_DIR, 'works')
    let names: string[]
    if (all) {
      if (!existsSync(worksDir)) {
        return outputError({ code: 'OXN_NO_PROJECT', message: 'no .openxenon/works/' }, format)
      }
      names = readdirSync(worksDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name)
    } else {
      names = [singleName as string]
    }

    const results: Array<{
      name: string
      status: 'updated' | 'unchanged' | 'error'
      oxnSha?: string
      mdSha?: string
      error?: string
    }> = []

    for (const name of names) {
      const oxnPath = join(worksDir, name, 'work.oxn')
      const mdPath = join(worksDir, name, 'work.md')
      const cachePath = getCachePath(projectRoot, 'work', name)

      if (!existsSync(oxnPath)) {
        results.push({ name, status: 'error', error: `work.oxn not found: ${oxnPath}` })
        continue
      }

      const oxnContent = readFileSync(oxnPath, 'utf-8')
      const oxnSha = computeSha256(oxnContent)

      const prevMeta = existsSync(mdPath) ? readSyncMetadata(mdPath) : null
      const prevOxnSha = prevMeta?.oxnSourceSha

      if (prevOxnSha === oxnSha && existsSync(mdPath)) {
        results.push({ name, status: 'unchanged', oxnSha, mdSha: prevMeta?.mdSelfSha })
        continue
      }

      if (dryRun) {
        results.push({ name, status: 'updated', oxnSha })
        continue
      }

      let result
      try {
        result = await compileOxnToMd(oxnContent, { entity: 'work', frontmatter: true })
      } catch (err) {
        results.push({ name, status: 'error', error: err instanceof Error ? err.message : String(err) })
        continue
      }

      const finalContent = composeSyncContent(result.md, {
        oxnSourceSha: oxnSha,
        syncedAt: new Date().toISOString(),
      })
      const mdSha = computeSha256(finalContent)

      writeFileSync(mdPath, finalContent, 'utf-8')
      writeCacheSha(cachePath, mdSha)

      results.push({ name, status: 'updated', oxnSha, mdSha })
    }

    const summary = {
      total: results.length,
      updated: results.filter((r) => r.status === 'updated').length,
      unchanged: results.filter((r) => r.status === 'unchanged').length,
      error: results.filter((r) => r.status === 'error').length,
      dryRun,
    }

    output(
      {
        ok: summary.error === 0,
        data: { ...summary, results },
        human:
          `work sync ${all ? '--all' : names.length === 1 ? `<${names[0]}>` : `${names.length} items`}` +
          (dryRun ? ' (dry-run)' : '') +
          `\n  total:     ${summary.total}\n  updated:   ${summary.updated}\n  unchanged: ${summary.unchanged}\n  error:     ${summary.error}` +
          (summary.error > 0
            ? '\n\nFailed:\n' +
              results
                .filter((r) => r.status === 'error')
                .map((r) => `  - ${r.name}: ${r.error}`)
                .join('\n')
            : ''),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: sync-md (v0.4 Phase 2 — work.md → work.oxn 反向同步)
// ---------------------------------------------------------------------------
const syncMdSubcommand = defineCommand({
  meta: {
    name: 'sync-md',
    description: '[v0.4 Phase 2] Reverse sync work.md → work.oxn',
  },
  args: {
    name: { type: 'positional', required: false },
    all: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'no-chain': { type: 'boolean' },
    'oxn-priority': { type: 'boolean' },
    'no-roundtrip': { type: 'boolean' },
    'no-parse-check': { type: 'boolean' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const all = ctx.args.all === true
    const dryRun = ctx.args['dry-run'] === true
    const noChain = ctx.args.chain === false
    const oxnPriority = ctx.args['oxn-priority'] === true
    const noRoundtrip = ctx.args.roundtrip === false
    const noParseCheck = ctx.args['parse-check'] === false
    const singleName = ctx.args.name as string | undefined
    const projectRoot = getProjectRoot()

    if (!all && !singleName) {
      return outputError({ code: 'OXN_SYNC_ARGS_MISSING', message: 'either <name> or --all is required' }, format)
    }

    const worksDir = join(projectRoot, BOUNDARY_DIR, 'works')
    let names: string[]
    if (all) {
      if (!existsSync(worksDir)) {
        return outputError({ code: 'OXN_NO_PROJECT', message: 'no .openxenon/works/' }, format)
      }
      names = readdirSync(worksDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name)
    } else {
      names = [singleName as string]
    }

    const results: Array<{
      name: string
      status: 'updated' | 'unchanged' | 'error' | 'oxn-wins'
      mdSha?: string
      oxnSha?: string
      error?: string
      errorCode?: string
    }> = []

    for (const name of names) {
      const mdPath = join(worksDir, name, 'work.md')
      const oxnPath = join(worksDir, name, 'work.oxn')
      const mdCachePath = getCacheMdPath(projectRoot, 'work', name)

      if (!existsSync(mdPath)) {
        results.push({ name, status: 'error', error: `work.md not found: ${mdPath}` })
        continue
      }

      const mdContent = readFileSync(mdPath, 'utf-8')
      const shaMdCurrent = computeSha256(mdContent)

      // conflict: .oxn-priority
      const oxnExists = existsSync(oxnPath)
      const oxnSha = oxnExists ? computeSha256(readFileSync(oxnPath, 'utf-8')) : ''
      const oxnPrevSha = oxnExists ? readSyncMetadata(mdPath)?.oxnSourceSha : undefined
      const bothChanged = oxnExists && oxnPrevSha && oxnPrevSha !== oxnSha
      if (bothChanged && oxnPriority) {
        try {
          const oxnRaw = readFileSync(oxnPath, 'utf-8')
          const mdResult = await compileOxnToMd(oxnRaw, { entity: 'work', frontmatter: true })
          const finalContent = composeSyncContent(mdResult.md, {
            oxnSourceSha: oxnSha,
            syncedAt: new Date().toISOString(),
          })
          const mdSha = computeSha256(finalContent)
          writeFileSync(mdPath, finalContent, 'utf-8')
          writeCacheSha(getCachePath(projectRoot, 'work', name), mdSha)
          writeFileSync(mdCachePath, `${mdSha}\n`, 'utf-8')
        } catch (err) {
          results.push({ name, status: 'error', error: `oxn-priority sync: ${String(err)}` })
          continue
        }
        results.push({ name, status: 'oxn-wins', mdSha: shaMdCurrent, oxnSha })
        continue
      }

      if (existsSync(mdCachePath)) {
        const shaMdPrev = readFileSync(mdCachePath, 'utf-8').trim()
        if (shaMdCurrent === shaMdPrev) {
          results.push({ name, status: 'unchanged', mdSha: shaMdCurrent })
          continue
        }
      }

      if (dryRun) {
        results.push({ name, status: 'updated', mdSha: shaMdCurrent })
        continue
      }

      let tree, frontmatter
      try {
        const parsed = parseMarkdown(mdContent)
        tree = parsed.tree
        frontmatter = parsed.frontmatter
      } catch (err) {
        results.push({ name, status: 'error', error: `md parse: ${String(err)}` })
        continue
      }

      let ir
      try {
        ir = extractWorkIR(tree, frontmatter)
      } catch (err) {
        results.push({ name, status: 'error', error: `IR extract: ${String(err)}` })
        continue
      }

      const oxnContent = serializeWorkToOxn(ir)
      const oxnShaNew = computeSha256(oxnContent)

      if (!noParseCheck) {
        const parseResult = await validateOxnParseable(oxnContent)
        if (!parseResult.ok) {
          results.push({
            name,
            status: 'error',
            error: `langium parse failed: ${parseResult.errors[0]}`,
            errorCode: 'E_SYNC_LANGIUM_VALIDATION_FAILED',
          })
          continue
        }
      }

      if (!noRoundtrip) {
        const rtResult = await verifyWorkRoundTrip(ir, oxnContent)
        if (!rtResult.ok) {
          results.push({
            name,
            status: 'error',
            error: `round-trip loss: ${rtResult.lostFields.join(', ')}`,
            errorCode: 'E_SYNC_ROUND_TRIP_LOSS',
          })
          continue
        }
      }

      writeFileSync(oxnPath, oxnContent, 'utf-8')

      if (!noChain && existsSync(oxnPath)) {
        try {
          const oxnRaw = readFileSync(oxnPath, 'utf-8')
          const mdResult = await compileOxnToMd(oxnRaw, { entity: 'work', frontmatter: true })
          const finalContent = composeSyncContent(mdResult.md, {
            oxnSourceSha: oxnShaNew,
            syncedAt: new Date().toISOString(),
          })
          const mdSha = computeSha256(finalContent)
          writeFileSync(mdPath, finalContent, 'utf-8')
          writeCacheSha(getCachePath(projectRoot, 'work', name), mdSha)
        } catch {
          // chained sync fails silently
        }
      }

      const finalMdSha = existsSync(mdPath) ? computeSha256(readFileSync(mdPath, 'utf-8')) : shaMdCurrent
      writeFileSync(mdCachePath, `${finalMdSha}\n`, 'utf-8')

      results.push({ name, status: 'updated', mdSha: finalMdSha, oxnSha: oxnShaNew })
    }

    const summary = {
      total: results.length,
      updated: results.filter((r) => r.status === 'updated').length,
      unchanged: results.filter((r) => r.status === 'unchanged').length,
      'oxn-wins': results.filter((r) => r.status === 'oxn-wins').length,
      error: results.filter((r) => r.status === 'error').length,
      dryRun,
      oxnPriority,
    }

    output(
      {
        ok: summary.error === 0,
        data: { ...summary, results },
        human:
          `work sync-md ${all ? '--all' : `<${names[0]}>`}` +
          (dryRun ? ' (dry-run)' : '') +
          (oxnPriority ? ' (oxn-priority)' : '') +
          `\n  total:     ${summary.total}\n  updated:   ${summary.updated}\n  unchanged: ${summary.unchanged}\n  oxn-wins:  ${summary['oxn-wins']}\n  error:     ${summary.error}` +
          (summary.error > 0
            ? '\n\nFailed:\n' +
              results
                .filter((r) => r.status === 'error')
                .map((r) => `  - ${r.name}: [${r.errorCode ?? 'ERROR'}] ${r.error}`)
                .join('\n')
            : ''),
      },
      format,
    )
  },
})

const compileSubcommand = defineCommand({
  meta: {
    name: 'compile',
    description:
      'Compile work.oxn → work.md (v0.3 MD canonical format). Foundation for v0.4 Q5 single-work-file refactor.',
  },
  args: {
    name: { type: 'positional', required: true, description: t('work.args.workName') },
    'output-path': {
      type: 'string',
      description: 'Output .md path (default: works/<w>/work.md, relative to project root)',
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()
    const outputPath =
      (ctx.args['output-path'] as string | undefined) ?? getWorkMdPath(projectRoot, workName)

    const workOxnPath = getWorkOxnPath(projectRoot, workName)
    if (!existsSync(workOxnPath)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work.oxn not found at: ${workOxnPath}` }, format)
    }

    const oxnContent = readFileSync(workOxnPath, 'utf-8')

    try {
      const result = await compileOxnToMd(oxnContent, { entity: 'work' })
      const outputDir = join(outputPath, '..')
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }
      writeFileSync(outputPath, result.md, 'utf-8')

      output(
        {
          ok: true,
          data: {
            workName,
            outputPath,
            entity: result.entity,
            contentHash: result.contentHash,
            mdBytes: result.md.length,
          },
          human:
            `Compiled work.oxn → work.md\n` +
            `  work:    ${workName}\n` +
            `  output:  ${outputPath}\n` +
            `  size:    ${result.md.length} bytes\n` +
            `  hash:    ${result.contentHash.slice(0, 16)}...`,
        },
        format,
      )
    } catch (e) {
      if (e instanceof DecompilerParseError) {
        return outputError(
          {
            code: 'OXN_WORK_COMPILE_FAILED',
            message: `work.oxn parse failed: ${e.message}`,
            suggestion: 'check work.oxn syntax (langium grammar)',
          },
          format,
        )
      }
      throw e
    }
  },
})

// ---------------------------------------------------------------------------
// Subcommand: migrate-md (v0.4 PR-B.5)
//
// 安全版 work.oxn → work.md 迁移:
//   1. 调 compileOxnToMd 生成 .openxenon/works/<w>/work.md
//   2. 不动 work.oxn (work.ts 仍读 work.oxn, 继续工作)
//   3. 不动 tasks/<n>/task.oxn (是 v0.3 期间 add-task 生成的占位符, 但保留)
//   4. 支持 --all 批量处理所有 28+ works
//
// 为什么"安全版" (不动 work.oxn / tasks/)?
//   - work.ts 当前所有命令都通过 getWorkOxnPath() 读 work.oxn
//   - 全量改名 (work.oxn → work.md) 会让 v0.3.4 工作流断裂
//   - 后续 PR-C1 (unified-native) 会把 work.ts 改成读 work.md, 那时才删 work.oxn
//   - 现在生成的 work.md 是 v0.3 canonical 视图, 与 work.oxn langium 源并存
//
// 批处理报告 (--all 模式):
//   - 28 works: success / skip (无 work.oxn) / error
//   - 写入 log 到 .openxenon/works/.migrate-md.log
// ---------------------------------------------------------------------------

interface MigrateResult {
  workName: string
  status: 'compiled' | 'skipped' | 'error'
  mdPath?: string
  bytes?: number
  error?: string
}

const migrateMdSubcommand = defineCommand({
  meta: {
    name: 'migrate-md',
    description:
      'Generate work.md (MD canonical) from work.oxn for one work (or --all). Safe: does not touch work.oxn or tasks/.',
  },
  args: {
    name: { type: 'positional', required: false, description: 'Work name (omit if --all)' },
    all: { type: 'boolean', description: 'Migrate all 28+ works under .openxenon/works/' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
    const all = ctx.args.all === true
    const workName = ctx.args.name as string | undefined

    if (!all && !workName) {
      return outputError(
        {
          code: 'OXN_MIGRATE_MD_ARGS_MISSING',
          message: 'either <name> or --all is required',
          suggestion: 'run `oxn work migrate-md <name>` or `oxn work migrate-md --all`',
        },
        format,
      )
    }

    const works = all
      ? readdirSync(join(projectRoot, BOUNDARY_DIR, 'works')).filter((n) => {
          const full = join(projectRoot, BOUNDARY_DIR, 'works', n)
          try {
            return statSync(full).isDirectory() && !n.startsWith('.')
          } catch {
            return false
          }
        })
      : [workName as string]

    const results: MigrateResult[] = []
    for (const w of works) {
      const workOxnPath = join(projectRoot, BOUNDARY_DIR, 'works', w, WORK_OXN_FILE)
      if (!existsSync(workOxnPath)) {
        results.push({ workName: w, status: 'skipped', error: 'work.oxn not found' })
        continue
      }
      try {
        const oxnContent = readFileSync(workOxnPath, 'utf-8')
        const mdResult = await compileOxnToMd(oxnContent, { entity: 'work' })
        const mdPath = join(projectRoot, BOUNDARY_DIR, 'works', w, 'work.md')
        writeFileSync(mdPath, mdResult.md, 'utf-8')
        results.push({
          workName: w,
          status: 'compiled',
          mdPath,
          bytes: mdResult.md.length,
        })
      } catch (e) {
        results.push({
          workName: w,
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }

    // 写批处理 log
    const logPath = join(projectRoot, BOUNDARY_DIR, 'works', '.migrate-md.log')
    const logLines = [
      `# v0.4 PR-B.5 migrate-md log — ${new Date().toISOString()}`,
      `# works processed: ${results.length}`,
      `#   compiled: ${results.filter((r) => r.status === 'compiled').length}`,
      `#   skipped:  ${results.filter((r) => r.status === 'skipped').length}`,
      `#   error:    ${results.filter((r) => r.status === 'error').length}`,
      '',
      ...results.map((r) => {
        const status = r.status.toUpperCase().padEnd(9)
        const bytes = r.bytes !== undefined ? ` (${r.bytes} bytes)` : ''
        return `[${status}] ${r.workName}${bytes}${r.error ? ` — ${r.error}` : ''}`
      }),
    ]
    writeFileSync(logPath, `${logLines.join('\n')}\n`, 'utf-8')

    const summary = {
      total: results.length,
      compiled: results.filter((r) => r.status === 'compiled').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      error: results.filter((r) => r.status === 'error').length,
      logPath,
    }

    output(
      {
        ok: summary.error === 0,
        data: { ...summary, results },
        human:
          `migrate-md ${all ? '--all' : `<${workName}>`}\n` +
          `  total:    ${summary.total}\n` +
          `  compiled: ${summary.compiled}\n` +
          `  skipped:  ${summary.skipped}\n` +
          `  error:    ${summary.error}\n` +
          `  log:      ${summary.logPath}\n` +
          (summary.error > 0
            ? '\nFailed works:\n' +
              results
                .filter((r) => r.status === 'error')
                .map((r) => `  - ${r.workName}: ${r.error}`)
                .join('\n')
            : ''),
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
    compile: compileSubcommand,
    'migrate-md': migrateMdSubcommand,
    sync: syncSubcommand,
    'sync-md': syncMdSubcommand,
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
    migrate: migrateSubcommand,
  },
  run() {
    // No-op: help text is provided by citty
  },
})
