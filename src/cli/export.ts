import { defineCommand } from 'citty'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { output, outputError, getFormatFromArgs } from './output'

export default defineCommand({
  meta: {
    name: 'export',
    description: '导出任务的 task-trace.yaml'
  },
  args: {
    taskId: {
      type: 'positional',
      description: '任务 ID',
      required: true
    },
    output: {
      alias: 'o',
      type: 'string',
      description: '输出路径（默认输出到 stdout）',
      required: false
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
    const taskId = ctx.args.taskId as string
    const outputPath = ctx.args.output as string | undefined

    const tracePath = resolve(process.cwd(), '.openxenon', 'tasks', taskId, 'task-trace.yaml')

    if (!existsSync(tracePath)) {
      return outputError({
        code: 'OXN_TASK_NOT_FOUND',
        message: `任务不存在: ${taskId}`
      }, format)
    }

    try {
      const content = readFileSync(tracePath, 'utf-8')

      if (outputPath) {
        const fullOutputPath = resolve(process.cwd(), outputPath)
        require('fs').writeFileSync(fullOutputPath, content, 'utf-8')
        return output({
          data: { path: fullOutputPath },
          human: `已导出任务轨迹到: ${fullOutputPath}`
        }, format)
      }

      return output({
        data: { trace: content },
        human: content
      }, format)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError({
        code: 'OXN_EXPORT_FAILED',
        message: errorMsg
      }, format)
    }
  }
})