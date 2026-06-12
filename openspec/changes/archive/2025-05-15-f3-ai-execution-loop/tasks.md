## 1. 修改 taskNext 返回值

- [ ] 1.1 修改 `NextResult` 接口，移除 `proof` 字段，添加 `target` 和 `action` 字段
- [ ] 1.2 修改 `taskNext` 函数，从 `frozenBlueprint.stages[stageId]` 提取 `target` 和 `action` 返回
- [ ] 1.3 确认 `taskNext` 不返回 `spec`、`probes`、`proof` 字段

## 2. 实现验证失败阻断

- [ ] 2.1 在 `taskNext` 中添加状态检查：如果当前 Stage 状态为 `FAILED`，抛出错误拒绝推进
- [ ] 2.2 错误消息格式：`"Stage \"<name>\" verification failed. Abort or retry."`
- [ ] 2.3 测试：验证失败后调用 `taskNext` 必须抛出错误

## 3. 确认 taskVerify 从 frozen.yaml 读取

- [ ] 3.1 确认 `taskVerify` 已实现从 `blueprint.frozen.yaml` 读取 probes（第 6 步已完成）
- [ ] 3.2 确认 `taskVerify` 在 probe 失败时正确更新 Stage 状态为 `FAILED`
- [ ] 3.3 端到端测试：submit -> next -> verify(failed) -> next(rejected)

## 4. 测试验证

- [ ] 4.1 运行 `npm test` 确保所有测试通过
- [ ] 4.2 端到端手动测试：submit blueprint -> next -> verify -> next 阻断
- [ ] 4.3 确认 AI 只能看到 `target` + `action`，看不到 `probes` 和 `spec`