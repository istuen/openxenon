## 1. 迁移 part-resolver.ts

- [x] 1.1 创建 `src/work/` 目录
- [x] 1.2 移动 `kernel/lib/part-resolver.ts` → `work/part-resolver.ts`
- [x] 1.3 更新 `kernel/index.ts` 移除相关导出
- [x] 1.4 检查 work/part-resolver.ts 的 import 路径是否正确

## 2. 处理 blueprint-parser.ts

- [x] 2.1 检查 `blueprint-parser.ts` 的使用方 — daemon/trace/writer.ts 使用
- [x] 2.2 如无使用，删除 `kernel/lib/blueprint-parser.ts` — 已迁移到 daemon/trace/blueprint-parser.ts
- [x] 2.3 更新 `kernel/index.ts` 移除相关导出
- [x] 2.4 如有使用，迁移至 CLI 层 — 已迁移至 daemon/trace/blueprint-parser.ts

## 3. 清理 kernel/lib 目录

- [x] 3.1 删除 `kernel/lib/` 下已迁移的文件引用 — blueprint-parser.ts 已删除，part-resolver.ts 已迁移
- [x] 3.2 确认 kernel/lib 只保留纯函数模块

## 4. 验证

- [x] 4.1 运行 `bun test` 确保所有测试通过
- [x] 4.2 运行 `bun run typecheck` 确保无类型错误
- [x] 4.3 确认 `kernel/lib/` 无 I/O 操作 — sandbox-manager.ts 有 fs 操作但属于 task/ 目录非 lib/