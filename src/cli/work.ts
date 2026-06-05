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
//     delete-task <name> --task <t>   — 删 task 目录（仅 P1）
//
//   Phase 2: Execution（驱动 .json 状态机）
//     run <name>                      — 启动状态机，落 work-state.json
//     submit <name> --task <t>        — 推进 task 内 part
//     status <name>                   — 读 work-state.json 进度
//     context <name> --task <t>       — 渲染 AI 上下文
//
// 命名范式: {entity}-{aspect}.{ext}（详见 kernel/constants.ts）
//   - DSL 图纸: work.oxn / task.oxn
//   - 运行时:  work-state.json / work-trace.jsonl / work-frozen.json
//              task-state.json / task-trace.jsonl / task-frozen.json
//
// 阶段守卫:
//   - NV-1: work-state.json 存在 ⇒ add-task/edit-task/delete-task 拒绝
//   - NV-2: work-state.json 缺失 ⇒ submit 拒绝
// =============================================================================

import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR, TASK_OXN_FILE, WORK_OXN_FILE } from '../kernel/constants'
import { getFormatFromArgs, output, outputError } from './output'
import {
  isWorkDeclaration,
  createOxnParser,
  isBlueprintDeclaration,
  type BlueprintDeclaration,
  isPartDeclaration,
  type PartDeclaration,
  type WorkContext,
  type WorkDeclaration,
  type OXNDocument as OxnAstDocument,
} from '../oxn-dsl'
import { ExecError, runTask, runWork, submitTask } from '../work'
import {
  ensureWorkDir,
  getTaskOxnPath,
  getWorkOxnPath,
  loadTaskState,
  loadWorkState,
  workStateExists,
} from '../work/dual-state-io'

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

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

function snapshotContext(ctx: WorkContext | undefined, maxIters: number): DerivedSkillContext {
  return {
    overallGoal: ctx?.goal ?? '',
    constraints: ctx?.constraints ?? [],
    maxIterations: ctx?.loopPolicy?.maxIterations ?? maxIters,
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
    specs.push({
      partName,
      align: task.blueprint ?? '',
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
): string {
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
    loop_policy {
      max_iterations = 3;
    }
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
        message: `work "${workName}" 已进入执行阶段，禁止修改图纸`,
        suggestion: '如需调整 task 编排，请删除 .openxenon/works/<name>/ 目录后重新 create。',
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
        message: `work "${workName}" 状态机未启动`,
        suggestion: '先执行 `oxn work run <name>` 进入执行阶段',
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
  meta: { name: 'list', description: '列出所有 Work' },
  args: {
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const cwd = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: '项目未初始化，请先执行 oxn init' }, format)
    }

    const worksDir = join(cwd, BOUNDARY_DIR, 'works')
    if (!existsSync(worksDir)) {
      output({ data: { works: [] }, human: '暂无 Work' }, format)
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
      const hasWorkState = existsSync(join(workDir, 'work-state.json'))
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
      output({ data: { works }, human: '暂无 Work' }, format)
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
    description: '创建 Work 骨架（从 blueprint 渲染 work.oxn）',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Work ID（kebab-case）' },
    blueprint: {
      type: 'string',
      alias: 'b',
      description: '从该 blueprint 生成 work.oxn（默认 .openxenon/blueprints/<name>.oxn）',
    },
    'blueprint-file': { type: 'string', description: '直接指定 blueprint.oxn 路径（覆盖 --blueprint 默认查找）' },
    'output-dir': { type: 'string', description: '输出目录（默认 .openxenon/works/<name>/）' },
    type: { type: 'string', alias: 't', default: 'task', description: 'Work 类型（默认 task）' },
    force: { type: 'boolean', description: '覆盖已存在的文件' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const workType = (ctx.args.type as string) || 'task'
    const customBlueprint = ctx.args['blueprint-file'] as string | undefined
    const blueprintNameArg = ctx.args.blueprint as string | undefined
    const customOutputDir = ctx.args['output-dir'] as string | undefined
    const force = ctx.args.force === true

    if (!projectBoundaryExists()) {
      return outputError(
        { code: 'OXN_NO_PROJECT', message: '项目未初始化，请先执行 oxn init', suggestion: '在项目根目录执行 oxn init' },
        format,
      )
    }

    const validation = validateWorkName(workName)
    if (!validation.valid) {
      return outputError({ code: 'OXN_INVALID_WORK_NAME', message: `Work ID 无效: ${validation.error}` }, format)
    }

    const projectRoot = getProjectRoot()

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
          return outputError(
            {
              code: 'OXN_OUTPUT_DIR_EXISTS',
              message: `output directory already exists: ${outputDir}`,
              suggestion: 'use --force to overwrite, or --output-dir to pick a new location',
            },
            format,
          )
        }
        ensureDirectory(outputDir)
        const workFile = join(outputDir, WORK_OXN_FILE)
        if (!force && existsSync(workFile)) {
          return outputError(
            {
              code: 'OXN_OUTPUT_FILE_EXISTS',
              message: `work.oxn already exists in ${outputDir}`,
              suggestion: 'use --force to overwrite',
            },
            format,
          )
        }
        const workContent = renderWorkSkeleton(workName, resolvedBlueprintName, slots)
        writeFileSync(workFile, workContent, 'utf-8')
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
    const workDir = join(projectRoot, BOUNDARY_DIR, 'work', workType)
    if (!existsSync(workDir)) {
      ensureDirectory(workDir)
    }

    const workFilePath = join(workDir, `${workName}.oxn`)
    if (existsSync(workFilePath)) {
      return outputError({ code: 'OXN_WORK_EXISTS', message: `Work 已存在: ${workName} (type: ${workType})` }, format)
    }

    const workOxnContent = `work "${workName}" {
  context {
    goal = "TODO: 描述工作目标"
  }

  // 声明资源引用
  // domain "DomainName" ref "@prj/domains/DomainName";
  // blueprint "BlueprintName" ref "@prj/blueprints/BlueprintName";

  // 任务编排
  // task "TaskName" {
  //   domain "DomainName"
  //   blueprint "BlueprintName"
  //   part "slot-name" {
  //     skill_context = "AI 执行指令"
  //   }
  // }
}
`
    writeFileSync(workFilePath, workOxnContent, 'utf-8')

    return output(
      {
        ok: true,
        data: {
          workId: workName,
          workName,
          type: workType,
          path: workFilePath,
        },
        human: `Work 已创建: ${workName}\n类型: ${workType}\n路径: ${workFilePath}\n\n请编辑 work.oxn 填充 task 编排；或重新跑 \`oxn work create <name> --blueprint <bp>\` 从 blueprint 生成。`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: validate
// ---------------------------------------------------------------------------
const validateSubcommand = defineCommand({
  meta: { name: 'validate', description: '校验 work.oxn 语法' },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: '项目未初始化，请先执行 oxn init' }, format)
    }

    const workFile = getWorkOxnPath(projectRoot, workName)
    if (!existsSync(workFile)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work "${workName}" not found at ${workFile}` }, format)
    }

    try {
      const { work } = await parseOxnFile(workFile)
      if (!work) {
        return outputError({ code: 'OXN_NO_WORK', message: `No Work declaration found in ${workFile}` }, format)
      }
      output(
        {
          ok: true,
          data: {
            workName,
            workType: 'workspace',
            blueprintRef: work.blueprints?.[0]?.name,
            valid: true,
            errors: [],
            warnings: [],
          },
          human: `Work 语法正确\nType: workspace\nPrimary Blueprint: ${work.blueprints?.[0]?.name ?? '(none)'}`,
        },
        format,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      outputError({ code: 'OXN_WORK_VALIDATE_FAILED', message }, format)
    }
  },
})

// ---------------------------------------------------------------------------
// Subcommand: add-task (Phase 1: P1 守卫 + 写 task.oxn)
// ---------------------------------------------------------------------------
const addTaskSubcommand = defineCommand({
  meta: {
    name: 'add-task',
    description: '在指定 work 下创建 task.oxn（绑定 blueprint + 可选 domain）',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    task: { type: 'string', required: true, description: 'Task 名称（kebab-case 推荐）' },
    blueprint: {
      type: 'string',
      required: true,
      description: 'Blueprint 名（必须出现在 work.oxn 的 blueprint 声明中）',
    },
    domain: { type: 'string', description: '要引用的 Domain 名（必须出现在 work.oxn 的 domain 声明中）' },
    force: { type: 'boolean', alias: 'f', description: '覆盖已存在的 task.oxn' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const blueprintName = ctx.args.blueprint as string
    const domainName = (ctx.args.domain as string | undefined) ?? ''
    const force = ctx.args.force === true || ctx.args.f === true
    const projectRoot = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: '项目未初始化，请先执行 oxn init' }, format)
    }

    const workValidation = validateWorkName(workName)
    if (!workValidation.valid) {
      return outputError({ code: 'OXN_INVALID_WORK_NAME', message: `Work ID 无效: ${workValidation.error}` }, format)
    }
    const taskValidation = validateTaskName(taskName)
    if (!taskValidation.valid) {
      return outputError({ code: 'OXN_INVALID_TASK_NAME', message: `Task 名称无效: ${taskValidation.error}` }, format)
    }

    // NV-1: 状态机已启动 → 拒
    const addGuard = guardWorkNotStarted(projectRoot, workName, format, () => null)
    if (addGuard) return

    const workFile = getWorkOxnPath(projectRoot, workName)
    if (!existsSync(workFile)) {
      return outputError(
        {
          code: 'OXN_WORK_NOT_FOUND',
          message: `work "${workName}" not found (work.oxn does not exist at ${workFile})`,
          suggestion: 'create the work first with `oxn work create <name>`',
        },
        format,
      )
    }

    const taskDir = getWorkTaskDir(workName, taskName)
    const taskFile = getWorkTaskFile(workName, taskName)
    if (existsSync(taskFile) && !force) {
      return outputError(
        {
          code: 'OXN_OUTPUT_FILE_EXISTS',
          message: `task.oxn already exists at ${taskFile}`,
          suggestion: 'use --force to overwrite',
        },
        format,
      )
    }

    let allowedBlueprints: string[] = []
    let allowedDomains: string[] = []
    try {
      const workContent = readFileSync(workFile, 'utf-8')
      const bpMatches = Array.from(workContent.matchAll(/blueprint\s+"([^"]+)"/g))
      const dMatches = Array.from(workContent.matchAll(/domain\s+"([^"]+)"/g))
      allowedBlueprints = bpMatches.map((m) => m[1]!)
      allowedDomains = dMatches.map((m) => m[1]!)
    } catch {
      // 软降级
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
  meta: { name: 'list-task', description: '列出 work 下所有 task' },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const tasksDir = join(getProjectRoot(), BOUNDARY_DIR, 'works', workName, 'tasks')

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
            ? `Tasks in work "${workName}":\n${tasks.map((t) => `  - ${t.name} (blueprint: ${t.blueprint ?? '?'}, domain: ${t.domain ?? 'none'})`).join('\n')}`
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
  meta: { name: 'task-status', description: '查看 task.oxn 元信息（blueprint + domain）' },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    task: { type: 'string', required: true, description: 'Task 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
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
// Subcommand: edit-task (Phase 1: P1 守卫)
// ---------------------------------------------------------------------------
const editTaskSubcommand = defineCommand({
  meta: { name: 'edit-task', description: '编辑 task.oxn（objective / constraints / domain）' },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    task: { type: 'string', required: true, description: 'Task 名称' },
    objective: { type: 'string', description: '新的 objective 文本' },
    'add-constraint': { type: 'string', description: '添加一条 constraint（可多次）' },
    'add-domain': { type: 'string', description: '添加 domain 引用（必须已在 work.oxn domain 声明中）' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string
    const newObjective = ctx.args.objective as string | undefined
    const addConstraint = (ctx.args['add-constraint'] as string | undefined) ?? ''
    const addDomain = (ctx.args['add-domain'] as string | undefined) ?? ''
    const projectRoot = getProjectRoot()

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
      const workFile = getWorkOxnPath(projectRoot, workName)
      if (existsSync(workFile)) {
        const workContent = readFileSync(workFile, 'utf-8')
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
  meta: { name: 'delete-task', description: '删除 task 目录（仅 P1 允许，work 启动后拒绝）' },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    task: { type: 'string', required: true, description: 'Task 名称' },
    force: { type: 'boolean', alias: 'f', description: '强制删除（不提示）' },
    'keep-state': { type: 'boolean', description: '保留 task-state.json 和 task-trace.jsonl（默认一并删）' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
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
    description: '启动 work 状态机（写 work-state.json + work-trace.jsonl + 各 task 状态）',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()
    try {
      const filePath = getWorkOxnPath(projectRoot, workName)
      if (!existsSync(filePath)) {
        return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work.oxn not found at ${filePath}` }, format)
      }
      const { work, parts: inlineParts } = await parseOxnFile(filePath)
      if (!work) {
        return output(errorJson('OXN_NO_WORK', 'No Work declaration found in work.oxn'), format)
      }

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
      const maxIters = work.context?.loopPolicy?.maxIterations ?? 3

      const workspace = runWork({
        projectRoot,
        workName,
        blueprintNames,
        domainNames,
        tasks: taskEntries.map((t) => ({
          taskName: parsePartName(t.name),
          blueprint: t.blueprint ?? blueprintNames[0] ?? '',
          injects: [],
        })),
        goal: work.context?.goal,
        constraints: work.context?.constraints,
        maxIterations: maxIters,
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
        skillContext: snapshotContext(work.context, maxIters),
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
          },
        },
        format,
      )
    } catch (err) {
      if (err instanceof ExecError) {
        return outputError({ code: err.code, message: err.message }, format)
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
    description: '推进 task 内的当前 part（--task 必填），可触发 probe（--run-probes）',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    task: { type: 'string', required: true, description: 'Task 名称' },
    '--evidence': { type: 'string', description: 'AI 提交的证据 JSON' },
    '--run-probes': { type: 'boolean', description: '执行 task 级探针（v0.1 占位）' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
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
        ? join(projectRoot, BOUNDARY_DIR, 'works', workName, 'tasks', taskName, 'task-frozen.json')
        : null

      const workFrozenPath =
        loadWorkState(projectRoot, workName)?.status === 'passed'
          ? join(projectRoot, BOUNDARY_DIR, 'works', workName, 'work-frozen.json')
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
      if (err instanceof ExecError) {
        return outputError({ code: err.code, message: err.message }, format)
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
  meta: { name: 'status', description: '查询 work 当前状态（含 task 分解）' },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const projectRoot = getProjectRoot()
    try {
      const workspace = loadWorkState(projectRoot, workName)
      if (!workspace) {
        return output(errorJson('OXN_WORK_NOT_FOUND', `work "${workName}" not found (work-state.json missing)`), format)
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
  contextMap?: Array<{ target: string; alias: string }>
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

  const invariantBlock = content.match(/invariant\s*\{([\s\S]*?)\}/)
  const invariant: string[] = []
  if (invariantBlock) {
    const invMatches = invariantBlock[1]!.matchAll(/"([^"]+)"/g)
    for (const m of invMatches) {
      invariant.push(m[1]!)
    }
  }

  const mapBlock = content.match(/context_map\s*\{([\s\S]*?)\}/)
  const contextMap: Array<{ target: string; alias: string }> = []
  if (mapBlock) {
    const mapMatches = mapBlock[1]!.matchAll(/imports\s+"([^"]+)"\s+as\s+"([^"]+)"/g)
    for (const m of mapMatches) {
      contextMap.push({ target: m[1]!, alias: m[2]! })
    }
  }

  return {
    name: nameMatch[1]!,
    ...(descMatch ? { description: descMatch[1]!.replace(/\\"/g, '"') } : {}),
    ...(terms.length > 0 || ban.length > 0 || invariant.length > 0 ? { language: { terms, ban, invariant } } : {}),
    ...(contextMap.length > 0 ? { contextMap } : {}),
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

function readWorkFile(filePath: string): WorkFileSummary | null {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')

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

const contextSubcommand = defineCommand({
  meta: {
    name: 'context',
    description: '返回 AI 可见的工作上下文（work.oxn + task.oxn + 注入的 domains）；带 task 级 Domain 隔离',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Work 名称' },
    task: { type: 'string', description: 'Task 名称（推荐；不传则返回 work 级上下文）' },
    'state-path': { type: 'string', description: '可选，state.json 路径（用于 currentFocus）' },
    'emit-md': { type: 'string', description: '可选，把摘要写到指定 .md 路径' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const workName = ctx.args.name as string
    const taskName = ctx.args.task as string | undefined
    const statePathArg = ctx.args['state-path'] as string | undefined
    const emitMdPath = ctx.args['emit-md'] as string | undefined
    const root = getProjectRoot()

    const workFile = getWorkOxnPath(root, workName)
    if (!existsSync(workFile)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `work "${workName}" not found at ${workFile}` }, format)
    }
    const work = readWorkFile(workFile)
    if (!work) {
      return outputError({ code: 'OXN_DSL_PARSE_FAILED', message: `Failed to parse ${workFile}` }, format)
    }

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
        statePathArg ?? join(root, BOUNDARY_DIR, 'works', workName, 'tasks', taskName, 'task-state.json')
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
        isolationNotice: '本 task 只能看到引用的 domain，work 中其他 domain 一律不可见。',
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
        },
        human: `Work ${workName} (no --task specified, returning workspace-level context)
  Domains:    ${work.domains.map((d) => d.name).join(', ')}
  Blueprints: ${work.blueprints.map((b) => b.name).join(', ')}
  Parts:      ${work.parts.map((p) => p.name).join(', ')}
  Probes:     ${work.probes.map((p) => p.name).join(', ')}
  Tasks:      ${work.tasks.length}
  (传 --task <name> 获取 task 级隔离上下文)`,
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
// Top-level command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'work',
    description:
      'Work 编排与运行时（list/create/validate/add-task/edit-task/list-task/task-status/delete-task/run/submit/status/context）',
  },
  subCommands: {
    list: listSubcommand,
    create: createSubcommand,
    validate: validateSubcommand,
    'add-task': addTaskSubcommand,
    'list-task': listTaskSubcommand,
    'task-status': taskStatusSubcommand,
    'edit-task': editTaskSubcommand,
    'delete-task': deleteTaskSubcommand,
    run: runSubcommand,
    submit: submitSubcommand,
    status: statusSubcommand,
    context: contextSubcommand,
  },
  run() {
    // No-op: help text is provided by citty
  },
})
