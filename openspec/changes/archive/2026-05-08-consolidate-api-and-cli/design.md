# Design: consolidate-api-and-cli

## Background

采用方案 B：将 `api/handlers/` 移到 `cli/handlers/`。

这样 daemon 启动时会 import `cli/handlers/`，handlers 通过 `registerRoute()` 注册路由，socket-server 收到请求后分发给 handlers。

## Architecture

```
CLI Command (cli/api/task-*.ts)
    │
    │ socketRequest()
    ▼
Socket Server (api/socket-server.ts)
    │
    │ handleRequest()
    ▼
Router (api/router.ts) → routes Map
    │
    │ getRoute()
    ▼
Handler (cli/handlers/task-*.ts)  ← 从 api/handlers/ 移来
```

## Implementation Steps

### Step 1: 创建 cli/handlers/ 目录

```bash
mkdir -p src/cli/handlers
```

### Step 2: 移动所有 handlers

```bash
mv src/api/handlers/*.ts src/cli/handlers/
rm -rf src/api/handlers/
```

### Step 3: 更新导入路径

每个移动的文件需要更新：
- `../../lib/task-dir` → `../../kernel/lib/task-dir`
- `../../lib/task-trace` → `../../kernel/lib/task-trace`
- `../../types/daemon-payload` → `../../daemon/types/daemon-payload`
- `../router` → `../../api/router`
- `../errors` → `../../api/errors`

### Step 4: 确认 daemon 导入 handlers

Daemon 启动文件需要 import handlers 以触发 registerRoute()。

### Step 5: 验证

- 确认 daemon 正常启动
- CLI 命令能通过 socket 与 daemon 通信

## File Changes Summary

| Action | File |
|--------|------|
| 移动 | `api/handlers/` → `cli/handlers/` |
| 更新 | 所有移动文件的导入路径 |
| 保留 | `api/server.ts`, `socket-server.ts`, `socket-client.ts`, `router.ts`, `context.ts`, `errors.ts`, `index.ts` |
| 删除 | `api/arsenal-draft.ts`, `api/validation.ts`, `api/proof-finder.ts` |