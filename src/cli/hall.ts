import { defineCommand } from 'citty'
import { ensureHallDirectory, renderHall, getHallPath, getHallStats, scanForgeDrafts, scanProjectTasks } from '../hall'
import { getProjectBoundaryPath } from '../kernel'
import { output, outputError, getFormatFromArgs } from './output'
import { existsSync } from 'fs'
import { join } from 'path'

export default defineCommand({
  meta: {
    name: 'hall',
    description: '打开研讨厅 (Hall)，查看全局状态和待办'
  },
  args: {
    '--json': {
      type: 'boolean',
      description: 'JSON 格式输出'
    },
    '--open': {
      type: 'boolean',
      description: '在浏览器中打开'
    }
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const openInBrowser = ctx.args['--open'] as boolean | undefined

    try {
      const projectRoot = getProjectBoundaryPath(process.cwd())

      ensureHallDirectory()
      const indexPath = renderHall(projectRoot)
      const hallUrl = `file://${indexPath}`

      if (openInBrowser) {
        const { exec } = await import('child_process')
        const platform = process.platform
        let cmd: string

        if (platform === 'darwin') {
          cmd = `open "${hallUrl}"`
        } else if (platform === 'win32') {
          cmd = `start "" "${hallUrl}"`
        } else {
          cmd = `xdg-open "${hallUrl}"`
        }

        exec(cmd, (err) => {
          if (err) {
            console.error('Failed to open browser:', err)
          }
        })

        return output({
          data: { path: indexPath, url: hallUrl },
          human: `Hall 已打开: ${hallUrl}`
        }, format)
      }

      return output({
        data: { path: indexPath, url: hallUrl },
        human: `Hall 路径: ${indexPath}\n\n使用 --open 在浏览器中打开`
      }, format)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError({
        code: 'OXN_HALL_ERROR',
        message: errorMsg
      }, format)
    }
  }
})