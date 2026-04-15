import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'inspect',
    description: '查看当前任务的 step-manifest.json 原始内容'
  },
  args: {
    taskId: {
      type: 'positional',
      description: '任务ID',
      required: false
    }
  },
  async run() {
    console.log('查看任务舱单...')
    console.log('提示: 此功能将在后续版本实现')
  }
})
