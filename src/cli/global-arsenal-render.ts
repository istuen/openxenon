import { defineCommand } from 'citty'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import { blueprintToDagHtml } from './render/blueprint-renderer'
import { GLOBAL_ARSENALS_ROOT } from '../infra/paths'

export default defineCommand({
  meta: {
    name: 'render',
    description: '将全局 Draft Blueprint 渲染为 DAG 拓扑 HTML'
  },
  args: {
    name: {
      type: 'string',
      required: true,
      description: 'Blueprint 名称'
    }
  },
  run(ctx) {
    try {
      const blueprintName = ctx.args.name as string
      const draftPath = join(GLOBAL_ARSENALS_ROOT, 'blueprints', blueprintName, 'draft.yaml')

      if (!existsSync(draftPath)) {
        console.error(`错误: 全局 Draft Blueprint 不存在: ${blueprintName}`)
        return
      }

      const blueprintContent = readFileSync(draftPath, 'utf-8')
      const html = blueprintToDagHtml({ blueprintName, blueprintContent })

      const htmlPath = join(GLOBAL_ARSENALS_ROOT, 'blueprints', blueprintName, `preview-${Date.now()}.html`)
      writeFileSync(htmlPath, html, 'utf-8')

      console.log(`Global Blueprint DAG 预览已生成: ${htmlPath}`)
      console.log('正在打开浏览器...')

      const { exec } = require('child_process')
      exec(`open "${htmlPath}"`, (err: Error | null) => {
        if (err) {
          console.error('警告: 无法自动打开浏览器，请手动打开预览文件')
        }
      })
    } catch (err: unknown) {
      const error = err as Error
      console.error(`错误: ${error.message || String(err)}`)
    }
  }
})