import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'daemon-stop',
    description: '停止全局 Core 守护进程',
  },
  async run() {
    console.log('TODO: 实现 daemon stop - 需要与 Core 守护进程通信')
  },
})
