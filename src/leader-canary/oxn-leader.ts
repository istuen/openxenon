import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { URI } from 'langium'
import { createOxnServices, OxnParser } from '../oxn-dsl-mvp'
import {
  isBlueprintDeclaration,
  isPartDeclaration,
  isPartSkill,
  isWorkContext,
  isWorkDeclaration,
  type BlueprintDeclaration,
  type OXNDocument,
  type PartDeclaration,
  type PartSkill,
  type WorkContext,
  type WorkDeclaration,
} from '../oxn-dsl-mvp/generated/ast'
import {
  appendTrace,
  createInitialState,
  ensureWorkDir,
  getFrozenPath,
  loadState,
  saveState,
  stateExists,
  type PartSkillSnapshot,
  type PartSpec,
  type SkillContextSnapshot,
  type WorkState,
} from '../work-mvp'
import { output } from '../cli/output'
import { getFormatFromArgs } from '../cli/output'

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
    probeResults: Array<{ probe: string; passed: boolean; output?: unknown; errorMessage?: string }>
  }>
  loopMeta: { isLooping: boolean; iteration: number; maxIterations: number }
  frozen: string | null
}

function getProjectRoot(): string {
  return process.cwd()
}

function readTextFile(filePath: string): string {
  return readFileSync(resolve(filePath), 'utf-8')
}

async function parseOxnFile(
  filePath: string,
): Promise<{ doc: OXNDocument; work: WorkDeclaration | null; parts: PartDeclaration[] }> {
  const services = createOxnServices()
  const parser = new OxnParser(services)
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

function snapshotSkill(skill: PartSkill | undefined): PartSkillSnapshot {
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

/**
 * Resolve a slot binding's `ref` to a PartDeclaration in a sibling parts.oxn.
 * MVP: only looks in the same directory as the work file (parts.oxn / part-*.oxn).
 * Returns null if not found.
 */
async function resolveSlotRef(slotRef: string, workFilePath: string): Promise<PartDeclaration | null> {
  // Format: @scope/path/to/part-name → last segment is the part name
  const parts = slotRef.split('/')
  const targetName = parts[parts.length - 1]?.replace(/^"|"$/g, '') ?? ''
  if (!targetName) return null

  const workDir = dirname(resolve(workFilePath))
  const candidateFiles = ['parts.oxn', 'part.oxn']
  for (const filename of candidateFiles) {
    const candidate = resolve(workDir, filename)
    if (!existsSync(candidate)) {
      continue
    }
    try {
      const { parts: declaredParts } = await parseOxnFile(candidate)
      const match = declaredParts.find((p) => parsePartName(p.name) === targetName)
      if (match) {
        return match
      }
    } catch {}
  }
  return null
}

async function buildPartSpecs(
  work: WorkDeclaration,
  inlineParts: PartDeclaration[],
  workFilePath: string,
): Promise<PartSpec[]> {
  // Index inline PartDeclarations by name for quick lookup. When the same file
  // contains both the work and part bodies (the common case), skill data
  // comes from here; slot binding order still drives the part sequence.
  const inlineByName = new Map<string, PartDeclaration>()
  for (const p of inlineParts) {
    inlineByName.set(parsePartName(p.name), p)
  }

  const specs: PartSpec[] = []
  for (const slot of work.slotBindings) {
    const partName = parsePartName(slot.name)
    let ref: string | undefined = slot.ref
    let skill: PartSkill | undefined = slot.skill
    let align = slot.align

    const inline = inlineByName.get(partName)
    if (inline) {
      if (inline.skill) skill = inline.skill
      if (inline.align) align = inline.align
      if (inline.ref !== undefined) ref = inline.ref
    } else if (slot.ref) {
      const resolved = await resolveSlotRef(slot.ref, workFilePath)
      if (resolved) {
        if (resolved.skill) skill = resolved.skill
        if (resolved.align) align = resolved.align
        if (!ref) ref = resolved.ref ?? slot.ref
      }
    }

    specs.push({
      partName,
      align,
      ...(ref !== undefined ? { ref } : {}),
      skill: snapshotSkill(skill),
    })
  }

  // Backward-compat: legacy work.oxn files with no slot bindings (only inline
  // PartDeclarations) are still supported by emitting the parts in declaration
  // order.
  if (specs.length === 0 && inlineParts.length > 0) {
    return inlineParts.map((p) => ({
      partName: parsePartName(p.name),
      align: p.align ?? '',
      ...(p.ref !== undefined ? { ref: p.ref } : {}),
      skill: snapshotSkill(p.skill),
    }))
  }

  return specs
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
  return {
    workName: state.workName,
    overallStatus: state.status,
    skillContext: makeContextJson(state.skillContext, state.currentPart ?? '', state),
    parts: partSpecs.map((p) => ({
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
      probeResults: [],
    })),
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
  return { ok: false, error: suggestion ? { code, message, suggestion } : { code, message } }
}

function defaultLifecycleForSlot(slotName: string): string {
  const name = slotName.toLowerCase()
  if (name === 'test' || name === 'verify' || name === 'validate' || name === 'check') {
    return 'test'
  }
  if (name === 'fix' || name === 'develop' || name === 'implement' || name === 'build' || name === 'refactor') {
    return 'fix'
  }
  return 'code'
}

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
    `// Edit goal/constraints and each part's skill, then run:`,
    `//   oxn leader run --work-file work.oxn`,
    '',
  ].join('\n')
  const slotBindings = slots.map((s) => `  part "${s.name}" align "${s.align}" { }`).join('\n')
  const partDefs = slots
    .map((s) => {
      const lifecycle = defaultLifecycleForSlot(s.name)
      return `part "${s.name}" align "${s.align}" {
  skill {
    lifecycle = "${lifecycle}";
    objective = "TODO: 描述 ${s.name} 阶段要做什么";
    acceptance = [
      "TODO: 列出可验收的产出"
    ];
    guidance = "TODO: 提示给 AI 的额外指引";
  }
}`
    })
    .join('\n\n')
  return `${header}work "${workName}" ref "@oxn/blueprints/${blueprintName}" {
  context {
    goal = "TODO: 描述这个 work 要达成什么";
    constraints = [
      "TODO: 列出硬约束"
    ];
    loop_policy {
      max_iterations = 3;
    }
  }
${slotBindings}
}

${partDefs}
`
}

const runSubcommand = defineCommand({
  meta: { name: 'run', description: '启动 work 状态机，输出 skillContext JSON' },
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
      if (stateExists(projectRoot, workName)) {
        return output(
          errorJson('OXN_WORK_ALREADY_EXISTS', `work "${workName}" already exists`, 'use oxn leader status to view'),
          format,
        )
      }
      ensureWorkDir(projectRoot, workName)
      const partSpecs = await buildPartSpecs(work, inlineParts, filePath)
      const partNames = partSpecs.map((p) => p.partName)
      const maxIters = work.context?.loopPolicy?.maxIterations ?? 3
      const state = createInitialState(workName, partNames, maxIters)
      state.skillContext = snapshotContext(work.context, maxIters)
      state.partSpecs = partSpecs
      saveState(projectRoot, workName, state)
      appendTrace(projectRoot, workName, {
        event: 'work-started',
        workName,
        blueprint: work.ref,
        parts: partSpecs.map((p) => p.partName),
        at: new Date().toISOString(),
      })
      output({ ok: true, data: makeReport(state) }, format)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_DSL_PARSE_FAILED', message), format)
    }
  },
})

const submitSubcommand = defineCommand({
  meta: { name: 'submit', description: '提交证据，调度 Probe，更新状态机' },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work 名称' },
    '--evidence': { type: 'string', description: 'AI 提交的证据 JSON' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const projectRoot = getProjectRoot()
    try {
      const state = loadState(projectRoot, workName)
      if (!state) {
        return output(errorJson('OXN_WORK_NOT_FOUND', `work "${workName}" not found`), format)
      }
      const probeResults: Array<{ probe: string; passed: boolean; output?: unknown; errorMessage?: string }> = []
      if (state.currentPart) {
        if (!state.completedParts.includes(state.currentPart)) {
          state.completedParts.push(state.currentPart)
        }
        probeResults.push({ probe: 'state-machine', passed: true, output: { advanced: true } })
      }
      state.loopMeta.currentIteration += 1
      const allPartNames = (state.partSpecs ?? []).map((p) => p.partName)
      const nextIdx = state.completedParts.length
      if (allPartNames.length > 0 && nextIdx >= allPartNames.length) {
        state.status = 'passed'
        state.currentPart = null
        state.frozenPath = getFrozenPath(projectRoot, workName)
        const frozen = {
          workName,
          generatedAt: new Date().toISOString(),
          probes: probeResults,
          trace: state.completedParts,
        }
        writeFileSync(state.frozenPath, JSON.stringify(frozen, null, 2), 'utf-8')
      } else if (allPartNames.length > 0) {
        state.currentPart = allPartNames[nextIdx] ?? null
      } else {
        state.status = 'passed'
        state.currentPart = null
        state.frozenPath = getFrozenPath(projectRoot, workName)
        const frozen = {
          workName,
          generatedAt: new Date().toISOString(),
          probes: probeResults,
          trace: state.completedParts,
        }
        writeFileSync(state.frozenPath, JSON.stringify(frozen, null, 2), 'utf-8')
      }
      saveState(projectRoot, workName, state)
      appendTrace(projectRoot, workName, {
        event: 'submit',
        iteration: state.loopMeta.currentIteration,
        probeResults,
        at: new Date().toISOString(),
      })
      output({ ok: true, data: makeReport(state) }, format)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_LEADER_NEXT_FAILED', message), format)
    }
  },
})

const statusSubcommand = defineCommand({
  meta: { name: 'status', description: '查询 work 当前状态' },
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
      const state = loadState(projectRoot, workName)
      if (!state) {
        return output(errorJson('OXN_WORK_NOT_FOUND', `work "${workName}" not found`), format)
      }
      output({ ok: true, data: state }, format)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      output(errorJson('OXN_STATUS_FAILED', message), format)
    }
  },
})

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
    const force = ctx.args['force'] === true
    const projectRoot = getProjectRoot()
    try {
      // Resolve blueprint file. Default to .openxenon/blueprints/<name>.oxn
      // (or .openxenon/blueprints/<name>/blueprint.oxn) so users can run
      // `oxn leader new --name foo` without passing --blueprint-file.
      const defaultCandidates = [
        resolve(projectRoot, '.openxenon', 'blueprints', `${workName}.oxn`),
        resolve(projectRoot, '.openxenon', 'blueprints', workName, 'blueprint.oxn'),
      ]
      const blueprintPath = customBlueprint ? resolve(customBlueprint) : null
      let absBlueprint: string | null = blueprintPath
      if (!absBlueprint || !existsSync(absBlueprint)) {
        if (customBlueprint) {
          return output(errorJson('OXN_FILE_NOT_FOUND', `blueprint file not found: ${customBlueprint}`), format)
        }
        const found = defaultCandidates.find((p) => existsSync(p))
        if (!found) {
          return output(
            errorJson(
              'OXN_FILE_NOT_FOUND',
              `blueprint file not found: tried ${defaultCandidates.join(', ')}`,
              'pass --blueprint-file to point at an existing blueprint',
            ),
            format,
          )
        }
        absBlueprint = found
      }
      const { doc } = await parseOxnFile(absBlueprint)
      const blueprint = doc.entities.find(isBlueprintDeclaration) as BlueprintDeclaration | undefined
      if (!blueprint) {
        return output(errorJson('OXN_NO_BLUEPRINT', `No Blueprint declaration found in ${absBlueprint}`), format)
      }
      if (!blueprint.name) {
        return output(errorJson('OXN_INVALID_BLUEPRINT', 'Blueprint has no name'), format)
      }
      if (blueprint.partSlots.length === 0) {
        return output(errorJson('OXN_INVALID_BLUEPRINT', `Blueprint "${blueprint.name}" has no part slots`), format)
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
        return output(
          errorJson(
            'OXN_OUTPUT_DIR_EXISTS',
            `output directory already exists: ${outputDir}`,
            'use --force to overwrite, or --output-dir to pick a new location',
          ),
          format,
        )
      }
      mkdirSync(outputDir, { recursive: true })
      const workFile = resolve(outputDir, 'work.oxn')
      if (!force && existsSync(workFile)) {
        return output(
          errorJson('OXN_OUTPUT_FILE_EXISTS', `work.oxn already exists in ${outputDir}`, 'use --force to overwrite'),
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
            files: {
              work: workFile,
            },
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
  },
  run() {
    // No-op: help text is provided by citty
  },
})

void isPartSkill
void isWorkContext
