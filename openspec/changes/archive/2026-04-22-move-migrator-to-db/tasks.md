## 1. 移动文件

- [x] 1.1 将 `src/core/migrator.ts` 移动到 `src/db/migrator.ts`
- [x] 1.2 将 `src/migrations/` 目录移动到 `src/db/migrations/`

## 2. 更新导入路径

- [x] 2.1 更新 `src/runtimes/bun.adapter.ts` 中的 import 路径
- [x] 2.2 更新 `tests/core/migrator.test.ts` 中的 import 路径

## 3. 验证

- [x] 3.1 运行 `bun run build` 确保编译通过
- [x] 3.2 运行 `bun test` 确保测试通过
- [x] 3.3 运行 `bun run typecheck` 确保类型正确
