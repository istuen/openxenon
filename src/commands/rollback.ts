import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'rollback',
    description: '回滚指定步骤（极其危险，需谨慎使用）'
  },
  args: {
    stepId: {
      type: 'positional',
      description: '步骤ID',
      required: true
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: '强制回滚，无需确认',
      default: false
    }
  },
  async run() {
    console.log('警告: 回滚操作将删除指定步骤产生的所有文件')
    console.log('提示: 此功能将在后续版本实现')
  }
})
