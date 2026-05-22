import { defineCommand } from 'citty'
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
        data: { message: '使用 oxn cache clear 或 oxn cache stats' },
        human: '使用 oxn cache clear 或 oxn cache stats',
      },
      'human',
    )
  },
})
