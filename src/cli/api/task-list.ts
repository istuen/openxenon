import { defineCommand } from 'citty'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getTaskDirectory } from '../../lib/task-dir'
import { readTaskTrace } from '../../lib/task-trace'
import type { TaskStatus } from '../../types/core'
import { cliContext } from '../../cli-context'

interface TaskInfo {
  id: string
  name: string
  status: TaskStatus | 'NOT_FOUND'
  createdAt?: number
}

export default defineCommand({
  meta: {
    name: 'task-list',
    description: '列出所有任务（文件系统优先模式）'
  },
  async run() {
    const projectRoot = process.cwd()
    const tasksDir = join(projectRoot, '.openxenon', 'tasks')

    if (!existsSync(tasksDir)) {
      if (cliContext.isJsonMode()) {
        console.log(JSON.stringify({ tasks: [], total: 0 }, null, 2))
      } else {
        console.log('\n暂无任务\n')
      }
      return
    }

    const taskDirs = readdirSync(tasksDir).filter(name => {
      const taskDir = getTaskDirectory(projectRoot, name)
      return existsSync(taskDir.tracePath)
    })

    const tasks: TaskInfo[] = []

    for (const taskId of taskDirs) {
      const taskDir = getTaskDirectory(projectRoot, taskId)
      const trace = readTaskTrace(taskDir)
      if (trace) {
        tasks.push({
          id: trace.taskId,
          name: trace.taskName,
          status: trace.status,
          createdAt: trace.startedAt
        })
      } else {
        tasks.push({
          id: taskId,
          name: taskId,
          status: 'PENDING' as TaskStatus
        })
      }
    }

    if (cliContext.isJsonMode()) {
      console.log(JSON.stringify({ tasks, total: tasks.length }, null, 2))
      return
    }

    console.log(`\n任务列表 (共 ${tasks.length} 个)\n`)
    console.log('='.repeat(60))

    if (tasks.length === 0) {
      console.log('暂无任务')
    } else {
      for (const task of tasks) {
        console.log(`ID: ${task.id}`)
        console.log(`名称: ${task.name}`)
        console.log(`状态: ${task.status}`)
        if (task.createdAt) {
          console.log(`创建时间: ${new Date(task.createdAt).toLocaleString()}`)
        }
        console.log('-'.repeat(40))
      }
    }

    console.log()
  }
})