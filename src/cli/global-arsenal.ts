import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'arsenal',
    description: '全局标准资产管理',
  },
  subCommands: {
    list: () => import('./global-arsenal-list').then((m) => m.default),
    inspect: () => import('./global-arsenal-inspect').then((m) => m.default),
    publish: () => import('./global-arsenal-promote').then((m) => m.default),
    search: () => import('./global-arsenal-search').then((m) => m.default),
    export: () => import('./global-arsenal-export').then((m) => m.default),
    import: () => import('./global-arsenal-import').then((m) => m.default),
    migrate: () => import('./global-arsenal-migrate').then((m) => m.default),
    render: () => import('./global-arsenal-render').then((m) => m.default),
    harvest: () => import('./global-arsenal-harvest').then((m) => m.default),
  },
})
