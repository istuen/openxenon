import { defineCommand } from 'citty'
import { collectContext, saveReport, loadExplorationAssets } from '../infra/explore/collector'
import { evaluateExploration } from '../kernel/explore/evaluator'
import { renderMarkdown } from '../kernel/explore/reporter'

export default defineCommand({
  meta: {
    name: 'explore',
    description: '探索项目状态，生成改进报告'
  },
  args: {
    name: {
      type: 'positional',
      description: '探索器名称 (coverage/quality/automation/all)',
      default: 'all'
    },
    json: {
      type: 'boolean',
      alias: 'j',
      description: 'JSON 输出（不写文件）',
      default: false
    }
  },
  async run({ args }) {
    const projectRoot = process.cwd()

    // 1. Infra: 采集上下文
    const context = await collectContext(projectRoot)

    // 2. 加载探索器资产
    const names = args.name === 'all' ? undefined : [args.name]
    const explorations = await loadExplorationAssets(projectRoot, names)

    if (explorations.length === 0) {
      console.log(JSON.stringify({
        ok: false,
        error: {
          code: 'OXN_EXPLORE_NO_ASSET',
          message: `未找到探索器: ${args.name}`
        }
      }))
      return
    }

    // 3. Kernel: 逐个执行探索器
    for (const exploration of explorations) {
      const result = evaluateExploration(
        context,
        exploration.rules,
        { name: exploration.name, title: exploration.description }
      )

      // 4. Kernel: 渲染 Markdown
      const markdown = renderMarkdown(result)

      if (args.json) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        // 5. Infra: 写入文件
        const filepath = await saveReport(
          projectRoot,
          exploration.output,
          markdown
        )
        console.log(JSON.stringify({
          ok: true,
          data: {
            name: exploration.name,
            description: exploration.description,
            path: filepath,
            summary: result.summary,
            findingsCount: result.findings.length
          }
        }))
      }
    }
  }
})
