import { defineCommand } from 'citty'
import { existsSync, readFileSync, writeFileSync } from 'fs'
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
  completedAt?: string
}

export default defineCommand({
  meta: {
    name: 'complete',
    description: '标记 Work 完成',
  },
  args: {
    'work-id': {
      type: 'string',
      alias: 'w',
      required: true,
      description: 'Work ID',
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

    const workFilePath = getWorkFilePath(cwd, workId, 'task')
    if (!existsSync(workFilePath)) {
      return outputError(
        {
          code: 'OXN_WORK_NOT_FOUND',
          message: `Work not found: ${workId}`,
        },
        format,
      )
    }

    const stateFilePath = getStateFilePath(cwd, workId, 'task')
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
        type: 'task',
        status: 'PENDING',
        parts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    if (state.status === 'completed') {
      return output(
        {
          data: { workId, status: 'already_completed' },
          human: `Work ${workId} 已处于 completed 状态`,
        },
        format,
      )
    }

    state.status = 'completed'
    state.completedAt = new Date().toISOString()
    state.updatedAt = new Date().toISOString()

    try {
      writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf-8')
    } catch {
      return outputError(
        {
          code: 'OXN_STATE_WRITE_FAILED',
          message: 'Failed to write state file',
        },
        format,
      )
    }

    output(
      {
        data: { workId, status: 'completed', completedAt: state.completedAt },
        human: `Work ${workId} 已完成`,
      },
      format,
    )
  },
})
