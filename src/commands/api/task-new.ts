import { defineCommand } from 'citty'
import { randomUUID } from 'crypto'

export default defineCommand({
  meta: {
    name: 'task-new',
    description: '输出 Task JSON 模板'
  },
  async run() {
    const taskId = `task_${randomUUID().slice(0, 8)}`
    const blueprintId = `bp_${randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()

    const template = {
      id: taskId,
      name: '任务名称',
      status: 'PENDING',
      activeBlueprintId: null,
      createdAt: now,
      blueprints: [
        {
          id: blueprintId,
          taskId: taskId,
          name: '蓝图名称',
          status: 'DRAFT',
          stages: [
            {
              id: 'stage_1',
              name: '阶段名称',
              deps: [],
              target: '预期终态描述',
              spec: '执行规范描述',
              action: undefined,
              proof: 'proof_name'
            }
          ]
        }
      ]
    }

    console.log(JSON.stringify(template, null, 2))
  }
})
