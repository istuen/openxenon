## 1. 准备阶段

- [x] 1.1 确认当前 `daemon/api/` 和 `daemon/ipc/` 两套路由并存
- [x] 1.2 确认 `ipc/handlers/` 注册到 `ipc/router`
- [x] 1.3 确认 `api/socket-server.ts` 使用 `api/router`

## 2. 删除 daemon/api/

- [x] 2.1 删除 `src/daemon/api/` 目录及所有文件
- [x] 2.2 确认删除后 `src/daemon/` 下只剩 `ipc/` 等正统目录

## 3. 修改 server.ts 引用

- [x] 3.1 修改 `src/server.ts` 从 `./daemon/ipc/server` 引入 `startApiServer`
- [x] 3.2 确认 `daemon/ipc/server.ts` 导出 `startApiServer`, `stopApiServer`

## 4. 验证导入

- [x] 4.1 搜索所有 `from.*daemon/api` 的 import 语句
- [x] 4.2 确认 `daemon/ipc/handlers.ts` 正确导入 handlers
- [x] 4.3 确认所有 handler 注册到 `ipc/router`

## 5. 编译验证

- [x] 5.1 执行 `pnpm run typecheck` 验证类型检查
- [x] 5.2 执行 `pnpm run build` 验证编译通过

## 6. 功能验证

- [x] 6.1 重启 daemon
- [x] 6.2 发送 IPC 请求测试 `arsenal-search` 路由
- [x] 6.3 验证返回 `200` 而不是 `404`