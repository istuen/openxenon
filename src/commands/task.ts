import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'task',
    description: 'Task 相关命令'
  },
  subCommands: {
    new: () => import('./api/task-new').then(m => m.default),
    list: () => import('./api/task-list').then(m => m.default),
    status: () => import('./api/task-status').then(m => m.default),
    start: () => import('./api/task-start').then(m => m.default),
    stop: () => import('./api/task-stop').then(m => m.default),
    next: () => import('./api/task-next').then(m => m.default),
    trace: () => import('./api/task-trace').then(m => m.default)
  }
})
