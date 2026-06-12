## 1. 分析当前流程

- [ ] 1.1 读取 `daemon/engine/executor.ts`
- [ ] 1.2 确认 ProbeResult 接口在 evaluator 和 infra 是否一致
- [ ] 1.3 找出当前评判逻辑的位置

## 2. 修改 executor.ts 调用 evaluator

- [ ] 2.1 在 `daemon/engine/executor.ts` 添加 evaluator 导入
- [ ] 2.2 修改 `executeStage()` - 调用 `evaluateProbe()` 评判每个 probe
- [ ] 2.3 修改 `executeStage()` - 调用 `reduceProbeResults()` 归约最终 verdict
- [ ] 2.4 返回值添加 verdict 字段

## 3. 更新调用方

- [ ] 3.1 检查 `executeStage()` 的调用方是否需要更新
- [ ] 3.2 如需要，更新返回类型处理

## 4. 验证

- [ ] 4.1 `pnpm run typecheck` 通过
- [ ] 4.2 `pnpm build` 通过
- [ ] 4.3 确认 daemon 仍正常工作
