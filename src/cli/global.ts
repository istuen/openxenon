import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'global',
    description: '全局基础设施管理（daemon、hall — 工程师专用，AI 不可见）',
  },
  subCommands: {
    hall: () => import('./global-hall').then((m) => m.default),
    daemon: () => import('./daemon').then((m) => m.default),
  },
})
