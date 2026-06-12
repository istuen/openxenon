## 1. 移除冗余状态检查

- [x] 1.1 修改 `src/commands/arsenal-promote.ts:68-72` - 将 `asset.state !== 'draft'` 改为 `!asset.path.includes('/draft/')`
- [x] 1.2 修改 `src/core/arsenals-loader.ts:175-177` - 将 `asset.state !== 'draft'` 改为 `!fromPath.includes('/draft/')`

## 2. 验证

- [x] 2.1 运行 `pnpm run typecheck` 确认无类型错误（无新增错误）
- [x] 2.2 运行测试确认通过（测试文件有预先存在的问题，但测试全部通过）
- [x] 2.3 手动测试：创建 draft 资产 → `oxn arsenal promote` → 确认 canonical 目录出现对应文件
