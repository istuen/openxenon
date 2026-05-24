import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR, WORK_DIR } from '../kernel/constants'
import { getFormatFromArgs, output, outputError } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
}

function getWorkFilePath(cwd: string, workId: string, type: string): string {
  return join(cwd, BOUNDARY_DIR, WORK_DIR, type, `${workId}.oxn`)
}

function getStateFilePath(cwd: string, workId: string, type: string): string {
  return join(cwd, BOUNDARY_DIR, WORK_DIR, type, `${workId}-state.json`)
}

interface WorkState {
  workId: string
  type: string
  status: string
  parts: Array<{
    name: string
    status: 'pending' | 'in_progress' | 'completed'
    startedAt?: string
    completedAt?: string
  }>
  createdAt: string
  updatedAt: string
}

export default defineCommand({
  meta: {
    name: 'resume',
    description: '恢复 Work 执行',
  },
  args: {
    'work-id': {
      type: 'string',
      alias: 'w',
      required: true,
      description: 'Work ID',
    },
    '--type': {
      type: 'string',
      alias: 't',
      description: 'Work 类型 (task/plan/flow/explore/fix)',
      default: 'task',
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const cwd = getProjectRoot()
    const workId = ctx.args['work-id'] as string
    const workType = (ctx.args['--type'] as string) || 'task'

    if (!projectBoundaryExists()) {
      return outputError(
        {
          code: 'OXN_NO_PROJECT',
          message: '项目未初始化，请先执行 oxn init',
          suggestion: '在项目根目录执行 oxn init',
        },
        format,
      )
    }

    const workFilePath = getWorkFilePath(cwd, workId, workType)
    if (!existsSync(workFilePath)) {
      return outputError(
        {
          code: 'OXN_WORK_NOT_FOUND',
          message: `Work not found: ${workId}`,
        },
        format,
      )
    }

    const stateFilePath = getStateFilePath(cwd, workId, workType)
    let state: WorkState

    if (existsSync(stateFilePath)) {
      try {
        const stateContent = readFileSync(stateFilePath, 'utf-8')
        state = JSON.parse(stateContent)
      } catch {
        return outputError(
          {
            code: 'OXN_STATE_READ_FAILED',
            message: 'Failed to read state file',
          },
          format,
        )
      }
    } else {
      state = {
        workId,
        type: workType,
        status: 'PENDING',
        parts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    if (state.status === 'completed') {
      return output(
        {
          data: { workId, status: 'completed' },
          human: `Work ${workId} 已完成，请使用 work new 创建新的 Work`,
        },
        format,
      )
    }

    const nextPart = state.parts.find((p) => p.status !== 'completed')
    if (!nextPart) {
      return output(
        {
          data: { workId, status: 'all_parts_completed' },
          human: `所有 Part 已完成，可以使用 work complete 结束`,
        },
        format,
      )
    }

    output(
      {
        data: {
          workId,
          status: state.status,
          nextPart: {
            name: nextPart.name,
            status: nextPart.status,
          },
          instruction: `继续执行 part "${nextPart.name}"`,
        },
        human: `下一步: ${nextPart.name}\n状态: ${nextPart.status}\n\n使用 probe invoke 继续执行`,
      },
      format,
    )
  },
})
