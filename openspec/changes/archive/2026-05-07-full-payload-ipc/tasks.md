## 1. CLI 命令更新

- [ ] 1.1 更新 `src/commands/api/step-start.ts` - 添加 `process.cwd()` 作为第5参数
- [ ] 1.2 更新 `src/commands/api/step-verify.ts` - 添加 `process.cwd()` 作为第5参数
- [ ] 1.3 更新 `src/commands/api/task-trace.ts` - 将 taskId 从 query param 移到 body

## 2. Handler 签名更新

- [ ] 2.1 更新 `src/api/handlers/step-start.ts` - 移除 `_db: Database` 参数
- [ ] 2.2 更新 `src/api/handlers/step-verify.ts` - 移除 `_db: Database` 参数
- [ ] 2.3 更新 `src/api/handlers/task-start.ts` - 移除 `_db: Database` 参数
- [ ] 2.4 更新 `src/api/handlers/task-submit.ts` - 移除 `_db: Database` 参数
- [ ] 2.5 更新 `src/api/handlers/task-stop.ts` - 移除 `_db: Database` 参数
- [ ] 2.6 更新 `src/api/handlers/task-trace.ts` - 移除 `_db: Database` 参数，调整 body 解析
- [ ] 2.7 更新 `src/api/handlers/task-status.ts` - 移除 `_db: Database` 参数
- [ ] 2.8 更新 `src/api/handlers/task-next.ts` - 移除 `_db: Database` 参数
- [ ] 2.9 更新 `src/api/handlers/fs-execute.ts` - 移除 `_db: Database` 参数

## 3. 验证

- [ ] 3.1 运行 `pnpm run typecheck` 确认无类型错误
- [ ] 3.2 运行测试确认通过
- [ ] 3.3 手动测试完整的 task 生命周期：task-new → task-start → step-start → step-verify → trace
