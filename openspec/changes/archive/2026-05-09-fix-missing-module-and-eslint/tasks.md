## 1. 修复 TypeScript 类型错误

- [x] 1.1 修正 `src/daemon/ipc/handlers/arsenal-search.ts` 中 kernel 导入路径 `../../kernel` → `../../../kernel`
- [x] 1.2 在 `src/infra/loader.ts` 添加 `export type { AssetType }`（改为在 `arsenals/loader.ts` 直接导入）
- [x] 1.3 移除 `src/daemon/registry.ts` 中未使用的 `join` 和 `ARSENALS_ROOT` 导入，修正路径 `../../arsenals/paths` → `../arsenals/paths`

## 2. 验证修复

- [x] 2.1 运行 `pnpm run typecheck` 确保所有类型错误已修复
- [x] 2.2 运行 `pnpm run build` 确保编译通过