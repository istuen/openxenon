import { defineCommand } from 'citty'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import { blueprintToDagHtml } from './render/blueprint-renderer'

function getProjectRoot(): string {
  return process.cwd()
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
}

export default defineCommand({
  meta: {
    name: 'render',
    description: '将 Draft Blueprint 渲染为 DAG 拓扑 HTML'
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
      if (!projectBoundaryExists()) {
        console.error('错误: 项目未初始化，请先执行 oxn init')
        return
      }

      const blueprintName = ctx.args.name as string
      const cwd = getProjectRoot()
      const draftPath = join(cwd, BOUNDARY_DIR, 'arsenals', 'blueprints', blueprintName, 'draft.yaml')

      if (!existsSync(draftPath)) {
        console.error(`错误: Draft Blueprint 不存在: ${blueprintName}`)
        return
      }

      const blueprintContent = readFileSync(draftPath, 'utf-8')
      const html = blueprintToDagHtml({ blueprintName, blueprintContent })

      const htmlPath = join(cwd, BOUNDARY_DIR, 'arsenals', 'blueprints', blueprintName, `preview-${Date.now()}.html`)
      writeFileSync(htmlPath, html, 'utf-8')

      console.log(`Blueprint DAG 预览已生成: ${htmlPath}`)
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