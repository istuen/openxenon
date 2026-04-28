import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'standards',
    description: '管理标准资产（Probe、Proof、Stage）'
  },
  subCommands: {
    list: () => import('./standards-list').then(m => m.default),
    inspect: () => import('./standards-inspect').then(m => m.default),
    promote: () => import('./standards-promote').then(m => m.default)
  }
})