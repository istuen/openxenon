import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'daemon-status',
    description: '查看全局 Core 守护进程状态'
  },
  async run() {
    console.log('TODO: 实现 daemon status - 需要与 Core 守护进程通信')
  }
})
