## 1. 重命名路径常量

- [x] 1.1 修改 `src/core/standards-paths.ts` 中的 `STANDARDS_ROOT` → `ARSENALS_ROOT`
- [x] 1.2 修改其他相关常量（ARSENALS_PROBES/PROOFS/STAGES）
- [x] 1.3 更新 `src/core/standards-init.ts` 中的目录创建逻辑

## 2. 更新导入

- [x] 2.1 更新 `src/core/standards-loader.ts` 导入
- [x] 2.2 更新 `src/commands/arsenal-list.ts` 导入
- [x] 2.3 更新 `src/commands/arsenal-inspect.ts` 导入
- [x] 2.4 更新 `src/commands/arsenal-promote.ts` 导入
- [x] 2.5 更新 `src/api/standards-draft.ts` 导入

## 3. 验证

- [x] 3.1 运行 `pnpm build` 验证构建成功
- [x] 3.2 运行 `pnpm typecheck` 验证类型检查通过