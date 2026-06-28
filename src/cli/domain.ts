/**
 * src/cli/domain.ts — L3 CLI 薄壳 (v0.6 PR-5a)
 *
 * 业务逻辑已迁到 packages/engine/src/Asset/ 模块。
 * CLI 只做：parse args → 调 Asset → format output
 */
import { defineCommand } from 'citty'
import { create, validate, list, listAll } from '@openxenon/engine/Asset'
import { t } from '@openxenon/engine/infra/i18n'
import { join } from 'path'
import { existsSync } from '@openxenon/engine/infra/filesystem'
import { BOUNDARY_DIR, DOMAINS_DIR } from '@openxenon/engine/kernel'
import { getDomainIndexPath, writeDomainIndex } from '@openxenon/engine/oxl/compiler/domain-index-builder'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import { IAPError } from '@openxenon/engine/errors'

function getProjectRoot(): string {
  return process.cwd()
}

// ── create ──
const createSubcommand = defineCommand({
  meta: { name: 'create', description: t('domain.create.description') },
  args: {
    name: { type: 'positional', required: true, description: t('domain.create.name') },
    '--json': { type: 'boolean', description: t('format.json') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    try {
      const result = await create({ kind: 'domain', name: ctx.args.name as string, projectRoot: getProjectRoot() })
      output({ ok: true, data: result, human: `Created domain: ${result.assetPath}` }, format)
    } catch (err) {
      handleDomainError(err, format)
    }
  },
})

// ── validate ──
const validateSubcommand = defineCommand({
  meta: { name: 'validate', description: t('domain.validate.description') },
  args: {
    name: { type: 'positional', required: true, description: t('domain.validate.name') },
    '--json': { type: 'boolean', description: t('format.json') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    try {
      const result = await validate({ kind: 'domain', name: ctx.args.name as string, projectRoot: getProjectRoot() })
      if (!result.ok) return outputError({ code: 'OXN_DOMAIN_VALIDATION_FAILED', message: result.errors[0] || 'validation failed' }, format)
      output({ ok: true, data: result, human: `Domain validated: ${(result.domain as { name?: string } | undefined)?.name ?? ctx.args.name}` }, format)
    } catch (err) {
      handleDomainError(err, format)
    }
  },
})

// ── list ──
const listSubcommand = defineCommand({
  meta: { name: 'list', description: t('domain.list.description') },
  args: {
    '--all': { type: 'boolean', description: 'list all asset kinds' },
    '--json': { type: 'boolean', description: t('format.json') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const showAll = Boolean((ctx.args as Record<string, unknown>)['all'])
    const result = showAll ? listAll(getProjectRoot()) : list({ kind: 'domain', projectRoot: getProjectRoot() })
    output({ ok: true, data: result, human: result.assets.map((a) => `  ${a.kind}: ${a.name}`).join('\n') }, format)
  },
})

function handleDomainError(err: unknown, format: ReturnType<typeof getFormatFromArgs>) {
  if (err instanceof IAPError) {
    return outputError({ code: err.name, message: err.message }, format)
  }
  const message = err instanceof Error ? err.message : String(err)
  outputUserInputError('OXN_DOMAIN_ERROR', message, { suggestion: 'Check help doc', format })
}

export default defineCommand({
  meta: { name: 'domain', description: t('domain.description') },
  subCommands: {
    create: createSubcommand,
    validate: validateSubcommand,
    list: listSubcommand,
  },
  async run(ctx) {
    if (ctx.args._) return
    output({ ok: true, data: {}, human: '' }, getFormatFromArgs(ctx.args))
  },
})

/** Rebuild domain index at init (v0.6 PR-5a thin re-export) */
export function autoRebuildDomainIndex(projectRoot: string): {
  ok: boolean
  indexPath?: string
  error?: string
} {
  try {
    const domainsDir = join(projectRoot, BOUNDARY_DIR, DOMAINS_DIR)
    if (!existsSync(domainsDir)) return { ok: true }
    const outPath = getDomainIndexPath(projectRoot)
    writeDomainIndex({ projectRoot, domainsDir, outPath })
    return { ok: true, indexPath: outPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
