## 1. scanBuiltin 迁移

- [x] 1.1 在 `src/arsenals/loader.ts` 实现 `loadBuiltinAssets(type)` 函数
- [x] 1.2 迁移 BUILTIN_PROBES 和 BUILTIN_PARTS 的 JSON 序列化逻辑
- [x] 1.3 修改 `scanArsenalsDirectory()` 组合内置资产

## 2. promoteStandard 迁移

- [x] 2.1 创建 `src/arsenals/promoter.ts`
- [x] 2.2 实现 `promoteToCanonical(fromPath)` 函数
- [x] 2.3 迁移 mkdirSync、writeFileSync、unlinkSync 等 fs 操作
- [x] 2.4 移除 `src/infra/loader.ts` 中的 `promoteStandard()` 函数

## 3. CLI 更新

- [x] 3.1 修改 `src/cli/arsenal-promote.ts`，使用 `arsenals/promoter.ts`
- [x] 3.2 更新 import 语句

## 4. 验证

- [x] 4.1 运行 `pnpm build` 确保无编译错误
- [x] 4.2 运行 `pnpm test` 确保测试通过
- [x] 4.3 验证 Infra/Loader 接口符合设计