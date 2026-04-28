import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'arsenal',
    description: '管理标准资产（Probe、Proof、Stage）'
  },
  subCommands: {
    list: () => import('./arsenal-list').then(m => m.default),
    inspect: () => import('./arsenal-inspect').then(m => m.default),
    promote: () => import('./arsenal-promote').then(m => m.default)
  }
})