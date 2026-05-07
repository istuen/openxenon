import { defineCommand } from 'citty'
import { randomUUID } from 'crypto'
import { ensureTaskDirectory, getTaskDirectory, TASK_BLUEPRINT_FILE } from '../../lib/task-dir'
import { createTaskTrace } from '../../lib/task-trace'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'

export default defineCommand({
  meta: {
    name: 'task-new',
    description: '创建新任务（文件系统优先模式）'
  },
  async run({ args }) {
    const taskId = args._[0] || `task_${randomUUID().slice(0, 8)}`
    const taskName = (args.name as string) || '新任务'

    const projectRoot = process.cwd()
    const taskDir = getTaskDirectory(projectRoot, taskId)

    if (existsSync(taskDir.root)) {
      console.error(`Error: Task '${taskId}' already exists`)
      process.exit(1)
    }

    ensureTaskDirectory(taskDir)

    const blueprintContent = `id: ${taskId}
name: ${taskName}
stages: []
`

    writeFileSync(taskDir.blueprintPath, blueprintContent, 'utf-8')

    createTaskTrace(taskDir, taskId, taskName)

    console.log(JSON.stringify({
      taskId,
      taskName,
      blueprintPath: join('.openxenon', 'tasks', taskId, TASK_BLUEPRINT_FILE),
      status: 'PENDING',
      message: 'Task created successfully'
    }, null, 2))
  }
})