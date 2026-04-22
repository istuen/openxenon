import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'draft',
    description: '草案管理命令 - apply/diff/list/extract'
  },
  subCommands: {
    apply: () => import('./draft-apply').then(m => m.default),
    diff: () => import('./draft-diff').then(m => m.default),
    list: () => import('./draft-list').then(m => m.default),
    extract: () => import('./draft-extract').then(m => m.default),
  }
})
