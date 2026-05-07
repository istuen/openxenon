## 1. 核心实现

- [x] 1.1 修改 `src/core/manifest.ts` 的 `writeStepManifest()` - 添加 .tmp + rename() 逻辑
- [x] 1.2 添加 Windows 平台兼容处理（unlinkSync 先删除目标）
- [x] 1.3 添加写入失败时的 .tmp 清理逻辑（try-catch + finally）
- [x] 1.4 修改 `createEmptyStepManifest()` - 删除 timestamp 字段

## 2. 调用方检查

- [x] 2.1 检查 `src/api/handlers/task-submit.ts` 中 createEmptyStepManifest 的调用
- [x] 2.2 检查 `src/api/handlers/task-start.ts` 中 createEmptyStepManifest 的调用
- [x] 2.3 检查 `tests/core/utilities.test.ts` 中 StepManifest 结构的测试期望

## 3. 验证

- [x] 3.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 3.2 运行测试确认通过（4个预先存在的失败测试）
- [ ] 3.3 手动测试：写入 manifest → 检查 .tmp 文件被正确清理 → 确认目标文件内容正确
