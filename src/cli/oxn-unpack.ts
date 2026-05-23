import { defineCommand } from 'citty'
import { unpackBundle } from '../oxn-dsl/unpacker/bundle-unpacker'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'unpack',
    description: '解包 .bundle.oxn 到隔离目录（安全模式，默认不覆盖）',
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: '.bundle.oxn 文件路径',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出目录（默认为 bundle 同目录下的 <name>-unpacked）',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: '强制覆盖已有文件',
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const path = ctx.args.path as string
    const outputDir = ctx.args.output as string | undefined
    const force = ctx.args.force as boolean

    try {
      const result = unpackBundle(path, { outputDir, force })
      return output(
        {
          data: result,
          human: `解包完成:
  目标目录: ${result.targetDir}
  写入文件: ${result.files.length}
  跳过文件: ${result.skipped.length}${result.skipped.length > 0 ? '\n  (已存在，使用 --force 覆盖)' : ''}`,
        },
        format,
      )
    } catch (err) {
      return outputError(
        {
          code: 'OXN_UNPACK_FAILED',
          message: err instanceof Error ? err.message : '解包失败',
        },
        format,
      )
    }
  },
})
