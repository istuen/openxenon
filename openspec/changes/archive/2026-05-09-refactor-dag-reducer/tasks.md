## 1. 分析当前 dag-validator.ts

- [x] 1.1 读取 `src/kernel/schemas/dag-validator.ts`
- [x] 1.2 列出所有 async 函数和 Promise 返回
- [x] 1.3 确认 DAG 验证逻辑是否可以同步化

## 2. 改造为纯函数

- [x] 2.1 移除 `async` 关键字（已是同步函数）
- [x] 2.2 将 `Promise<DAGValidationResult>` 改为 `DAGValidationResult`（已是同步返回）
- [x] 2.3 将所有内部 Promise 展平为同步逻辑（无内部 Promise）
- [x] 2.4 移除任何 fs/path 等 I/O 导入（无 I/O 导入）

## 3. 更新调用方

- [x] 3.1 找出所有调用 `validateDAG` 的地方 - 只有 kernel/index.ts 导出
- [x] 3.2 更新调用方，移除 `await`（无调用方使用 await）

## 4. 验证

- [x] 4.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 4.2 `grep -n "async.*validateDAG" src/kernel/` 返回空
- [x] 4.3 `grep -n "Promise<.*DAGValidationResult" src/kernel/` 返回空
