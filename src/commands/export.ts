import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'export',
    description: '导出项目状态为文档 - active/archive'
  },
  subCommands: {
    active: () => import('./export-active').then(m => m.default),
    archive: () => import('./export-archive').then(m => m.default),
  }
})
