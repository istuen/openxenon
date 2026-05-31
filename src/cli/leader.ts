import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import { getFormatFromArgs, output, outputError } from './output'
import { resolveBuiltinBlueprint } from '../leader/builtin-resolver'
import { createOxnServices, resetOxnServices } from '../oxn-dsl/langium/oxn-services'
import { generateOxnAssembly, categorizeEntities } from '../oxn-dsl/generator/oxn-generator'
import { getProbeHandler, type ProbeObservation } from '../infra/probes'
import type { OXNDocument } from '../oxn-dsl/generated/ast'
import { URI } from 'langium'

const WORKS_DIR = 'works'

function getProjectRoot(): string {
  return process.cwd()
}

function getLeaderWorksDir(): string {
  return join(__dirname, '..', 'leader', 'works')
}

function getWorkDir(workName: string): string {
  return join(getProjectRoot(), BOUNDARY_DIR, WORKS_DIR, workName)
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

interface WorkState {
  currentStage: string
  completedStages: string[]
  pendingStages: string[]
}

function getWorkStatePath(workName: string): string {
  return join(getWorkDir(workName), 'work-state.json')
}

function getWorkTracePath(workName: string): string {
  return join(getWorkDir(workName), 'work-trace.json')
}

function loadWorkState(workName: string): WorkState | null {
  const statePath = getWorkStatePath(workName)
  if (!existsSync(statePath)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(statePath, 'utf-8'))
  } catch {
    return null
  }
}

function saveWorkState(workName: string, state: WorkState): void {
  const statePath = getWorkStatePath(workName)
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
}

function saveWorkTrace(workName: string, trace: unknown): void {
  const tracePath = getWorkTracePath(workName)
  const existing = existsSync(tracePath) ? JSON.parse(readFileSync(tracePath, 'utf-8')) : []
  existing.push(trace)
  writeFileSync(tracePath, JSON.stringify(existing, null, 2), 'utf-8')
}

export default defineCommand({
  meta: {
    name: 'leader',
    description: 'Leader 模块 - 内层验证先行者',
  },
  subCommands: {
    start: defineCommand({
      meta: {
        name: 'start',
        description: '初始化 Leader 工作空间',
      },
      args: {
        'work-name': {
          type: 'string',
          required: true,
          description: 'Work 名称',
        },
        '--json': { type: 'boolean', description: 'JSON 格式输出' },
        '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const workName = ctx.args['work-name'] as string

        const sourceDir = getLeaderWorksDir()
        const templateName = workName.startsWith('ldr-') ? workName : `ldr-${workName}`
        const sourceFile = join(sourceDir, `${templateName}.oxn`)

        if (!existsSync(sourceFile)) {
          return outputError(
            {
              code: 'OXN_LEADER_NOT_FOUND',
              message: `Leader 模板不存在: ldr-${workName}.oxn`,
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

        const blueprintName = content.match(/ref "@oxn\/blueprints\/([^"]+)"/)?.[1] || 'unknown'

        const resolved = resolveBuiltinBlueprint(`@oxn/blueprints/${blueprintName}`)
        const blueprint = resolved?.blueprint as { slots?: Array<{ name: string }> } | null
        const pendingStages = blueprint?.slots?.map((s) => s.name) || ['verify', 'fix', 'analysis']

        const initialState: WorkState = {
          currentStage: '',
          completedStages: [],
          pendingStages,
        }
        saveWorkState(workName, initialState)
        saveWorkTrace(workName, { event: 'work-created', blueprint: blueprintName, at: new Date().toISOString() })

        output(
          {
            data: { workName, path: destFile, blueprint: blueprintName },
            human: `Leader 工作空间已创建: ${workName}\n路径: ${destFile}\nBlueprint: ${blueprintName}\n\n使用 oxn leader next ${workName} 开始验证`,
          },
          format,
        )
      },
    }),
    next: defineCommand({
      meta: {
        name: 'next',
        description: '执行下一步验证',
      },
      args: {
        'work-name': {
          type: 'string',
          required: true,
          description: 'Work 名称',
        },
        '--json': { type: 'boolean', description: 'JSON 格式输出' },
        '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const workName = ctx.args['work-name'] as string

        const workDir = getWorkDir(workName)
        const workFile = join(workDir, 'work.oxn')

        if (!existsSync(workDir)) {
          return outputError(
            {
              code: 'OXN_LEADER_NOT_FOUND',
              message: `工作空间不存在: ${workName}`,
              suggestion: `请先执行 oxn leader start ${workName}`,
            },
            format,
          )
        }

        if (!existsSync(workFile)) {
          return outputError(
            {
              code: 'OXN_LEADER_NO_WORK',
              message: `work.oxn 不存在: ${workName}`,
            },
            format,
          )
        }

        try {
          const content = readFileSync(workFile, 'utf-8')

          const services = createOxnServices()
          const shared = services.shared
          shared.ServiceRegistry.register(services)
          const uri = URI.file(workFile)
          const factory = shared.workspace.LangiumDocumentFactory
          const doc = factory.fromString(content, uri, undefined)

          const errors: string[] = []
          if (doc.parseResult?.lexerErrors?.length) {
            for (const err of doc.parseResult.lexerErrors) {
              errors.push(`[Lexer] ${err.message}`)
            }
          }
          if (doc.parseResult?.parserErrors?.length) {
            for (const err of doc.parseResult.parserErrors) {
              errors.push(`[Parser] ${err.message}`)
            }
          }

          if (errors.length > 0) {
            resetOxnServices()
            saveWorkTrace(workName, { event: 'dsl-parse-failed', errors, at: new Date().toISOString() })
            return outputError(
              {
                code: 'OXN_DSL_PARSE_FAILED',
                message: `DSL 解析失败:\n${errors.join('\n')}`,
              },
              format,
            )
          }

          const ast = doc.parseResult?.value as OXNDocument
          const bundle = generateOxnAssembly(ast)
          const categorized = categorizeEntities(ast)

          saveWorkTrace(workName, {
            event: 'ast-generated',
            entities: categorized.blueprints.length + categorized.parts.length + categorized.probes.length,
            at: new Date().toISOString(),
          })

          const workEntity = bundle.entities.find((e) => e.type === 'work')
          const blueprintRef = workEntity?.data?.use || ''
          const resolved = resolveBuiltinBlueprint(blueprintRef)

          saveWorkTrace(workName, {
            event: 'blueprint-resolve-attempt',
            blueprintRef,
            resolved: resolved ? 'found' : 'not-found',
            at: new Date().toISOString(),
          })

          const blueprint = resolved?.blueprint || categorized.blueprints[0]
          const blueprintParts = resolved?.parts || categorized.parts

          const state = loadWorkState(workName) || {
            currentStage: '',
            completedStages: [],
            pendingStages: ['Code', 'Test'],
          }

          const nextStage = state.pendingStages.find((s) => !state.completedStages.includes(s))
          if (!nextStage) {
            output(
              {
                data: { workName, status: 'all-stages-completed', state },
                human: `所有阶段已完成`,
              },
              format,
            )
            return
          }

          const blueprintSlots = (blueprint as { slots?: Array<{ name: string }> })?.slots
          const stage = blueprintSlots?.find((s) => s.name === nextStage)
          if (!stage) {
            saveWorkTrace(workName, { event: 'stage-not-found', stage: nextStage, at: new Date().toISOString() })
            return outputError(
              {
                code: 'OXN_LEADER_STAGE_NOT_FOUND',
                message: `Stage not found: ${nextStage} in blueprint`,
              },
              format,
            )
          }

          const probeResults: Record<string, unknown>[] = []
          for (const part of blueprintParts) {
            const partName = (part as { name: string }).name
            const partAlign = (part as { align?: string }).align
            if (partAlign === nextStage || partName.toLowerCase().includes(nextStage.toLowerCase())) {
              const probes =
                (part as { probes?: Array<{ name: string; ref: string; params: Record<string, unknown> }> }).probes ||
                []
              for (const probe of probes) {
                const handler = getProbeHandler(probe.ref)
                if (handler) {
                  const obs: ProbeObservation = await handler(probe.params || {}, { projectRoot: workDir })
                  probeResults.push({ probe: probe.name, ref: probe.ref, result: obs })
                }
              }
            }
          }

          const allPassed = probeResults.every((r) => {
            const obs = r.result as ProbeObservation
            return obs.exitCode === 0 || obs.output
          })

          state.completedStages.push(nextStage)
          state.currentStage = nextStage
          saveWorkState(workName, state)

          saveWorkTrace(workName, {
            event: 'stage-completed',
            stage: nextStage,
            passed: allPassed,
            probes: probeResults,
            at: new Date().toISOString(),
          })

          output(
            {
              data: { workName, stage: nextStage, passed: allPassed, probes: probeResults, state },
              human: `阶段 ${nextStage} 完成\n通过: ${allPassed}\nProbes: ${probeResults.length}`,
            },
            format,
          )

          resetOxnServices()
        } catch (err) {
          resetOxnServices()
          const errorMsg = err instanceof Error ? err.message : String(err)
          saveWorkTrace(workName, { event: 'error', message: errorMsg, at: new Date().toISOString() })
          return outputError(
            {
              code: 'OXN_LEADER_NEXT_FAILED',
              message: errorMsg,
            },
            format,
          )
        }
      },
    }),
    list: defineCommand({
      meta: {
        name: 'list',
        description: '列出可用模板',
      },
      args: {
        '--json': { type: 'boolean', description: 'JSON 格式输出' },
        '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const worksDir = getLeaderWorksDir()

        if (!existsSync(worksDir)) {
          return output(
            {
              data: { templates: [] },
              human: '暂无 Leader 模板',
            },
            format,
          )
        }

        const files = readdirSync(worksDir).filter((f) => f.endsWith('.oxn') && f.startsWith('ldr-'))
        const templates = files.map((f) => ({
          name: f.replace('ldr-', '').replace('.oxn', ''),
          file: f,
        }))

        output(
          {
            data: { templates },
            human:
              templates.length > 0
                ? `可用模板:\n${templates.map((t) => `  ldr-${t.name}`).join('\n')}`
                : '暂无 Leader 模板',
          },
          format,
        )
      },
    }),
  },
  run() {
    console.log('使用 oxn leader <子命令> 查看可用子命令')
    console.log('子命令: start, next, list')
  },
})
