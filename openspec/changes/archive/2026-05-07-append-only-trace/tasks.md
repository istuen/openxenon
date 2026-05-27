## 1. 类型定义重构

- [x] 1.1 在 `src/types/task-trace.ts` 中添加 `TraceEvent` 联合类型
- [x] 1.2 添加 `TaskTraceState` 接口
- [x] 1.3 保留 `TaskTraceYaml` 类型用于迁移阶段的旧格式解析

## 2. 核心读写函数实现

- [x] 2.1 实现 `appendTraceEvent()` 通用追加函数，注入 timestamp
- [x] 2.2 实现 `appendTaskStart()` - 追加 TASK_START 事件
- [x] 2.3 实现 `appendTaskStatus()` - 追加 TASK_STATUS 事件
- [x] 2.4 实现 `appendStageStart()` - 追加 STAGE_START 事件
- [x] 2.5 实现 `appendStageComplete()` - 追加 STAGE_COMPLETE 事件
- [x] 2.6 实现 `appendProbeResult()` - 追加 PROBE_RESULT 事件
- [x] 2.7 实现 `readTaskTrace()` - 从第一行扫描到最后一行，按 last-state-wins 重建状态
- [x] 2.8 删除 `writeTaskTrace()` 函数（原全量覆写函数）
- [x] 2.9 删除 `createProbeResult()` 中的 timestamp 参数（时间戳由 append 时注入）

## 3. 迁移逻辑

- [x] 3.1 实现 `isOldFormat()` - 检测文件是否为旧格式 JSON
- [x] 3.2 实现 `migrateFromOldFormat()` - 将旧格式 TaskTraceYaml 转换为事件流追加到文件
- [x] 3.3 在 `readTaskTrace()` 入口处调用迁移检测

## 4. 调用方适配（24 处）

### 4.1 API Handlers（9 处）

- [x] 4.1.1 更新 `src/api/handlers/task-submit.ts` - 使用 appendTaskStart
- [x] 4.1.2 更新 `src/api/handlers/task-start.ts` - 使用 appendTaskStart
- [x] 4.1.3 更新 `src/api/handlers/task-stop.ts` - 使用 appendTaskStatus
- [x] 4.1.4 更新 `src/api/handlers/task-status.ts` - 适配新的 readTaskTrace 返回结构
- [x] 4.1.5 更新 `src/api/handlers/task-trace.ts` - 适配新的 readTaskTrace 返回结构
- [x] 4.1.6 更新 `src/api/handlers/task-next.ts` - 适配新的 stage 遍历逻辑
- [x] 4.1.7 更新 `src/api/handlers/step-start.ts` - 使用 appendStageStart
- [x] 4.1.8 更新 `src/api/handlers/step-verify.ts` - 使用 appendProbeResult + appendStageComplete
- [x] 4.1.9 更新 `src/api/handlers/fs-execute.ts` - 适配 append 模式

### 4.2 CLI Commands（6 处）

- [x] 4.2.1 更新 `src/commands/api/task-start.ts` - 传递完整 payload
- [x] 4.2.2 更新 `src/commands/api/task-stop.ts` - 传递完整 payload
- [x] 4.2.3 更新 `src/commands/api/task-next.ts` - 传递完整 payload
- [x] 4.2.4 更新 `src/commands/api/task-list.ts` - 适配 readTaskTrace
- [x] 4.2.5 更新 `src/commands/api/task-status.ts` - 适配 readTaskTrace
- [x] 4.2.6 更新 `src/commands/api/task-new.ts` - 适配 readTaskTrace

### 4.3 其他模块（4 处）

- [x] 4.3.1 更新 `src/watcher/manifest-watcher.ts` - 适配 readTaskTrace
- [x] 4.3.2 更新 `src/verification/dual-track.ts` - 适配 readTaskTrace
- [x] 4.3.3 更新 `src/core/export.service.ts` - 适配 readTaskTrace
- [x] 4.3.4 更新 `src/lib/index.ts` - 导出新的函数

## 5. 测试更新

- [ ] 5.1 更新 `tests/core/utilities.test.ts` 中的 manifest 相关测试
- [ ] 5.2 添加 `tests/lib/task-trace.test.ts` - 测试 append-only 行为
- [ ] 5.3 添加迁移逻辑的测试用例
- [ ] 5.4 更新 `tests/mvp-01.test.ts` - 适配新的 readTaskTrace 结构

## 6. 验证

- [ ] 6.1 运行 `pnpm run typecheck` 确认无类型错误
- [ ] 6.2 运行所有测试确认通过
- [ ] 6.3 手动测试：创建 task → start → step-start → step-verify → 查看 task-trace.yaml 内容
