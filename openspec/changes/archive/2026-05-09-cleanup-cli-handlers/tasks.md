## 1. 创建 socket-client.ts

- [x] 1.1 创建 `src/cli/socket-client.ts`
- [x] 1.2 实现 `connect()` 函数连接 Unix Socket
- [x] 1.3 实现 `sendToDaemon(message: object)` 函数
- [x] 1.4 实现 `readResponse()` 读取Daemon响应

## 2. 修改 CLI handlers

- [x] 2.1 修改 `src/cli/handlers/task-start.ts` 使用 socket-client
- [x] 2.2 修改 `src/cli/handlers/task-stop.ts` 使用 socket-client
- [x] 2.3 修改 `src/cli/handlers/task-status.ts` 使用 socket-client
- [x] 2.4 修改 `src/cli/handlers/fs-execute.ts` 使用 socket-client
- [x] 2.5 修改其他 handlers (task-trace, task-submit, task-next, task-list-handler, step-start, step-verify, proofs-list, health)

## 3. 移除 CLI 中的 Daemon 导入

- [x] 3.1 `grep -r "from.*daemon" src/cli/` 返回空
- [x] 3.2 所有 daemon 导入已移除

## 4. 验证

- [x] 4.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 4.2 `grep -r "from.*daemon" src/cli/` 返回空
