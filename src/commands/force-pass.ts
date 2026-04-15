import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'force-pass',
    description: '强制通过指定步骤（仅用于 Proof 探针错误的情况）'
  },
  args: {
    stepId: {
      type: 'positional',
      description: '步骤ID',
      required: true
    }
  },
  async run() {
    console.log('警告: 强制通过将绕过验证机制')
    console.log('提示: 此功能将在后续版本实现')
  }
})
