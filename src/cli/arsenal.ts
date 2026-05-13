import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'arsenal',
    description: '管理标准资产（Probe、Proof、Stage、Blueprint）'
  },
  subCommands: {
    list: () => import('./arsenal-list').then(m => m.default),
    inspect: () => import('./arsenal-inspect').then(m => m.default),
    promote: () => import('./arsenal-promote').then(m => m.default),
    search: () => import('./arsenal-search').then(m => m.default),
    export: () => import('./arsenal-export').then(m => m.default),
    import: () => import('./arsenal-import').then(m => m.default),
    migrate: () => import('./arsenal-migrate').then(m => m.default),
    render: () => import('./arsenal-render').then(m => m.default)
  }
})