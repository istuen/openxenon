import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'gc',
    description: '垃圾清理命令 - prune'
  },
  subCommands: {
    prune: () => import('./gc-prune').then(m => m.default),
  }
})
