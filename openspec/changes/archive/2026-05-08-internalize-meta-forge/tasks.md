## 1. 创建内置 Forge 资产

- [x] 1.1 创建 `src/forges/meta-probe/canonical.yaml`
- [x] 1.2 创建 `src/forges/meta-stage/canonical.yaml`
- [x] 1.3 创建 `src/forges/meta-proof/canonical.yaml`
- [x] 1.4 创建 `src/forges/meta-blueprint/canonical.yaml`

## 2. 更新 oxn init

- [x] 2.1 更新 `src/commands/init.ts` 复制 `src/forges/meta-*` 到 `.openxenon/forges/`

## 3. 更新加载逻辑

- [x] 3.1 更新 `oxn-forge.ts` 中的 `loadMetaBlueprintFromProject()` 从 `.openxenon/forges/` 加载
- [x] 3.2 保留 fallback 到默认约束的机制
- [x] 3.3 更新 `forge.ts` CLI 命令使用相同加载逻辑

## 4. 清理

- [x] 4.1 删除 `src/core/blueprints/meta-forge.ts`
- [x] 4.2 删除空的 `src/core/blueprints/` 目录

## 5. 验证

- [x] 5.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 5.2 运行测试确认通过（4个预先存在的失败测试）
- [x] 5.3 手动测试 `oxn init && oxn forge probe` 显示正确约束