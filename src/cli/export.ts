import { defineCommand } from 'citty'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'

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
    }
  },
  async run(ctx) {
    const taskId = ctx.args.taskId as string
    const outputPath = ctx.args.output as string | undefined

    const tracePath = resolve(process.cwd(), '.openxenon', 'tasks', taskId, 'task-trace.yaml')

    if (!existsSync(tracePath)) {
      console.error(`错误: 任务不存在: ${taskId}`)
      process.exit(1)
    }

    const content = readFileSync(tracePath, 'utf-8')

    if (outputPath) {
      const fullOutputPath = resolve(process.cwd(), outputPath)
      require('fs').writeFileSync(fullOutputPath, content, 'utf-8')
      console.log(`已导出任务轨迹到: ${fullOutputPath}`)
    } else {
      console.log(content)
    }
  }
})
