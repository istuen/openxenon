## 1. 删除废弃命令文件

- [x] 1.1 删除 `src/commands/draft.ts`
- [x] 1.2 删除 `src/commands/force-pass.ts`
- [x] 1.3 删除 `src/commands/rollback.ts`
- [x] 1.4 删除 `src/commands/inspect.ts`
- [x] 1.5 删除 `src/commands/trace.ts`
- [x] 1.6 删除 `src/commands/api.ts`（聚合命令）
- [x] 1.7 删除 `src/commands/proof-list.ts`
- [x] 1.8 删除 `src/commands/api/base.ts` 和 `src/commands/api/proofs-list.ts`

## 2. 更新导出

- [x] 2.1 更新 `src/commands/index.ts` 移除废弃导出
- [x] 2.2 更新 `src/cli.ts` 移除废弃命令引用

## 3. 验证

- [x] 3.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 3.2 运行测试确认通过（4个预先存在的失败测试）
