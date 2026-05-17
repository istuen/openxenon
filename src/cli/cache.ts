import { defineCommand } from 'citty'
import { resolve } from 'path'
import { readdirSync, statSync, rmSync, existsSync } from 'fs'
import { output, outputError, getFormatFromArgs } from './output'
import { compileCache } from '../kernel/compiler/compile-cache'

export default defineCommand({
  meta: {
    name: 'cache',
    description: '管理编译缓存'
  },
  subCommands: {
    clear: () => import('./cache-clear').then(m => m.default),
    stats: () => import('./cache-stats').then(m => m.default),
  },
  async run(ctx) {
    return output({
      data: { message: '使用 oxn cache clear 或 oxn cache stats' },
      human: '使用 oxn cache clear 或 oxn cache stats'
    }, 'human')
  }
})