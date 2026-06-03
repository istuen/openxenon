import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'global',
    description: '全局资产管理（工程师专用，AI 不可见）',
  },
  subCommands: {
    arsenal: () => import('./global-arsenal').then((m) => m.default),
    hall: () => import('./global-hall').then((m) => m.default),
    daemon: () => import('./daemon').then((m) => m.default),
  },
})
