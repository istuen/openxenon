/**
 * src/cli/blueprint.ts — L3 CLI 薄壳 (v0.6 PR-5a)
 */
import { defineCommand } from 'citty'
import { create, validate, list } from '@openxenon/engine/Asset'
import { t } from '@openxenon/engine/infra/i18n'
import { getFormatFromArgs, output, outputError } from './output'
import { IAPError } from '@openxenon/engine/errors'

function getProjectRoot(): string {
  return process.cwd()
}

const createSubcommand = defineCommand({
  meta: { name: 'create', description: t('blueprint.create.description') },
  args: {
    name: { type: 'positional', required: true },
    '--json': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    try {
      const result = await create({ kind: 'blueprint', name: ctx.args.name as string, projectRoot: getProjectRoot() })
      output({ ok: true, data: result, human: `Created blueprint: ${result.assetPath}` }, format)
    } catch (err) {
      if (err instanceof IAPError) return outputError({ code: err.name, message: err.message }, format)
      const message = err instanceof Error ? err.message : String(err)
      outputError({ code: 'OXN_BLUEPRINT_ERROR', message }, format)
    }
  },
})

const validateSubcommand = defineCommand({
  meta: { name: 'validate', description: t('blueprint.validate.description') },
  args: {
    name: { type: 'positional', required: true },
    '--json': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    try {
      const result = await validate({ kind: 'blueprint', name: ctx.args.name as string, projectRoot: getProjectRoot() })
      if (!result.ok) return outputError({ code: 'OXN_BLUEPRINT_VALIDATION_FAILED', message: result.errors[0] || 'validation failed' }, format)
      output({ ok: true, data: result, human: `Blueprint validated: ${ctx.args.name}` }, format)
    } catch (err) {
      if (err instanceof IAPError) return outputError({ code: err.name, message: err.message }, format)
      outputError({ code: 'OXN_BLUEPRINT_ERROR', message: err instanceof Error ? err.message : String(err) }, format)
    }
  },
})

const listSubcommand = defineCommand({
  meta: { name: 'list', description: t('blueprint.list.description') },
  args: { '--json': { type: 'boolean' } },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const result = list({ kind: 'blueprint', projectRoot: getProjectRoot() })
    output({ ok: true, data: result, human: result.assets.map((a) => `  blueprint: ${a.name}`).join('\n') }, format)
  },
})

export default defineCommand({
  meta: { name: 'blueprint', description: t('blueprint.description') },
  subCommands: {
    create: createSubcommand,
    validate: validateSubcommand,
    list: listSubcommand,
  },
})
