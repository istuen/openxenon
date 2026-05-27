## 1. 分析当前 CLI handlers 导出

- [x] 1.1 列出所有 `src/cli/handlers/*.ts` 导出的函数
- [x] 1.2 确认每个函数的功能是否需要在 Daemon 中保留

## 2. 建立 receiver.ts

- [x] 2.1 创建 `src/daemon/ipc/receiver.ts`
  - 定义 `IncomingMessage` 接口
  - 定义 `RouteHandler` 类型
  - 实现 `registerRoute()` 函数
  - 实现 `handleIncomingMessage()` 函数
  - **验收**：此文件不导入任何 `src/cli/` 模块

- [x] 2.2 创建基础路由表
  - `POST /api/v1/task/start`
  - `POST /api/v1/task/stop`
  - `GET /api/v1/task/status`
  - `GET /api/v1/task/trace`
  - `POST /api/v1/task/submit`
  - `POST /api/v1/fs/execute`

## 3. 迁移处理函数

- [x] 3.1 将 `src/cli/handlers/task-start.ts` 的逻辑迁移到 `src/daemon/ipc/handlers/task-start.ts`
- [x] 3.2 将 `src/cli/handlers/task-stop.ts` 的逻辑迁移到 `src/daemon/ipc/handlers/task-stop.ts`
- [x] 3.3 将 `src/cli/handlers/task-status.ts` 的逻辑迁移到 `src/daemon/ipc/handlers/task-status.ts`
- [x] 3.4 将 `src/cli/handlers/fs-execute.ts` 的逻辑迁移到 `src/daemon/ipc/handlers/fs-execute.ts`

## 4. 删除倒灌代码

- [x] 4.1 删除 `src/daemon/ipc/handlers.ts` 中对 `cli/handlers` 的导入
- [x] 4.2 确认 `src/daemon/index.ts` 正确导入 receiver

## 5. 验证

- [x] 5.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 5.2 运行 `pnpm build` 确认构建成功
- [x] 5.3 `grep -r "from.*cli" src/daemon/` 返回空
- [ ] 5.4 `grep -r "from.*daemon" src/cli/` 返回空

## 依赖关系

```
任务 1 (分析)
    │
    ▼
任务 2 (建立 receiver)
    │
    ▼
任务 3 (迁移函数) → 任务 4 (删除倒灌)
    │
    ▼
任务 5 (验证)
```

## 备注

- 原始 CLI handlers 仍存在于 `src/cli/handlers/`，待后续清理
- 当前 daemon 已不再导入任何 CLI 代码，物理隔离已实现
