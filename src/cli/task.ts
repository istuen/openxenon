import { defineCommand } from 'citty'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { taskSubmit, taskNext, taskVerify, taskStatus, type SubmitResult, type NextResult, type VerifyResult, type StatusResult } from './task-filesystem'
import { BOUNDARY_DIR, TASKS_DIR, TASK_TRACE_FILE } from '../kernel/constants'
import { join } from 'path'
import { taskTraceToHtml } from './render/task-trace-renderer'

function getProjectRoot(): string {
  return process.cwd()
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
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
        description: '提交 Blueprint 创建任务'
      },
      args: {
        blueprint: {
          type: 'string',
          alias: 'b',
          required: true,
          description: 'Blueprint YAML 文件路径'
        },
        name: {
          type: 'string',
          alias: 'n',
          required: false,
          description: 'Task 名称（kebab-case），默认从 Blueprint name 字段读取'
        }
      },
      run(ctx) {
        try {
          if (!projectBoundaryExists()) {
            console.log(JSON.stringify({
              ok: false,
              error: {
                code: 'OXN_NO_PROJECT',
                message: '项目未初始化，请先执行 oxn init',
                suggestion: '在项目根目录执行 oxn init'
              }
            }))
            return
          }

          const blueprintPath = ctx.args.blueprint as string
          const name = ctx.args.name as string | undefined
          const result = taskSubmit(blueprintPath, getProjectRoot(), name) as SubmitResult

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as Error
          console.log(JSON.stringify({
            ok: false,
            error: {
              code: 'OXN_TASK_SUBMIT_FAILED',
              message: error.message || String(err)
            }
          }))
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
        }
      },
      run(ctx) {
        try {
          if (!projectBoundaryExists()) {
            console.log(JSON.stringify({
              ok: false,
              error: {
                code: 'OXN_NO_PROJECT',
                message: '项目未初始化，请先执行 oxn init',
                suggestion: '在项目根目录执行 oxn init'
              }
            }))
            return
          }

          const taskId = ctx.args['task-id'] as string
          const result = taskNext(taskId, getProjectRoot()) as NextResult

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as Error
          console.log(JSON.stringify({
            ok: false,
            error: {
              code: 'OXN_TASK_NEXT_FAILED',
              message: error.message || String(err)
            }
          }))
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
        'stage-id': {
          type: 'string',
          alias: 's',
          required: true,
          description: 'Stage ID'
        }
      },
      async run(ctx) {
        try {
          if (!projectBoundaryExists()) {
            console.log(JSON.stringify({
              ok: false,
              error: {
                code: 'OXN_NO_PROJECT',
                message: '项目未初始化，请先执行 oxn init',
                suggestion: '在项目根目录执行 oxn init'
              }
            }))
            return
          }

          const taskId = ctx.args['task-id'] as string
          const stageId = ctx.args['stage-id'] as string
          const result = await taskVerify(taskId, stageId, getProjectRoot()) as VerifyResult

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as Error
          console.log(JSON.stringify({
            ok: false,
            error: {
              code: 'OXN_STEP_VERIFY_FAILED',
              message: error.message || String(err)
            }
          }))
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
        }
      },
      run(ctx) {
        try {
          if (!projectBoundaryExists()) {
            console.log(JSON.stringify({
              ok: false,
              error: {
                code: 'OXN_NO_PROJECT',
                message: '项目未初始化，请先执行 oxn init',
                suggestion: '在项目根目录执行 oxn init'
              }
            }))
            return
          }

          const taskId = ctx.args['task-id'] as string
          const result = taskStatus(taskId, getProjectRoot()) as StatusResult

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as Error
          console.log(JSON.stringify({
            ok: false,
            error: {
              code: 'OXN_TASK_STATUS_FAILED',
              message: error.message || String(err)
            }
          }))
        }
      }
    }),
    render: defineCommand({
      meta: {
        name: 'render',
        description: '将 task-trace.yaml 渲染为 HTML 报告'
      },
      args: {
        'task-id': {
          type: 'string',
          alias: 't',
          required: true,
          description: '任务 ID'
        },
        'format': {
          type: 'string',
          required: false,
          default: 'html',
          description: '输出格式（仅支持 html）'
        }
      },
      run(ctx) {
        try {
          if (!projectBoundaryExists()) {
            console.error('错误: 项目未初始化，请先执行 oxn init')
            return
          }

          const taskId = ctx.args['task-id'] as string
          const cwd = getProjectRoot()
          const tracePath = join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId, TASK_TRACE_FILE)

          if (!existsSync(tracePath)) {
            console.error(`错误: 任务不存在: ${taskId}`)
            return
          }

          const traceContent = readFileSync(tracePath, 'utf-8')
          const html = taskTraceToHtml({ taskId, traceContent })

          const htmlPath = join(cwd, BOUNDARY_DIR, TASKS_DIR, taskId, `report-${Date.now()}.html`)
          writeFileSync(htmlPath, html, 'utf-8')

          console.log(`HTML 报告已生成: ${htmlPath}`)
          console.log('正在打开浏览器...')

          const { exec } = require('child_process')
          exec(`open "${htmlPath}"`, (err: Error | null) => {
            if (err) {
              console.error('警告: 无法自动打开浏览器，请手动打开报告文件')
            }
          })
        } catch (err: unknown) {
          const error = err as Error
          console.error(`错误: ${error.message || String(err)}`)
        }
      }
    })
  },
  run() {
    console.log('使用 oxn task <subcommand> 查看可用子命令')
    console.log('子命令: submit, next, verify, status, render')
  }
})