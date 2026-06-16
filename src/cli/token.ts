// =============================================================================
// oxn token — AI Model Token Consumption Tracking (v0.2.2)
//
// Subcommands:
//   ingest  — ingest a token consumption record from an AI assistant
//
// Future (sprint-10+):
//   show    — show token consumption summary for a work
//   trend   — show token consumption trend over time
// =============================================================================

import { defineCommand } from 'citty'
import { t } from '../infra/i18n'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import { writeTokenRecord } from '../infra/probes/token-writer'
import { IAPError } from '../core/errors'

function getProjectRoot(): string {
  return process.cwd()
}

// ---------------------------------------------------------------------------
// Subcommand: ingest
// ---------------------------------------------------------------------------

const ingestSubcommand = defineCommand({
  meta: {
    name: 'ingest',
    description: t('token.ingest.description'),
  },
  args: {
    'input-json': {
      type: 'string',
      required: true,
      description: t('token.ingest.inputJson'),
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const inputJson = ctx.args['input-json'] as string

    let rawInputs: Record<string, unknown>
    try {
      rawInputs = JSON.parse(inputJson)
      if (typeof rawInputs !== 'object' || rawInputs === null || Array.isArray(rawInputs)) {
        throw new Error('--input-json must be a JSON object (e.g. \'{"source":"opencode",...}\')')
      }
    } catch (err) {
      return outputUserInputError(
        'OXN_TOKEN_JSON_INVALID',
        `failed to parse --input-json: ${err instanceof Error ? err.message : String(err)}`,
        { format },
      )
    }

    // Write to JSONL via L1-Infra; IAPError caught here for proper output
    try {
      const result = writeTokenRecord(getProjectRoot(), rawInputs)
      output({ ok: true, data: result }, format)
    } catch (err) {
      if (err instanceof IAPError) {
        return outputError(
          {
            code: err.name,
            message: err.message,
            axis: err.axis,
            action: err.action,
            context: err.context as Record<string, unknown> | undefined,
          },
          format,
        )
      }
      throw err
    }
  },
})

// ---------------------------------------------------------------------------
// Parent: token
// ---------------------------------------------------------------------------

export default defineCommand({
  meta: {
    name: 'token',
    description: t('token.description'),
  },
  subCommands: {
    ingest: ingestSubcommand,
  },
})
