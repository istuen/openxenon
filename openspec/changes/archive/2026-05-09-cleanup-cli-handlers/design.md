## CLI Handler 修正

### 当前（直接调用 Daemon）

```typescript
// src/cli/handlers/task-start.ts (当前)

import { daemon } from '../../daemon'

export async function handleTaskStart(taskPath: string) {
  // 直接调用 Daemon 函数
  return daemon.engine.execute(taskPath)
}
```

### 修正后（通过 Socket 通信）

```typescript
// src/cli/handlers/task-start.ts (修正后)

import { sendToDaemon } from '../socket-client'

export async function handleTaskStart(taskPath: string) {
  // 通过 Unix Socket 发送纯 JSON
  return sendToDaemon({
    method: 'POST',
    path: '/api/v1/task/start',
    body: { taskPath },
    projectPath: process.cwd()
  })
}
```

### Socket Client 实现

```typescript
// src/cli/socket-client.ts

import { connect } from './unix-socket'

export async function sendToDaemon(message: object): Promise<Response> {
  const socket = await connect()
  socket.write(JSON.stringify(message))

  const response = await readResponse(socket)
  return JSON.parse(response)
}
```

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| CLI 不导入 Daemon | `grep -r "from.*daemon" src/cli/` 返回空 |
| 所有 handler 走 Socket | 检查每个 handler 调用 `sendToDaemon` |
