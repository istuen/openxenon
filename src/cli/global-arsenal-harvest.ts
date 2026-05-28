import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { GLOBAL_BOUNDARY } from '../infra/paths'
import { getProjectBoundaryPath } from './project'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'arsenal-harvest',
    description: '从成功任务中提炼 Blueprint 到全局',
  },
  args: {
    'task-id': {
      type: 'positional',
      required: true,
      description: '任务 ID',
    },
    '--name': {
      type: 'string',
      description: 'Blueprint 名称（默认使用任务名称）',
    },
    '--type': {
      type: 'string',
      description: '资产类型：blueprint, stage, probe（默认 blueprint）',
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
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const taskId = ctx.args['task-id'] as string
    const name = ctx.args['--name'] as string | undefined
    const assetType = (ctx.args['--type'] as string) || 'blueprint'

    try {
      const projectRoot = getProjectBoundaryPath(process.cwd())
      const boundaryPath = join(projectRoot, '.openxenon')
      const taskDir = join(boundaryPath, 'tasks', taskId)
      const statePath = join(taskDir, 'state.json')
      const frozenPath = join(taskDir, 'blueprint.frozen.json')

      if (!existsSync(taskDir)) {
        return outputError(
          {
            code: 'OXN_TASK_NOT_FOUND',
            message: `Task not found: ${taskId}`,
          },
          format,
        )
      }

      if (!existsSync(statePath)) {
        return outputError(
          {
            code: 'OXN_STATE_NOT_FOUND',
            message: `Task state not found: ${taskId}`,
          },
          format,
        )
      }

      const stateContent = readFileSync(statePath, 'utf-8')
      const state = JSON.parse(stateContent)

      if (state.status !== 'COMPLETED') {
        return outputError(
          {
            code: 'OXN_TASK_NOT_COMPLETED',
            message: `Task "${taskId}" is not completed (status: ${state.status})`,
          },
          format,
        )
      }

      const hasFailures = Object.values(state.stages as Record<string, string>).some((s) => s === 'FAILED')
      if (hasFailures) {
        return outputError(
          {
            code: 'OXN_TASK_HAS_FAILURES',
            message: `Task "${taskId}" has failed stages. Cannot harvest.`,
          },
          format,
        )
      }

      if (!existsSync(frozenPath)) {
        return outputError(
          {
            code: 'OXN_FROZEN_NOT_FOUND',
            message: `Frozen blueprint not found for task: ${taskId}`,
          },
          format,
        )
      }

      const frozenContent = readFileSync(frozenPath, 'utf-8')
      const frozen = parseYaml(frozenContent)

      if (assetType === 'blueprint') {
        const blueprintName = name || state.taskName || taskId
        const assetDir = join(GLOBAL_BOUNDARY, 'forges', 'blueprints', blueprintName)

        mkdirSync(assetDir, { recursive: true })

        const canonicalBlueprint = {
          name: blueprintName,
          stages:
            frozen.stages?.map(
              (s: { id: string; name: string; target?: any; action?: any; probes?: any; deps?: string[] }) => ({
                id: s.id || s.name,
                name: s.name || s.id,
                target: s.target,
                action: s.action,
                probes: s.probes,
                deps: s.deps || [],
              }),
            ) || [],
        }

        const draftPath = join(assetDir, 'draft.yaml')
        writeFileSync(draftPath, stringifyYaml(canonicalBlueprint), 'utf-8')

        return output(
          {
            data: {
              name: blueprintName,
              type: 'blueprint',
              path: draftPath,
              taskId: taskId,
            },
            human: `Blueprint harvested from task "${taskId}" to global!\n  Name: ${blueprintName}\n  Path: ${draftPath}\n\nReview draft and promote with:\n  oxn global arsenal promote blueprints/${blueprintName}`,
          },
          format,
        )
      }

      return outputError(
        {
          code: 'OXN_UNSUPPORTED_TYPE',
          message: `Unsupported asset type: ${assetType}. Currently only 'blueprint' is supported.`,
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError(
        {
          code: 'OXN_HARVEST_ERROR',
          message: errorMsg,
        },
        format,
      )
    }
  },
})
