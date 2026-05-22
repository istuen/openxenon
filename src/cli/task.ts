import { defineCommand } from 'citty'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { taskSubmit, taskNext, taskVerify, taskStatus, taskNew, type SubmitResult, type NextResult, type VerifyResult, type StatusResult, type NewResult, type TaskState } from './task-filesystem'
import { BOUNDARY_DIR, TASKS_DIR, TASK_TRACE_FILE } from '../kernel/constants'
import { join } from 'path'
import { taskTraceToHtml } from './render/task-trace-renderer'
import { output, outputError, getFormatFromArgs } from './output'

const EXPLORES_DIR = 'explores'
const TASK_MD_FILE = 'task.md'

function getProjectRoot(): string {
  return process.cwd()
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
}

function taskDirExists(cwd: string, name: string): boolean {
  return existsSync(join(cwd, BOUNDARY_DIR, TASKS_DIR, name))
}

function getTaskDir(cwd: string, taskId: string): string {
  return join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId)
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function writeState(cwd: string, taskId: string, state: TaskState): void {
  const path = join(getTaskDir(cwd, taskId), 'state.json')
  ensureDirectory(getTaskDir(cwd, taskId))
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8')
}

function validateTaskName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Name is required' }
  if (name.length < 2) return { valid: false, error: 'Name too short (min 2 chars)' }
  if (name.length > 64) return { valid: false, error: 'Name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: 'Name must be kebab-case (lowercase letter, lowercase letters/numbers, hyphens)' }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Name cannot end with hyphen' }
  return { valid: true }
}

export default defineCommand({
  meta: {
    name: 'task',
    description: '任务管理命令'
  },
  subCommands: {
    submit: defineCommand({
      meta: {
        name: 'submit',
        description: '提交 Blueprint 到任务'
      },
      args: {
        blueprint: {
          type: 'string',
          alias: 'b',
          required: true,
          description: 'Blueprint 文件路径 (.yaml / .oxn)'
        },
        name: {
          type: 'string',
          alias: 'n',
          required: false,
          description: 'Task 名称（kebab-case），默认从 Blueprint name 字段读取'
        },
        'task-id': {
          type: 'string',
          alias: 't',
          required: false,
          description: '指定已有 Task ID，将 Blueprint 提交到该任务'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        },
        param: {
          type: 'string',
          alias: 'p',
          required: false,
          description: '参数注入 (key=value 格式，可多次指定)'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init',
            suggestion: '在项目根目录执行 oxn init'
          }, format)
        }

        try {
          const blueprintPath = ctx.args.blueprint as string
          const name = ctx.args.name as string | undefined
          const taskId = ctx.args['task-id'] as string | undefined
          const rawParams = ctx.args.param as string | undefined
          const params: Record<string, unknown> = {}
          if (rawParams) {
            const pairs = rawParams.split(',').map(p => p.trim())
            for (const pair of pairs) {
              const eqIndex = pair.indexOf('=')
              if (eqIndex > 0) {
                const key = pair.slice(0, eqIndex).trim()
                const val = pair.slice(eqIndex + 1).trim()
                params[key] = val
              }
            }
          }
          const result = taskSubmit(blueprintPath, getProjectRoot(), name, taskId, params) as SubmitResult

          output({ data: result }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_TASK_SUBMIT_FAILED',
            message: errorMsg
          }, format)
        }
      }
    }),
    new: defineCommand({
      meta: {
        name: 'new',
        description: '创建新任务'
      },
      args: {
        'task-id': {
          type: 'string',
          alias: 't',
          required: true,
          description: '任务 ID（kebab-case）'
        },
        'task-name': {
          type: 'string',
          alias: 'n',
          required: false,
          description: '任务显示名称（可选，默认与 task-id 相同）'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init',
            suggestion: '在项目根目录执行 oxn init'
          }, format)
        }

        try {
          const taskId = ctx.args['task-id'] as string
          const taskName = ctx.args['task-name'] as string | undefined
          const result = taskNew(taskId, taskName || taskId, getProjectRoot()) as NewResult

          output({ data: result }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_TASK_NEW_FAILED',
            message: errorMsg
          }, format)
        }
      }
    }),
    next: defineCommand({
      meta: {
        name: 'next',
        description: '获取当前 Task 下一个待执行 Stage'
      },
      args: {
        'task-id': {
          type: 'string',
          alias: 't',
          required: true,
          description: '任务 ID'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init',
            suggestion: '在项目根目录执行 oxn init'
          }, format)
        }

        try {
          const taskId = ctx.args['task-id'] as string
          const result = taskNext(taskId, getProjectRoot()) as NextResult

          output({ data: result }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_TASK_NEXT_FAILED',
            message: errorMsg
          }, format)
        }
      }
    }),
    verify: defineCommand({
      meta: {
        name: 'verify',
        description: '提交 Stage 验证'
      },
      args: {
        'task-id': {
          type: 'string',
          alias: 't',
          required: true,
          description: '任务 ID'
        },
        'part-id': {
          type: 'string',
          alias: 'p',
          required: true,
          description: 'Part ID'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init',
            suggestion: '在项目根目录执行 oxn init'
          }, format)
        }

        try {
          const taskId = ctx.args['task-id'] as string
          const partId = ctx.args['part-id'] as string
          const result = await taskVerify(taskId, partId, getProjectRoot()) as VerifyResult

          output({ data: result }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_STEP_VERIFY_FAILED',
            message: errorMsg
          }, format)
        }
      }
    }),
    status: defineCommand({
      meta: {
        name: 'status',
        description: '获取任务状态'
      },
      args: {
        'task-id': {
          type: 'string',
          alias: 't',
          required: true,
          description: '任务 ID'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init',
            suggestion: '在项目根目录执行 oxn init'
          }, format)
        }

        try {
          const taskId = ctx.args['task-id'] as string
          const result = taskStatus(taskId, getProjectRoot()) as StatusResult

          output({ data: result }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_TASK_STATUS_FAILED',
            message: errorMsg
          }, format)
        }
      }
    }),
    render: defineCommand({
      meta: {
        name: 'render',
        description: '将 task-trace.jsonl 渲染为 HTML 报告'
      },
      args: {
        'task-id': {
          type: 'string',
          alias: 't',
          required: true,
          description: '任务 ID'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init',
            suggestion: '在项目根目录执行 oxn init'
          }, format)
        }

        try {
          const taskId = ctx.args['task-id'] as string
          const cwd = getProjectRoot()
          const tracePath = join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId, TASK_TRACE_FILE)

          if (!existsSync(tracePath)) {
            return outputError({
              code: 'OXN_TASK_NOT_FOUND',
              message: `任务不存在: ${taskId}`
            }, format)
          }

          const traceContent = readFileSync(tracePath, 'utf-8')
          const html = taskTraceToHtml({ taskId, traceContent })

          const htmlPath = join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId, `report-${Date.now()}.html`)
          writeFileSync(htmlPath, html, 'utf-8')

          output({
            data: { path: htmlPath },
            human: `HTML 报告已生成: ${htmlPath}`
          }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_TASK_RENDER_FAILED',
            message: errorMsg
          }, format)
        }
      }
    }),
    'explore-new': defineCommand({
      meta: {
        name: 'explore-new',
        description: '从 Explore 报告创建任务'
      },
      args: {
        'explore-and-task': {
          type: 'string',
          required: true,
          description: 'Explore 名称和任务名，格式: <explore-name>/<task-name>'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const cwd = getProjectRoot()

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init'
          }, format)
        }

        const input = ctx.args['explore-and-task'] as string
        const parts = input.split('/')

        if (parts.length !== 2) {
          return outputError({
            code: 'OXN_INVALID_FORMAT',
            message: '格式错误，使用: oxn task explore-new <explore-name>/<task-name>'
          }, format)
        }

        const [exploreName, taskName] = parts

        const exploreReportPath = join(cwd, BOUNDARY_DIR, EXPLORES_DIR, exploreName, 'report.md')
        if (!existsSync(exploreReportPath)) {
          return outputError({
            code: 'OXN_EXPLORE_NOT_FOUND',
            message: `Explore 未找到: ${exploreName}，或报告未生成`
          }, format)
        }

        const validation = validateTaskName(taskName)
        if (!validation.valid) {
          return outputError({
            code: 'OXN_INVALID_TASK_NAME',
            message: `任务名无效: ${validation.error}`
          }, format)
        }

        if (taskDirExists(cwd, taskName)) {
          return outputError({
            code: 'OXN_TASK_EXISTS',
            message: `任务已存在: ${taskName}`
          }, format)
        }

        try {
          const reportContent = readFileSync(exploreReportPath, 'utf-8')

          const taskDir = getTaskDir(cwd, taskName)
          ensureDirectory(taskDir)

          const taskMdPath = join(taskDir, TASK_MD_FILE)
          writeFileSync(taskMdPath, reportContent, 'utf-8')

          const state: TaskState = {
            taskId: taskName,
            taskName: taskName,
            status: 'PENDING',
            currentStage: null,
            stages: {}
          }
          writeState(cwd, taskName, state)

          output({
            data: {
              taskId: taskName,
              taskName: taskName,
              fromExplore: exploreName,
              taskMdPath: taskMdPath
            },
            human: `任务已创建: ${taskName}\n来源: ${exploreName}\n任务描述: ${taskMdPath}\n\n请使用 oxn task submit --blueprint <path> --task-id ${taskName} 提交 Blueprint。`
          }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_TASK_EXPLORE_NEW_FAILED',
            message: errorMsg
          }, format)
        }
      }
    }),
    list: defineCommand({
      meta: {
        name: 'list',
        description: '列出所有任务'
      },
      args: {
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)
        const cwd = getProjectRoot()

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init'
          }, format)
        }

        const tasksDir = join(cwd, BOUNDARY_DIR, TASKS_DIR)
        if (!existsSync(tasksDir)) {
          output({
            data: { tasks: [] },
            human: '暂无任务'
          }, format)
          return
        }

        const entries = readFileSync(tasksDir, 'utf-8')
        const dirs = (entries as unknown as string[]).filter(d =>
          existsSync(join(tasksDir, d, 'state.json'))
        ) as string[]

        const tasks = dirs.map(dir => {
          const statePath = join(tasksDir, dir, 'state.json')
          const state = JSON.parse(readFileSync(statePath, 'utf-8')) as TaskState
          return {
            taskId: state.taskId,
            taskName: state.taskName,
            status: state.status,
            currentStage: state.currentStage
          }
        })

        if (tasks.length === 0) {
          output({ data: { tasks: [] }, human: '暂无任务' }, format)
          return
        }

        const human = tasks.map(t =>
          `[${t.status}] ${t.taskId} (${t.taskName})${t.currentStage ? ` - 当前: ${t.currentStage}` : ''}`
        ).join('\n')

        output({
          data: { tasks },
          human
        }, format)
      }
    }),
    resume: defineCommand({
      meta: {
        name: 'resume',
        description: '继续执行任务（获取下一个 Stage 并展示指令）'
      },
      args: {
        'task-id': {
          type: 'string',
          alias: 't',
          required: true,
          description: '任务 ID'
        },
        '--json': {
          type: 'boolean',
          description: 'JSON 格式输出'
        },
        '--yaml': {
          type: 'boolean',
          description: 'YAML 格式输出'
        }
      },
      run(ctx) {
        const format = getFormatFromArgs(ctx.args)

        if (!projectBoundaryExists()) {
          return outputError({
            code: 'OXN_NO_PROJECT',
            message: '项目未初始化，请先执行 oxn init'
          }, format)
        }

        try {
          const taskId = ctx.args['task-id'] as string
          const result = taskNext(taskId, getProjectRoot()) as NextResult

          if (result.status === 'COMPLETED') {
            output({
              data: result,
              human: `任务已完成: ${taskId}\n所有 Stage 已通过验证。`
            }, format)
            return
          }

          const partInfo = result.partId
            ? `Part: ${result.name || result.partId}\n目标: ${result.target?.description || 'N/A'}\n指令: ${result.action?.instruction || 'N/A'}`
            : '无可执行的 Part'

          output({
            data: result,
            human: `任务: ${taskId}\n${partInfo}\n\n完成后执行: oxn task verify --task-id ${taskId} --part-id ${result.partId}`
          }, format)
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          outputError({
            code: 'OXN_TASK_RESUME_FAILED',
            message: errorMsg
          }, format)
        }
      }
    })
  },
  run() {
    console.log('使用 oxn task <subcommand> 查看可用子命令')
    console.log('子命令: new, submit, next, verify, status, render, explore-new, list, resume')
  }
})