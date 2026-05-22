import { defineCommand } from 'citty'
import { promoteBlueprint } from './oxn-promote'
import { output, outputError, getFormatFromArgs } from './output'

export default defineCommand({
  meta: {
    name: 'promote',
    description: '将沙箱 Blueprint 提升至全局 Arsenal (同名覆盖进化 / --as-new 涌现) [Runtime]',
  },
  args: {
    taskDir: {
      type: 'positional',
      required: true,
      description: 'Task 沙箱目录路径',
    },
    'as-new': {
      type: 'string',
      alias: 'n',
      description: 'Fork 新名称（涌现模式，不覆盖原资产）',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: '强制覆盖已有资产',
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const taskDir = ctx.args.taskDir as string
    const asNew = ctx.args['as-new'] as string | undefined
    const force = ctx.args.force as boolean
    const projectRoot = process.cwd()

    try {
      const result = promoteBlueprint(taskDir, projectRoot, {
        asNew,
        force: force || Boolean(asNew),
      })

      return output(
        {
          data: result,
          human: `Promote 成功:
  来源: ${result.sourcePath}
  目标: ${result.destPath}
  版本: ${result.version}
  模式: ${result.emergent ? `涌现 (${asNew})` : '同名覆盖'}`,
        },
        format,
      )
    } catch (err) {
      return outputError(
        {
          code: 'OXN_PROMOTE_FAILED',
          message: err instanceof Error ? err.message : '提升失败',
        },
        format,
      )
    }
  },
})
