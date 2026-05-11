import { defineCommand } from 'citty'
import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { sendToDaemon } from './socket-client'
import { isDaemonRunning } from '../daemon/process'
import { DAEMON_SOCK_PATH } from '../infra/global'
import { OxnErrorCode, ErrorCategory } from '../kernel/enums'

async function ensureDaemonRunning(): Promise<void> {
  const { isRunning } = isDaemonRunning()
  if (!isRunning) {
    throw {
      code: OxnErrorCode.SOCKET_REFUSED,
      message: 'Daemon 未运行',
      category: ErrorCategory.INFRA,
      recoverable: true,
      suggestion: `请先执行 oxn daemon start 启动 Daemon（socket: ${DAEMON_SOCK_PATH}）`
    }
  }
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
        }
      },
      async run(ctx) {
        try {
          await ensureDaemonRunning()

          const blueprintPath = ctx.args.blueprint as string
          const content = readFileSync(blueprintPath, 'utf-8')
          const parsed = parseYaml(content)

          const result = await sendToDaemon({
            method: 'POST',
            path: '/api/v1/task/submit',
            body: { task: parsed.name || 'unnamed', blueprint: parsed }
          }) as { taskId?: string; status?: string; error?: string; message?: string }

          if (result.error) {
            console.log(JSON.stringify({ ok: false, error: { code: 'OXN_TASK_SUBMIT_FAILED', message: result.message || result.error } }))
            return
          }

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as { code?: string; message?: string }
          if (error.code) {
            console.log(JSON.stringify({ ok: false, error }))
          } else {
            console.log(JSON.stringify({ ok: false, error: { code: OxnErrorCode.UNKNOWN, message: String(err) } }))
          }
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
      async run(ctx) {
        try {
          await ensureDaemonRunning()

          const taskId = ctx.args['task-id'] as string

          const result = await sendToDaemon({
            method: 'GET',
            path: `/api/v1/task/next?taskId=${encodeURIComponent(taskId)}`
          }) as { stageId?: string; status?: string; error?: string; message?: string }

          if (result.error) {
            console.log(JSON.stringify({ ok: false, error: { code: 'OXN_TASK_NEXT_FAILED', message: result.message || result.error } }))
            return
          }

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as { code?: string; message?: string }
          if (error.code) {
            console.log(JSON.stringify({ ok: false, error }))
          } else {
            console.log(JSON.stringify({ ok: false, error: { code: OxnErrorCode.UNKNOWN, message: String(err) } }))
          }
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
          await ensureDaemonRunning()

          const taskId = ctx.args['task-id'] as string
          const stageId = ctx.args['stage-id'] as string

          const result = await sendToDaemon({
            method: 'POST',
            path: '/api/v1/step/verify',
            body: { taskId, stageId }
          }) as { passed?: boolean; verdict?: string; error?: string; message?: string }

          if (result.error) {
            console.log(JSON.stringify({ ok: false, error: { code: 'OXN_STEP_VERIFY_FAILED', message: result.message || result.error } }))
            return
          }

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as { code?: string; message?: string }
          if (error.code) {
            console.log(JSON.stringify({ ok: false, error }))
          } else {
            console.log(JSON.stringify({ ok: false, error: { code: OxnErrorCode.UNKNOWN, message: String(err) } }))
          }
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
      async run(ctx) {
        try {
          await ensureDaemonRunning()

          const taskId = ctx.args['task-id'] as string

          const result = await sendToDaemon({
            method: 'GET',
            path: `/api/v1/task/status?taskId=${encodeURIComponent(taskId)}`
          }) as { status?: string; error?: string; message?: string }

          if (result.error) {
            console.log(JSON.stringify({ ok: false, error: { code: 'OXN_TASK_STATUS_FAILED', message: result.message || result.error } }))
            return
          }

          console.log(JSON.stringify({ ok: true, data: result }))
        } catch (err: unknown) {
          const error = err as { code?: string; message?: string }
          if (error.code) {
            console.log(JSON.stringify({ ok: false, error }))
          } else {
            console.log(JSON.stringify({ ok: false, error: { code: OxnErrorCode.UNKNOWN, message: String(err) } }))
          }
        }
      }
    })
  },
  async run() {
    console.log('使用 oxn task <subcommand> 查看可用子命令')
    console.log('子命令: submit, next, verify, status')
  }
})