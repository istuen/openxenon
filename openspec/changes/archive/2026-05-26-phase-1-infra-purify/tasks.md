## 1. 路径常量迁移

- [x] 1.1 修改 `src/infra/paths.ts`，移除 GLOBAL_ARSENALS_*、GLOBAL_FORGES_* 等 8 条业务路径常量
- [x] 1.2 修改 `src/arsenals/paths.ts`，继承 infra/paths.ts 的框架常量并添加业务路径常量
- [x] 1.3 更新引用业务路径的 CLI 文件 (global-arsenal-*.ts)

## 2. Loader 内置逻辑迁移

- [x] 2.1 修改 `src/arsenals/loader.ts`，实现 `loadBuiltinAssets()` 函数
- [x] 2.2 修改 `src/infra/loader.ts`，移除 `scanBuiltin()` 函数
- [x] 2.3 更新 `src/arsenals/loader.ts` 的导出函数，组合内置资产

## 3. compile-cache 净化

- [x] 3.1 修改 `src/infra/compile-cache.ts`，移除 `FrozenBlueprint` 类型依赖
- [x] 3.2 修改 `CacheEntry` 接口，使用 `Record<string, unknown>` 替代 `FrozenBlueprint`
- [x] 3.3 在 L2/L3 添加类型转换逻辑 (如果需要)

## 4. explore collector 净化

- [x] 4.1 修改 `src/infra/explore/collector.ts`，移除 `ExplorationContext` 等业务类型依赖
- [x] 4.2 实现原始数据返回，不绑定业务类型

## 5. 验证

- [x] 5.1 运行 `pnpm build` 确保无编译错误
- [x] 5.2 运行 `pnpm test` 确保测试通过
- [ ] 5.3 手动检查依赖图是否符合 L0-L3 宪法