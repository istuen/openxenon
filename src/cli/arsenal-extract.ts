import { defineCommand } from 'citty'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getProjectBoundaryPath } from '../kernel'
import { TASKS_DIR } from '../kernel/constants'
import { output, outputError, getFormatFromArgs } from './output'
import * as yaml from 'yaml'

export default defineCommand({
  meta: {
    name: 'arsenal-extract',
    description: '从 Task 的 frozen.json 提取历史版本 Part',
  },
  args: {
    '--from-task': {
      type: 'string',
      alias: 't',
      required: true,
      description: 'Task ID',
    },
    '--part': {
      type: 'string',
      alias: 'p',
      required: true,
      description: 'Part 名称',
    },
    '--output': {
      type: 'string',
      alias: 'o',
      description: '输出文件路径',
    },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const taskId = ctx.args['from-task'] as string
    const partName = ctx.args['part'] as string
    const outputPath = (ctx.args['output'] as string) || `${partName}-extracted.yaml`

    const projectBoundary = getProjectBoundaryPath(process.cwd())
    const frozenPath = join(projectBoundary, TASKS_DIR, taskId, 'blueprint.frozen.json')

    if (!existsSync(frozenPath)) {
      return outputError(
        {
          code: 'OXN_NOT_FOUND',
          message: `Task frozen not found: ${frozenPath}`,
        },
        format,
      )
    }

    try {
      const content = readFileSync(frozenPath, 'utf-8')
      const frozen = yaml.parse(content) as Record<string, unknown>
      const parts = frozen.parts as Array<Record<string, unknown>> | undefined

      if (!parts) {
        return outputError(
          {
            code: 'OXN_EXTRACT_FAILED',
            message: 'Frozen blueprint has no parts',
          },
          format,
        )
      }

      const part = parts.find((p) => p.id === partName || p.name === partName)
      if (!part) {
        return outputError(
          {
            code: 'OXN_PART_NOT_FOUND',
            message: `Part not found in frozen: ${partName}`,
          },
          format,
        )
      }

      const extracted = {
        id: part.id,
        name: part.name,
        _version: part._version || 1,
        _extracted_from: taskId,
        target: part.target,
        spec: part.spec,
        action: part.action,
        probes: ((part.probes as Array<Record<string, unknown>>) || []).map((p: Record<string, unknown>) => ({
          type: p.type,
          params: p.params,
        })),
      }

      writeFileSync(outputPath, yaml.stringify(extracted), 'utf-8')

      output(
        {
          data: { part: partName, task: taskId, output: outputPath },
          human: `Extracted part "${partName}" from task "${taskId}"\n  Output: ${outputPath}`,
        },
        format,
      )
    } catch (err) {
      return outputError(
        {
          code: 'OXN_EXTRACT_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
        format,
      )
    }
  },
})
