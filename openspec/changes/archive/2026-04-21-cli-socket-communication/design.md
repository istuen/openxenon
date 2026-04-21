## Context

当前使用 HTTP 通信 (127.0.0.1:8420)，需要迁移到 Unix Socket。

## Goals / Non-Goals

**Goals:**
- 将 HTTP API 替换为 Unix Socket
- 新增 CLI 子命令 (`oxn api task-submit` 等)
- 通过 CLI 子命令调用 API (Skills 间接调用)

**Non-Goals:**
- 不修改业务逻辑
- 不修改数据库操作

## Decisions

### 1. Socket 服务实现

使用 `Bun.listen()` 监听 Unix Socket，复用现有 `router.ts` 的路由逻辑。

### 2. CLI 命令结构 (Citty 子命令)

```
oxn api
├── task-submit   # 提交任务
├── task-status  # 查询状态
├── task-start   # 开始任务
├── task-stop    # 停止任务
├── task-next    # 下一步
├── task-trace   # 轨迹追踪
├── step-start   # 开始步骤
├── step-verify  # 验证步骤
├── proofs-list  # 探针列表
├── workspace-init # 初始化空间
└── health       # 健康检查
```

### 3. Socket 客户端实现

CLI 子命令内部使用 `Bun.socket()` 连接 Unix Socket：

```typescript
// src/api/socket-client.ts
export async function socketRequest(
  socketPath: string,
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const socket = Bun.socket({
    socket: {
      data(socket, data) {
        // 处理响应
      }
    }
  })
  
  // 发送请求
  socket.write(JSON.stringify({ method, path, body }))
}
```

### 4. Skills 调用方式

```bash
# 旧方式 (HTTP)
curl -s $(oxn api base)/api/v1/task/submit -d '{"task":"xxx"}'

# 新方式 (CLI 子命令)
oxn api task-submit --task "xxx"
```

## Implementation Details

### Socket 服务器

```typescript
// src/api/socket-server.ts
import { listen } from 'bun'
import { handleRequest } from './router'

const server = listen({
  socket: {
    async data(socket, data) {
      const request = JSON.parse(data.toString())
      const response = await handleRequest(
        request.method,
        request.path,
        request.body,
        db,
        projectPath
      )
      socket.write(JSON.stringify(response))
    }
  }
})
```

### CLI 子命令模式

```typescript
// src/commands/api/task-submit.ts
export default defineCommand({
  meta: { name: 'task-submit', description: '提交任务' },
  args: {
    task: { type: 'string', description: '任务描述' }
  },
  async run({ args }) {
    const socketPath = getSocketPath()
    const response = await socketRequest(socketPath, 'POST', '/api/v1/task/submit', {
      task: args.task
    })
    console.log(JSON.stringify(response, null, 2))
  }
})
```

## Migration Plan

### Phase 1: Socket 服务器 (3 tasks)
- 常量更新
- Socket 服务器实现
- 服务整合

### Phase 2: CLI 子命令 (13 tasks)
- Socket 客户端
- API 子命令结构
- 11 个子命令实现

### Phase 3: Skills 更新 (6 tasks)
- Task Skills
- Status Skills
- Control Skills

### Phase 4: 测试更新 (3 tasks)
- 单元测试
- 集成测试

### Phase 5: 清理与验证 (3 tasks)
- 代码清理
- 验证

## Risks / Trade-offs

- [风险] Unix Socket 路径问题 → 使用标准路径 `~/.openxenon/daemon.sock`
- [风险] Windows 不支持 → 预留 TCP fallback
- [风险] 权限问题 → 使用 umask 设置正确权限

## Open Questions

- 是否需要保留 HTTP 作为 fallback？
- 如何处理 Socket 通信的序列化/反序列化？
- 是否需要支持异步流式响应？