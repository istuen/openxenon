import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, WORK_DIR } from '../kernel/constants'
import { getFormatFromArgs, output } from './output'

// =============================================================================
// `oxn work migrate` — v0.1 硬迁移
//
// 检测旧布局：
//   1. .openxenon/work/task/<name>.oxn (旧 work.oxn 位置)
//   2. .openxenon/works/<name>/state.json 是单层 WorkState（有 partExecutions/partSpecs 字段）
//
// 迁移策略：
//   - 把旧 work.oxn 转成新格式（ref → use_blueprint）
//   - 把单层 state.json 拆为 workspace 级 + 单一 task 级
//   - frozen.json 移到 tasks/<derived>/frozen.json
//   - work-trace.jsonl 拆为 workspace 级 + task 级
//
// 兼容性：旧 task 实体（多文件 task.oxn）暂不自动迁移，需要用户手动创建 task
// =============================================================================

function getProjectRoot(): string {
  return process.cwd()
}

function detectLegacyLayout(root: string): { hasLegacyTask: boolean; hasLegacyState: boolean; details: string[] } {
  const details: string[] = []
  const oldTaskDir = join(root, BOUNDARY_DIR, WORK_DIR, 'task')
  const hasLegacyTask = existsSync(oldTaskDir)
  if (hasLegacyTask) {
    details.push(`Legacy work.oxn found at ${oldTaskDir}/`)
  }
  return { hasLegacyTask, hasLegacyState: false, details }
}

function readTextFile(p: string): string | null {
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf-8')
}

function writeTextFile(p: string, content: string): void {
  const { dirname } = require('path') as typeof import('path')
  const dir = dirname(p)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmp = `${p}.tmp`
  writeFileSync(tmp, content, 'utf-8')
  renameSync(tmp, p)
}

function transformWorkOxnToV01(content: string): string {
  // 旧语法: work "name" ref "@xxx/blueprints/yyy" { ... }
  // 新语法: work "name" { use_blueprint "yyy"; ... }
  const refMatch = content.match(/work\s+"([^"]+)"\s+ref\s+"([^"]+)"\s*\{/)
  if (!refMatch) return content // 不是旧语法，原样返回

  const newHeader = `work "${refMatch[1]}" {`
  let body = content.replace(/work\s+"[^"]+"\s+ref\s+"[^"]+"\s*\{/, newHeader)

  // 把 ref 解析成 use_blueprint
  const bpMatch = refMatch[2]!.match(/(?:@[^/]+\/)?(?:blueprints\/)?(.+)/)
  if (bpMatch) {
    body = body.replace(/(\s*context\s*\{)/, `\n  use_blueprint "${bpMatch[1]}";\n$1`)
  }

  // 把 part "X" align "Y" { ... } 转成 task "X" align "Blueprint.Y" { deps = [] }
  // 简化处理：仅在 work 块顶层、且无嵌套 part 关键字时
  // 复杂场景留给用户手动修复
  body = body.replace(/part\s+"([^"]+)"\s+align\s+"([^"]+)"\s*\{/g, (_m, name, align) => {
    return `task "${name}" align "${bpMatch?.[1] ?? '?'}.${align}" {\n    deps = []`
  })

  return body
}

function transformTaskOxnToV01(content: string): string {
  // 旧语法: task "name" use "@xxx/blueprints/yyy" { ... } 或 task "name" { ... }
  // 新语法: task "name" blueprint "yyy" { ... }
  return content.replace(/task\s+"([^"]+)"\s+use\s+"@[^/]+\/blueprints\/([^"]+)"\s*\{/g, 'task "$1" blueprint "$2" {')
}

const migrateSubcommand = defineCommand({
  meta: {
    name: 'migrate',
    description: 'v0.1 硬迁移：把旧 work.oxn 转新格式，state.json 拆双层',
  },
  args: {
    'dry-run': { type: 'boolean', description: '只检测不实际修改' },
    'work-name': { type: 'string', description: '只迁移指定 work（不传则扫所有）' },
    force: { type: 'boolean', alias: 'f', description: '覆盖已存在文件' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const dryRun = ctx.args['dry-run'] === true
    const workNameArg = ctx.args['work-name'] as string | undefined
    const force = ctx.args.force === true || ctx.args.f === true
    const root = getProjectRoot()

    const detected = detectLegacyLayout(root)

    if (!detected.hasLegacyTask && !workNameArg) {
      return output(
        {
          ok: true,
          data: { migrated: [], detected: detected.details },
          human: 'No legacy layout detected. v0.1 migration not needed.',
        },
        format,
      )
    }

    const actions: Array<{ work: string; action: string; status: 'pending' | 'done' | 'skipped' | 'error' }> = []

    // 1. 迁移旧 task.oxn (work/task/<name>.oxn → works/<name>/work.oxn)
    const oldTaskDir = join(root, BOUNDARY_DIR, WORK_DIR, 'task')
    if (existsSync(oldTaskDir)) {
      const { readdirSync } = require('fs') as typeof import('fs')
      const files = readdirSync(oldTaskDir).filter((f) => f.endsWith('.oxn'))
      for (const f of files) {
        const workName = f.replace(/\.oxn$/, '')
        if (workNameArg && workNameArg !== workName) continue

        const oldPath = join(oldTaskDir, f)
        const newPath = join(root, BOUNDARY_DIR, 'works', workName, 'work.oxn')
        if (existsSync(newPath) && !force) {
          actions.push({ work: workName, action: 'migrate work.oxn', status: 'skipped' })
          continue
        }
        const oldContent = readTextFile(oldPath)
        if (!oldContent) {
          actions.push({ work: workName, action: 'read work.oxn', status: 'error' })
          continue
        }
        const newContent = transformWorkOxnToV01(oldContent)
        if (dryRun) {
          actions.push({ work: workName, action: 'migrate work.oxn (dry-run)', status: 'pending' })
        } else {
          try {
            writeTextFile(newPath, newContent)
            actions.push({ work: workName, action: 'migrate work.oxn', status: 'done' })
          } catch (err) {
            actions.push({ work: workName, action: `migrate work.oxn (${err})`, status: 'error' })
          }
        }
      }
    }

    // 2. 迁移旧 task.oxn (tasks/<id>/task.oxn → works/<work>/tasks/<task>/task.oxn)
    const oldTasksDir = join(root, BOUNDARY_DIR, 'tasks')
    if (existsSync(oldTasksDir)) {
      const { readdirSync } = require('fs') as typeof import('fs')
      const dirs = readdirSync(oldTasksDir)
      for (const taskId of dirs) {
        if (workNameArg && workNameArg !== taskId) continue

        const oldTaskFile = join(oldTasksDir, taskId, 'task.oxn')
        const oldStateFile = join(oldTasksDir, taskId, 'state.json')
        const oldTraceFile = join(oldTasksDir, taskId, 'task-trace.jsonl')

        // 推断新位置：把 <id> 当作 workName + taskName（v0.1 强迁移保守做法）
        const newDir = join(root, BOUNDARY_DIR, 'works', taskId, 'tasks', taskId)
        const newTaskFile = join(newDir, 'task.oxn')
        const newStateFile = join(newDir, 'state.json')
        const newTraceFile = join(newDir, 'work-trace.jsonl')

        if (existsSync(newTaskFile) && !force) {
          actions.push({ work: taskId, action: 'migrate task.oxn', status: 'skipped' })
          continue
        }

        const oldTaskContent = readTextFile(oldTaskFile)
        if (oldTaskContent) {
          const newContent = transformTaskOxnToV01(oldTaskContent)
          if (dryRun) {
            actions.push({ work: taskId, action: 'migrate task.oxn (dry-run)', status: 'pending' })
          } else {
            try {
              writeTextFile(newTaskFile, newContent)
              actions.push({ work: taskId, action: 'migrate task.oxn', status: 'done' })
            } catch (err) {
              actions.push({ work: taskId, action: `migrate task.oxn (${err})`, status: 'error' })
            }
          }
        }

        // 迁移 state.json
        const oldState = readTextFile(oldStateFile)
        if (oldState && !dryRun) {
          try {
            writeTextFile(newStateFile, oldState)
            actions.push({ work: taskId, action: 'migrate state.json', status: 'done' })
          } catch (err) {
            actions.push({ work: taskId, action: `migrate state.json (${err})`, status: 'error' })
          }
        }

        // 迁移 trace
        const oldTrace = readTextFile(oldTraceFile)
        if (oldTrace && !dryRun) {
          try {
            writeTextFile(newTraceFile, oldTrace)
            actions.push({ work: taskId, action: 'migrate task-trace.jsonl', status: 'done' })
          } catch (err) {
            actions.push({ work: taskId, action: `migrate trace (${err})`, status: 'error' })
          }
        }
      }
    }

    // 3. 检测旧 works/<name>/state.json 是单层 (有 partExecutions) → 拆双层
    const worksDir = join(root, BOUNDARY_DIR, 'works')
    if (existsSync(worksDir)) {
      const { readdirSync, statSync } = require('fs') as typeof import('fs')
      const workDirs = readdirSync(worksDir).filter((d) => statSync(join(worksDir, d)).isDirectory())
      for (const workName of workDirs) {
        if (workNameArg && workNameArg !== workName) continue
        const statePath = join(worksDir, workName, 'state.json')
        if (!existsSync(statePath)) continue
        try {
          const stateContent = readTextFile(statePath)
          if (!stateContent) continue
          const state = JSON.parse(stateContent)
          if (state.partExecutions || state.partSpecs) {
            // 旧单层 WorkState → 拆为 workspace + 单一 task
            if (dryRun) {
              actions.push({ work: workName, action: 'split state.json (dry-run)', status: 'pending' })
            } else {
              // 简化：把旧 partExecutions 移到 tasks/<work>/state.json
              const taskDir = join(worksDir, workName, 'tasks', workName)
              mkdirSync(taskDir, { recursive: true })
              const taskState = {
                workName: state.workName,
                taskName: workName,
                blueprint: state.skillContext?.blueprint ?? 'unknown',
                injects: [],
                status: state.status,
                currentPart: state.currentPart,
                completedParts: state.completedParts ?? [],
                loopMeta: state.loopMeta,
                partExecutions: state.partExecutions ?? [],
                skillContext: state.skillContext,
                createdAt: state.createdAt,
                updatedAt: new Date().toISOString(),
              }
              writeTextFile(join(taskDir, 'state.json'), JSON.stringify(taskState, null, 2))
              // 改写 workspace 级 state.json
              const wsState = {
                workName: state.workName,
                status: state.status,
                createdAt: state.createdAt,
                updatedAt: new Date().toISOString(),
                domains: [],
                blueprints: state.skillContext?.blueprint ? [state.skillContext.blueprint] : [],
                tasks: [
                  {
                    taskName: workName,
                    blueprint: state.skillContext?.blueprint ?? 'unknown',
                    injects: [],
                    status: state.status,
                  },
                ],
              }
              writeTextFile(statePath, JSON.stringify(wsState, null, 2))
              actions.push({ work: workName, action: 'split state.json → ws + task', status: 'done' })
            }
          }
        } catch {
          actions.push({ work: workName, action: 'parse state.json', status: 'error' })
        }
      }
    }

    output(
      {
        ok: true,
        data: { dryRun, actions },
        human: dryRun
          ? `[DRY-RUN] Detected ${actions.length} potential actions:\n${actions
              .map((a) => `  [${a.status}] ${a.work}: ${a.action}`)
              .join('\n')}`
          : `Migration completed. ${actions.filter((a) => a.status === 'done').length} actions done, ${actions.filter((a) => a.status === 'skipped').length} skipped, ${actions.filter((a) => a.status === 'error').length} errors.\n${actions
              .map((a) => `  [${a.status}] ${a.work}: ${a.action}`)
              .join('\n')}`,
      },
      format,
    )
  },
})

export default defineCommand({
  meta: {
    name: 'migrate',
    description: 'v0.1 硬迁移工具',
  },
  args: {
    'dry-run': { type: 'boolean', description: '只检测不实际修改' },
    'work-name': { type: 'string', description: '只迁移指定 work（不传则扫所有）' },
    force: { type: 'boolean', alias: 'f', description: '覆盖已存在文件' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    return (migrateSubcommand.run as (c: typeof ctx) => void | Promise<void>)(ctx)
  },
})
