import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR } from '../kernel/constants'
import {
  createOxnParser,
  isBlueprintDeclaration,
  isPartDeclaration,
  isWorkDeclaration,
  type BlueprintDeclaration,
  type OXNDocument,
  type PartDeclaration,
  type WorkContext,
  type WorkDeclaration,
} from '../oxn-dsl'
import {
  appendTrace,
  createInitialState,
  ensureWorkDir,
  ExecError,
  getTaskOxnPath,
  loadState,
  loadTaskState,
  loadWorkspaceState,
  runTask,
  runWorkSpace,
  saveState,
  submitTaskPart,
  validateTasksPresent,
  type PartExecution,
  type PartSkillSnapshot,
  type PartSpec,
  type SkillContextSnapshot,
  type WorkState,
} from '../work'
import { output, outputError, getFormatFromArgs } from './output'

// =============================================================================
// Unified `oxn leader` command (Phase 2.3 + v0.1 dual-layer).
//
// Primary subcommands (mvp-style, full state machine):
//   new         — generate work.oxn from a blueprint
//   run         — start the state machine
//   submit      — advance one part (optionally run aligned probes)
//   status      — read current state
//
// Reference-style aliases (kept for backward compatibility with
// users who already scripted around the old `start|next|list`):
//   start       — alias for `new`
//   next        — alias for `submit --run-probes`
//   list        — list builtin ldr-*.oxn templates (reference semantics)
// =============================================================================

const WORKS_DIR = 'works'
const BUILTIN_TEMPLATES_DIR = join(__dirname, '..', 'leader', 'works')

function getProjectRoot(): string {
  return process.cwd()
}

function getWorkDir(workName: string): string {
  return join(getProjectRoot(), BOUNDARY_DIR, WORKS_DIR, workName)
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

type SkillContextJson = {
  overallGoal: string
  constraints: string[]
  currentFocus: string
  loopPolicy: { currentIteration: number; maxIterations: number }
}

type PartSkillJson = {
  lifecycle: string
  objective: string
  acceptance: string[]
  guidance?: string
}

type SkillReport = {
  workName: string
  overallStatus: 'pending' | 'running' | 'passed' | 'failed' | 'error'
  skillContext: SkillContextJson
  parts: Array<{
    partName: string
    align: string
    ref?: string
    lifecycle: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    stepSkillContext: PartSkillJson
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
}

function readTextFile(filePath: string): string {
  return readFileSync(resolve(filePath), 'utf-8')
}

async function parseOxnFile(
  filePath: string,
): Promise<{ doc: OXNDocument; work: WorkDeclaration | null; parts: PartDeclaration[] }> {
  const parser = createOxnParser()
  const content = readTextFile(filePath)
  const result = await parser.parse(content, URI.file(resolve(filePath)))
  if (result.parseErrors.length > 0 || result.lexerErrors.length > 0) {
    throw new Error(`DSL parse failed: ${[...result.parseErrors, ...result.lexerErrors].join('; ')}`)
  }
  const doc = result.ast as OXNDocument
  const work = doc.entities.find(isWorkDeclaration) ?? null
  const parts = doc.entities.filter(isPartDeclaration)
  return { doc, work, parts }
}

function snapshotSkill(skill: import('../oxn-dsl').PartSkill | undefined): PartSkillSnapshot {
  if (!skill) {
    return { lifecycle: 'code', objective: '', acceptance: [] }
  }
  return {
    lifecycle: skill.lifecycle ?? 'code',
    objective: skill.objective ?? '',
    acceptance: skill.acceptance ?? [],
    ...(skill.guidance !== undefined ? { guidance: skill.guidance } : {}),
  }
}

function snapshotContext(ctx: WorkContext | undefined, maxIters: number): SkillContextSnapshot {
  return {
    overallGoal: ctx?.goal ?? '',
    constraints: ctx?.constraints ?? [],
    maxIterations: ctx?.loopPolicy?.maxIterations ?? maxIters,
  }
}

function parsePartName(raw: string): string {
  return raw.replace(/^"|"$/g, '')
}

function defaultLifecycleForSlot(slotName: string): string {
  const name = slotName.toLowerCase()
  if (name === 'test' || name === 'verify' || name === 'validate' || name === 'check') return 'test'
  if (name === 'fix' || name === 'develop' || name === 'implement' || name === 'build' || name === 'refactor') {
    return 'fix'
  }
  return 'code'
}
void defaultLifecycleForSlot

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

function renderWorkSkeleton(
  workName: string,
  blueprintName: string,
  slots: Array<{ name: string; align: string }>,
): string {
  const header = [
    `// Generated by \`oxn leader new\` from blueprint "${blueprintName}"`,
    `// Edit goal/constraints and each task's objective, then run:`,
    `//   oxn leader run --work-file work.oxn`,
    '',
  ].join('\n')
  // v0.1-final: work.oxn 改用 blueprint ref + task 声明
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

function partStatus(partName: string, state: WorkState): 'pending' | 'running' | 'passed' | 'failed' {
  if (state.completedParts.includes(partName)) return 'passed'
  if (state.currentPart === partName) return 'running'
  return 'pending'
}

function makeContextJson(
  ctx: SkillContextSnapshot | undefined,
  currentFocus: string,
  state: WorkState,
): SkillContextJson {
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

function makeReport(state: WorkState): SkillReport {
  const partSpecs = state.partSpecs ?? []
  const executions = state.partExecutions ?? []
  const execByName = new Map<string, PartExecution>()
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

async function buildPartSpecs(work: WorkDeclaration, inlineParts: PartDeclaration[]): Promise<PartSpec[]> {
  const inlineByName = new Map<string, PartDeclaration>()
  for (const p of inlineParts) inlineByName.set(parsePartName(p.name), p)

  // v0.1-final: 优先从 work.tasks 编排块收集
  const taskEntries = work.tasks ?? []
  const specs: PartSpec[] = []
  for (const task of taskEntries) {
    const partName = parsePartName(task.name)
    specs.push({
      partName,
      align: task.blueprint ?? '',
      skill: snapshotSkill(undefined),
    })
  }

  // 回退到 inline parts (兼容旧的 multi-entity work.oxn 写法)
  if (specs.length === 0 && inlineParts.length > 0) {
    return inlineParts.map((p) => ({
      partName: parsePartName(p.name),
      align: '',
      skill: snapshotSkill(p.skill),
    }))
  }

  return specs
}

async function runProbesForPart(
  _projectRoot: string,
  partSpec: PartSpec | undefined,
): Promise<Array<{ probe: string; passed: boolean; output?: unknown; errorMessage?: string; durationMs?: number }>> {
  // v0.1: Task 不绑定 part 实体（无 ref 字段）。v0.2 接入 task.oxn 的 observe 字段跑真实探针。
  // 当前 leader submit 由 dual-state-exec 负责 no-op 探针，所以这里总是返回空。
  void _projectRoot
  void partSpec
  return []
}
void runProbesForPart

// ---------------------------------------------------------------------------
// Subcommand: new
// ---------------------------------------------------------------------------
const newSubcommand = defineCommand({
  meta: {
    name: 'new',
    description: '从 Blueprint 生成 work 骨架文件 (work.oxn，part 实体已内联)，不启动状态机',
  },
  args: {
    'blueprint-file': {
      type: 'string',
      description: 'blueprint.oxn 文件路径 (默认: .openxenon/blueprints/<name>.oxn)',
    },
    name: { type: 'string', required: true, description: '新 work 的名称' },
    'output-dir': {
      type: 'string',
      description: '输出目录 (默认: .openxenon/works/<name>/)',
    },
    force: { type: 'boolean', description: '覆盖已存在的文件' },
    json: { type: 'boolean', description: 'JSON 格式输出' },
    yaml: { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const customBlueprint = ctx.args['blueprint-file'] as string | undefined
    const workName = ctx.args.name as string
    const customOutputDir = ctx.args['output-dir'] as string | undefined
    const force = ctx.args.force === true
    const projectRoot = getProjectRoot()
    try {
      const defaultCandidates = [
        resolve(projectRoot, '.openxenon', 'blueprints', `${workName}.oxn`),
        resolve(projectRoot, '.openxenon', 'blueprints', workName, 'blueprint.oxn'),
      ]
      const blueprintPath = customBlueprint ? resolve(customBlueprint) : null
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
          {
            code: 'OXN_INVALID_BLUEPRINT',
            message: `Blueprint "${blueprint.name}" has no part slots`,
          },
          format,
        )
      }
      const blueprintName = parsePartName(blueprint.name)
      const slots = blueprint.partSlots.map((s) => ({
        name: parsePartName(s.name),
        align: capitalize(parsePartName(s.name)),
      }))
      const outputDir = customOutputDir
        ? resolve(customOutputDir)
        : resolve(projectRoot, '.openxenon', 'works', workName)
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
      mkdirSync(outputDir, { recursive: true })
      const workFile = resolve(outputDir, 'work.oxn')
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
      const workContent = renderWorkSkeleton(workName, blueprintName, slots)
      writeFileSync(workFile, workContent, 'utf-8')
      output(
        {
          ok: true,
          data: {
            workName,
            outputDir,
            blueprintPath: absBlueprint,
            blueprint: {
              name: blueprintName,
              version: blueprint.version ?? 1,
              slotCount: slots.length,
              slots: slots.map((s) => s.name),
            },
            files: { work: workFile },
            nextStep: `Edit the file, then run: oxn leader run --work-file ${workFile} --json`,
          },
        },
        format,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_DSL_PARSE_FAILED', message), format)
    }
  },
})

// ---------------------------------------------------------------------------
// Subcommand: run
// ---------------------------------------------------------------------------
const runSubcommand = defineCommand({
  meta: {
    name: 'run',
    description: '启动 work 状态机，初始化 workspace + 每个 task 状态',
  },
  args: {
    'work-file': { type: 'string', required: true, description: '.oxn 文件路径' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const filePath = ctx.args['work-file'] as string
    try {
      const { work, parts: inlineParts } = await parseOxnFile(filePath)
      if (!work) {
        return output(errorJson('OXN_NO_WORK', 'No Work declaration found in .oxn file'), format)
      }
      const projectRoot = getProjectRoot()
      const workName = parsePartName(work.name) || 'unnamed'
      if (loadWorkspaceState(projectRoot, workName)) {
        return output(
          errorJson('OXN_WORK_ALREADY_EXISTS', `work "${workName}" already exists`, 'use oxn leader status to view'),
          format,
        )
      }
      ensureWorkDir(projectRoot, workName)

      // v0.1-final: 提取 blueprint + domain + task 块
      const blueprintNames = (work.blueprints ?? []).map((u) => u.name)
      const domainNames = (work.domains ?? []).map((u) => u.name)
      const taskEntries = work.tasks ?? []
      const declaredTaskNames = taskEntries.map((t) => parsePartName(t.name))

      // L2 阻塞：fail-fast 校验 task.oxn 是否齐备
      const validation = validateTasksPresent(projectRoot, workName, declaredTaskNames)
      if (!validation.ok) {
        return output(
          errorJson(
            'OXN_TASK_OXN_MISSING',
            `work "${workName}" declares ${declaredTaskNames.length} tasks but ${validation.missing.length} task.oxn missing: ${validation.missing.join(', ')}`,
            `create them with: oxn work task new --work ${workName} --task <name> --blueprint <bp>`,
          ),
          format,
        )
      }

      const partSpecs = await buildPartSpecs(work, inlineParts)
      const maxIters = work.context?.loopPolicy?.maxIterations ?? 3

      // 写 workspace 级 state
      const workspace = runWorkSpace({
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

      // 为每个 task 启动 task 级 state
      for (const taskName of declaredTaskNames) {
        const taskOxnPath = getTaskOxnPath(projectRoot, workName, taskName)
        const content = readFileSync(taskOxnPath, 'utf-8')
        const blueprintMatch = content.match(/blueprint\s+"([^"]+)"/)
        const blueprint = blueprintMatch?.[1] ?? blueprintNames[0] ?? ''
        const injects = Array.from(content.matchAll(/inject\s+"([^"]+)"/g)).map((m) => m[1]!)
        // 抽取 task.oxn 的 part 名字作为 partNames
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

      // 同时写旧 work 空间下的 state.json（向后兼容 v0.0.x leader status 查询）
      const legacyState = createInitialState(
        workName,
        partSpecs.map((p) => p.partName),
        maxIters,
      )
      legacyState.skillContext = snapshotContext(work.context, maxIters)
      legacyState.partSpecs = partSpecs
      saveState(projectRoot, workName, legacyState)

      appendTrace(projectRoot, workName, {
        event: 'work-started',
        workName,
        blueprints: blueprintNames,
        domains: domainNames,
        tasks: declaredTaskNames,
        parts: partSpecs.map((p) => p.partName),
        at: new Date().toISOString(),
      })

      output(
        {
          ok: true,
          data: {
            ...makeReport(legacyState),
            // v0.1 增强：报告 task 分解
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
        return outputError(
          {
            code: err.code,
            message: err.message,
          },
          format,
        )
      }
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_DSL_PARSE_FAILED', message), format)
    }
  },
})

// ---------------------------------------------------------------------------
// Subcommand: submit
// ---------------------------------------------------------------------------
const submitSubcommand = defineCommand({
  meta: {
    name: 'submit',
    description: 'v0.1: 提交 task 内的当前 part（--task 必填），调度 Probe（如 --run-probes）',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    task: { type: 'string', required: true, description: 'Task 名称（v0.1 必填）' },
    '--evidence': { type: 'string', description: 'AI 提交的证据 JSON' },
    '--run-probes': { type: 'boolean', description: '执行 task 级 no-op 探针（v0.1 占位）' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const taskName = ctx.args.task as string
    const runProbes = ctx.args['run-probes'] === true
    const projectRoot = getProjectRoot()
    try {
      // v0.1: 走 dual-state-exec 路径
      const result = submitTaskPart({
        projectRoot,
        workName,
        taskName,
        runProbes,
      })

      // 同步旧 v0.0.x state.json（向后兼容 leader status 查询）
      const legacyState = loadState(projectRoot, workName)
      if (legacyState) {
        // 把 task 的 completedParts 合并到 legacy state（让旧 status 输出能看到进度）
        const taskState = result.taskState
        legacyState.completedParts = Array.from(new Set([...legacyState.completedParts, ...taskState.completedParts]))
        if (result.nextPart === null) {
          legacyState.status = result.status
        }
        saveState(projectRoot, workName, legacyState)
      }

      // 收集探测结果
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

      // v0.1 frozen 路径：tasks/<task>/frozen.json
      const frozenPath = result.frozen
        ? join(projectRoot, BOUNDARY_DIR, 'works', workName, 'tasks', taskName, 'frozen.json')
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
            frozen: frozenPath,
            workspaceStatus: loadWorkspaceState(projectRoot, workName)?.status ?? 'pending',
          },
        },
        format,
      )
    } catch (err) {
      if (err instanceof ExecError) {
        return outputError(
          {
            code: err.code,
            message: err.message,
          },
          format,
        )
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
  meta: { name: 'status', description: '查询 work 当前状态（v0.1 含 task 分解）' },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const projectRoot = getProjectRoot()
    try {
      // v0.1: 优先读 workspace 级 state
      const workspace = loadWorkspaceState(projectRoot, workName)
      if (!workspace) {
        return output(errorJson('OXN_WORK_NOT_FOUND', `work "${workName}" not found`), format)
      }
      // task 分解
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

      // 兼容旧 report（用首个 task 的 partSpecs 兜底）
      const legacyState = loadState(projectRoot, workName)
      const report = legacyState ? makeReport(legacyState) : { workName, parts: [] }

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
// Aliases (reference compatibility)
// ---------------------------------------------------------------------------
const startSubcommand = defineCommand({
  meta: { name: 'start', description: '[alias of `new`] 从内置 ldr-*.oxn 模板生成 work.oxn' },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    // Reference semantics: copy a ldr-<name>.oxn builtin template into
    // .openxenon/works/<name>/work.oxn, then call into the same
    // initialization path as `new` would for a user-provided blueprint.
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const templateName = workName.startsWith('ldr-') ? workName : `ldr-${workName}`
    const sourceFile = join(BUILTIN_TEMPLATES_DIR, `${templateName}.oxn`)
    if (!existsSync(sourceFile)) {
      return outputError(
        {
          code: 'OXN_LEADER_NOT_FOUND',
          message: `Leader 模板不存在: ${templateName}.oxn`,
          suggestion: '使用 oxn leader list 查看可用模板',
        },
        format,
      )
    }
    const workDir = getWorkDir(workName)
    ensureDirectory(workDir)
    const destFile = join(workDir, 'work.oxn')
    const content = readFileSync(sourceFile, 'utf-8')
    writeFileSync(destFile, content, 'utf-8')
    output(
      {
        ok: true,
        data: { workName, path: destFile },
        human: `Leader 工作空间已创建: ${workName}\n路径: ${destFile}\n使用 oxn leader run --work-file ${destFile}`,
      },
      format,
    )
  },
})

const nextSubcommand = defineCommand({
  meta: { name: 'next', description: '[alias of `submit --run-probes`] 推进并执行探针' },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    // Re-implement `submit --run-probes` so we don't depend on the
    // submitSubcommand's runtime function (which is bound to a more
    // permissive args type). We just delegate to a fresh context with
    // run-probes pre-set (citty strips the leading dashes).
    const augmented = {
      ...ctx,
      args: {
        ...ctx.args,
        'run-probes': true,
      },
    }
    return (submitSubcommand.run as unknown as (c: typeof augmented) => Promise<void>)(augmented)
  },
})

const listSubcommand = defineCommand({
  meta: { name: 'list', description: '列出内置 ldr-*.oxn 模板' },
  args: {
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    if (!existsSync(BUILTIN_TEMPLATES_DIR)) {
      return output({ ok: true, data: { templates: [] } }, format)
    }
    const files = readdirSync(BUILTIN_TEMPLATES_DIR).filter((f) => f.endsWith('.oxn') && f.startsWith('ldr-'))
    const templates = files.map((f) => ({
      name: f.replace('ldr-', '').replace('.oxn', ''),
      file: f,
    }))
    output(
      {
        ok: true,
        data: { templates },
        human:
          templates.length > 0 ? `可用模板:\n${templates.map((t) => `  ${t.file}`).join('\n')}` : '暂无 Leader 模板',
      },
      format,
    )
  },
})

export default defineCommand({
  meta: {
    name: 'leader',
    description: 'Leader 模块 — AI Agent 编排器，驱动 Work 状态机',
  },
  subCommands: {
    new: newSubcommand,
    run: runSubcommand,
    submit: submitSubcommand,
    status: statusSubcommand,
    // Reference compatibility aliases
    start: startSubcommand,
    next: nextSubcommand,
    list: listSubcommand,
  },
  run() {
    // No-op: help text is provided by citty
  },
})
