import { defineCommand } from 'citty'
import { t } from '../infra/i18n'
import { ensureHallDirectory, renderHall } from '../hall'
import { GLOBAL_BOUNDARY } from '../infra/paths'
import { getFormatFromArgs, output, outputError } from './output'

export default defineCommand({
  meta: {
    name: 'hall',
    description: t('globalHall.description'),
  },
  args: {
    '--json': {
      type: 'boolean',
      description: t('format.json'),
    },
    '--open': {
      type: 'boolean',
      description: t('globalHall.open'),
    },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const openInBrowser = ctx.args['--open'] as boolean | undefined

    try {
      ensureHallDirectory(GLOBAL_BOUNDARY)
      const indexPath = renderHall(GLOBAL_BOUNDARY)
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

        return output(
          {
            data: { path: indexPath, url: hallUrl },
            human: t('globalHall.opened', { url: hallUrl }),
          },
          format,
        )
      }

      return output(
        {
          data: { path: indexPath, url: hallUrl },
          human: t('globalHall.pathHint', { path: indexPath }),
        },
        format,
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return outputError(
        {
          code: 'OXN_HALL_ERROR',
          message: errorMsg,
        },
        format,
      )
    }
  },
})
