import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'draft',
    description: 'Draft 模式入口，用于在隔离沙箱中探索变体'
  },
  async run() {
    console.log('TODO: 实现 draft 模式 - 需要与 Core 守护进程通信')
  }
})
