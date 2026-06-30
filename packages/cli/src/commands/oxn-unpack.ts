import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'
import { unpackBundle } from '@openxenon/engine/oxl/unpacker/bundle-unpacker'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'unpack',
    description: t('oxnUnpack.description'),
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: t('oxnUnpack.path'),
    },
    output: {
      type: 'string',
      alias: 'o',
      description: t('oxnUnpack.output'),
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: t('oxnUnpack.force'),
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
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
          human: t('oxnUnpack.complete', {
            target: result.targetDir,
            written: result.files.length,
            skipped: result.skipped.length,
            hint: result.skipped.length > 0 ? t('oxnUnpack.forceHint') : '',
          }),
        },
        format,
      )
    } catch (err) {
      return outputError(
        {
          code: 'OXN_UNPACK_FAILED',
          message: err instanceof Error ? err.message : t('oxnUnpack.failed'),
        },
        format,
      )
    }
  },
})
