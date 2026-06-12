## 1. Kernel 新增枚举

- [x] 1.1 在 `src/kernel/enums.ts` 添加 `OxnErrorCode` 枚举
- [x] 1.2 在 `src/kernel/enums.ts` 添加 `ErrorCategory` 枚举
- [x] 1.3 确认 kernel/index.ts 导出这两个枚举

## 2. Daemon 响应格式统一

- [x] 2.1 修改 `src/daemon/ipc/server.ts` 的 socket 写入逻辑
- [x] 2.2 成功响应: `{ ok: true, data: ... }`
- [x] 2.3 错误响应: `{ ok: false, error: { code, message, category, recoverable, suggestion } }`
- [x] 2.4 测试 Daemon 错误响应格式

## 3. CLI 入口铁幕

- [x] 3.1 确认 `src/cli/entry.ts` 存在（检查是否需要新建）
- [x] 3.2 实现 `formatError()` 函数
- [x] 3.3 修改 `main()` 函数，添加 try-catch
- [x] 3.4 确保所有输出都是 JSON

## 4. 验证

- [x] 4.1 执行 `pnpm run typecheck`
- [x] 4.2 执行 `pnpm run build`
- [x] 4.3 测试 Daemon 不运行时 CLI 输出 JSON（不是堆栈）