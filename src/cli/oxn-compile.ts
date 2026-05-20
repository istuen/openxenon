import { defineCommand } from 'citty'
import { compileBundle } from '../oxn-dsl/compiler/bundle-compiler'
import { output, outputError, getFormatFromArgs } from './output'

export default defineCommand({
  meta: {
    name: 'compile',
    description: '编译 .oxn/.yaml 为三件套 (.bundle.oxn + assembly.json + schema.json)'
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: '源文件路径 (.oxn 或 .yaml)'
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出目录（默认为源文件同目录）'
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' }
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const path = ctx.args.path as string
    const outputDir = ctx.args.output as string | undefined

    try {
      const result = compileBundle(path, outputDir)
      return output({
        data: result,
        human: `编译完成:
  Bundle:   ${result.bundlePath}
  Assembly: ${result.assemblyPath}
  Schema:   ${result.schemaPath}
  实体数:   ${result.entityCount}`
      }, format)
    } catch (err) {
      return outputError({
        code: 'OXN_COMPILE_FAILED',
        message: err instanceof Error ? err.message : '编译失败'
      }, format)
    }
  }
})
