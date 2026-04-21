import { defineCommand } from 'citty'

export default defineCommand({
  meta: {
    name: 'api',
    description: 'API 相关命令'
  },
  subCommands: {
    base: () => import('./api/base').then(m => m.default),
    'task-submit': () => import('./api/task-submit').then(m => m.default),
    'task-status': () => import('./api/task-status').then(m => m.default),
    'task-start': () => import('./api/task-start').then(m => m.default),
    'task-stop': () => import('./api/task-stop').then(m => m.default),
    'task-next': () => import('./api/task-next').then(m => m.default),
    'task-trace': () => import('./api/task-trace').then(m => m.default),
    'step-start': () => import('./api/step-start').then(m => m.default),
    'step-verify': () => import('./api/step-verify').then(m => m.default),
    'proofs-list': () => import('./api/proofs-list').then(m => m.default),
    'workspace-init': () => import('./api/workspace-init').then(m => m.default),
    health: () => import('./api/health').then(m => m.default)
  }
})