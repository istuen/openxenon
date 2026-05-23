import { defineCommand } from 'citty'
import { collectContext, loadExplorationAssets, saveReport } from '../infra/explore/collector'
import { evaluateExploration } from '../kernel/explore/evaluator'
import { renderMarkdown } from '../kernel/explore/reporter'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'explore',
    description: '探索项目状态，生成改进报告',
  },
  args: {
    name: {
      type: 'positional',
      description: '探索器名称 (coverage/quality/automation/all)',
      default: 'all',
    },
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出',
    },
    '--yaml': {
      type: 'boolean',
      description: 'YAML 格式输出',
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const projectRoot = process.cwd()

    const context = await collectContext(projectRoot)

    const names = ctx.args.name === 'all' ? undefined : [ctx.args.name as string]
    const explorations = await loadExplorationAssets(projectRoot, names)

    if (explorations.length === 0) {
      return outputError(
        {
          code: 'OXN_EXPLORE_NO_ASSET',
          message: `未找到探索器: ${ctx.args.name}`,
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
