import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'trace',
    description: '查看当前任务的 task-trace.yaml 原始内容'
  },
  args: {
    taskId: {
      type: 'positional',
      description: '任务ID',
      required: false
    }
  },
  async run() {
    console.log('查看任务轨迹...')
    console.log('提示: 此功能将在后续版本实现')
  }
})
