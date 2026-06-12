import { defineCommand } from 'citty'
import { t } from '../infra/i18n'
import { output } from './output'

export default defineCommand({
  meta: {
    name: 'cache',
    description: '管理编译缓存',
  },
  subCommands: {
    clear: () => import('./cache-clear').then((m) => m.default),
    stats: () => import('./cache-stats').then((m) => m.default),
  },
  async run(_ctx) {
    return output(
      {
        data: { message: t('cache.usage') },
        human: t('cache.usage'),
      },
      'human',
    )
  },
})
