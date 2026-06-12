## 架构拓扑（修正后）

```
┌─────────────────────────────────────────────────────────────────┐
│                 CLI → Daemon 物理隔离拓扑                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [修正前]                                                       │
│  src/cli/handlers/*                                             │
│       │                                                         │
│       │ ◄── 物理倒灌! Daemon 依赖这个目录                        │
│       ▼                                                         │
│  src/daemon/ipc/handlers.ts                                    │
│  import '../../cli/handlers/*'                                  │
│                                                                  │
│  [修正后]                                                       │
│  src/cli/handlers/*                                             │
│       │ (仅被 CLI 自身使用)                                       │
│       │                                                         │
│       │  JSON Payload                                          │
│       ▼                                                         │
│  ~/.openxenon/daemon.sock                                       │
│       │                                                         │
│       ▼                                                         │
│  src/daemon/ipc/receiver.ts  ◄── 纯 JSON 接收器               │
│       │                                                         │
│       │ 纯函数分发                                               │
│       ▼                                                         │
│  src/daemon/engine.ts                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## receiver.ts 设计

```typescript
// src/daemon/ipc/receiver.ts

interface IncomingMessage {
  method: string
  path: string
  body?: unknown
  projectPath?: string
}

type RouteHandler = (
  body: unknown,
  projectPath: string
) => Promise<Response>

const routes: Map<string, RouteHandler> = new Map()

export function registerRoute(method: string, path: string, handler: RouteHandler): void {
  routes.set(`${method} ${path}`, handler)
}

export async function handleIncomingMessage(
  message: IncomingMessage
): Promise<Response> {
  const { method, path, body, projectPath } = message
  const key = `${method} ${path}`

  const handler = routes.get(key)
  if (!handler) {
    return new Response(
      JSON.stringify({ error: 'NotFound', message: `No route for ${key}` }),
      { status: 404 }
    )
  }

  return handler(body, projectPath || '')
}
```

## handlers.ts 修正

```typescript
// src/daemon/ipc/handlers.ts (修正后)

import { registerRoute } from './receiver'

// 不再导入任何 CLI handlers
// 直接在 daemon 层定义处理函数

registerRoute('POST', '/api/v1/task/start', handleTaskStart)
registerRoute('POST', '/api/v1/task/stop', handleTaskStop)
registerRoute('GET', '/api/v1/task/status', handleTaskStatus)
// ...
```

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| CLI 不导入 Daemon | `grep -r "from.*daemon" src/cli/` 返回空 |
| Daemon 不导入 CLI | `grep -r "from.*cli" src/daemon/` 返回空 |
| 只有纯 JSON 流过 Socket | WireShark/tcpdump 可验证 |
