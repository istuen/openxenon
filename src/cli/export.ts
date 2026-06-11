import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { t } from '../infra/i18n'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'export',
    description: t('export.description'),
  },
  args: {
    taskId: {
      type: 'positional',
      description: t('export.taskId'),
      required: true,
    },
    output: {
      alias: 'o',
      type: 'string',
      description: t('export.output'),
      required: false,
    },
    '--json': {
      type: 'boolean',
      description: t('format.json'),
    },
    '--yaml': {
      type: 'boolean',
      description: t('format.yaml'),
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const taskId = ctx.args.taskId as string
    const outputPath = ctx.args.output as string | undefined

    const tracePath = resolve(process.cwd(), '.openxenon', 'tasks', taskId, 'task-trace.jsonl')

    if (!existsSync(tracePath)) {
      return outputError(
        {
          code: 'OXN_TASK_NOT_FOUND',
          message: t('export.notFound', { taskId }),
        },
        format,
      )
    }

    try {
      const content = readFileSync(tracePath, 'utf-8')

      if (outputPath) {
        const fullOutputPath = resolve(process.cwd(), outputPath)
        require('fs').writeFileSync(fullOutputPath, content, 'utf-8')
        return output(
          {
            data: { path: fullOutputPath },
            human: t('export.exported', { path: fullOutputPath }),
          },
          format,
        )
      }

      return output(
        {
          data: { trace: content },
          human: content,
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError(
        {
          code: 'OXN_EXPORT_FAILED',
          message: errorMsg,
        },
        format,
      )
    }
  },
})
