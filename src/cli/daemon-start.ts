import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'daemon-start',
    description: '启动全局 Core 守护进程'
  },
  async run() {
    console.log('TODO: 实现 daemon start - 需要与 Core 守护进程通信')
  }
})
