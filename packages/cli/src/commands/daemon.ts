import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'daemon',
    description: '管理全局 Core 引擎的生命周期',
  },
  subCommands: {
    start: () => import('./daemon-start').then((m) => m.default),
    stop: () => import('./daemon-stop').then((m) => m.default),
    status: () => import('./daemon-status').then((m) => m.default),
  },
  async run() {
    console.log('使用 `oxn daemon start|stop|status` 查看可用子命令')
  },
})
