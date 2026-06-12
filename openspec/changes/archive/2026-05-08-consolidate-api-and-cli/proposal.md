# Proposal: consolidate-api-and-cli

## What

将 `api/handlers/` 移到 `cli/handlers/`，保留 API 层的路由注册机制（`registerRoute`）。CLI 命令通过 socket 与 daemon 通信，daemon 使用移动后的 handlers 处理请求。

## Why

### 问题诊断

1. **Handlers 在 api/ 但被 cli/ 调用**
   - `cli/api/*.ts` 使用 `socketRequest()` 发送请求
   - `socket-server.ts` 收到请求后调用 `handleRequest()` → `routes Map`
   - 但 routes 的 handler 来自 `api/handlers/` 的 registerRoute() 调用

2. **架构不一致**
   - 业务逻辑（handlers）在 api/
   - 调用方（cli/）在 cli/
   - CLI 不能直接用 handlers，需要通过 socket

### 期望状态

```
src/
├── api/              # 基础设施
│   ├── server.ts     # 服务器入口
│   ├── socket-server.ts  # Socket 接收请求
│   ├── socket-client.ts  # CLI 用这个发请求
│   ├── router.ts    # registerRoute, handleRequest
│   ├── context.ts    # loadProjectContext
│   └── errors.ts     # 错误响应
├── cli/
│   ├── handlers/     # 移动：从 api/handlers/ 移来
│   │   ├── fs-execute.ts
│   │   ├── proofs-list.ts
│   │   ├── task-*.ts
│   │   └── health.ts, step-*.ts
│   ├── api/          # CLI 命令（通过 socket 调用 handlers）
│   │   └── task-*.ts
│   ├── arsenal-*.ts
│   └── ...
└── infra/
```

**关键**：handlers 移到 cli/ 后，daemon 启动时会 import 这些 handlers，它们通过 `registerRoute()` 注册路由。

## Scope

### In Scope
- 将 `api/handlers/` 移动到 `cli/handlers/`
- 更新 handlers 中的导入路径（`../../lib/` → `../../kernel/lib/` 等）
- 保留 API 基础设施文件（server, socket, router, context, errors）
- 确认 daemon 仍能正常启动

### Out of Scope
- 不改变 CLI 命令结构
- 不改变 `infra/` 结构

## Risks

- 需要确认 daemon 启动时能正确 import handlers
- 移动后需要验证 socket 通信仍正常