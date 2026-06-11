import { defineCommand } from 'citty'
import { t } from '../infra/i18n'
import { collectRawContext, loadExplorationAssets, saveReport } from '../infra/explore/collector'
import { toExplorationContext } from '../work/explore/converters'
import { evaluateExploration } from '../work/explore/evaluator'
import { renderMarkdown } from '../work/explore/reporter'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'explore',
    description: t('explore.status.description'),
  },
  args: {
    name: {
      type: 'positional',
      description: t('explore.status.explorerName'),
      default: 'all',
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
    const projectRoot = process.cwd()

    const rawContext = await collectRawContext(projectRoot)
    const context = toExplorationContext(rawContext)

    const names = ctx.args.name === 'all' ? undefined : [ctx.args.name as string]
    const explorations = await loadExplorationAssets(projectRoot, names)

    if (explorations.length === 0) {
      return outputError(
        {
          code: 'OXN_EXPLORE_NO_ASSET',
          message: t('explore.status.notFound', { name: ctx.args.name }),
        },
        format,
      )
    }

    const results = []

    for (const exploration of explorations) {
      const result = evaluateExploration(context, exploration.rules, {
        name: exploration.name,
        title: exploration.description,
      })

      const markdown = renderMarkdown(result)

      let filepath: string | undefined
      if (!format || format === 'human') {
        filepath = await saveReport(projectRoot, exploration.output, markdown)
      }

      results.push({
        name: exploration.name,
        description: exploration.description,
        path: filepath,
        summary: result.summary,
        findingsCount: result.findings.length,
      })
    }

    return output(
      {
        data: { explorations: results },
        human: format === 'human' || !format ? results.map((r) => `${r.name}: ${r.summary}`).join('\n') : undefined,
      },
      format,
    )
  },
})
