## 1. 核心实现：task.ts 文件操作

- [x] 1.1 实现 `taskSubmit(blueprintPath, cwd)` - 读取 YAML，生成 task-id，写入 blueprint.yaml 和 state.json
- [x] 1.2 实现 `taskNext(taskId, cwd)` - 读 state.json，找 PENDING stage，推进为 RUNNING
- [x] 1.3 实现 `taskVerify(taskId, stageId, cwd)` - 执行 Probes，更新 state.json 和 trace.yaml
- [x] 1.4 实现 `taskStatus(taskId, cwd)` - 读 state.json，输出当前状态

## 2. Probe 执行层：Infra + Kernel 协作

- [x] 2.1 编写 `executeProbe(probe: ProbeInvocation, context: ProbeContext)` - 根据 type 分发到 Infra 能力层
- [x] 2.2 验证 Kernel/probes/evaluator.ts 无 I/O 导入（纯函数）
- [x] 2.3 实现 trace.yaml 追加写入函数

## 3. Step Manifest 写入

- [x] 3.1 实现 `writeStepManifest(taskId, stageId, results, cwd)` - 将步骤级状态写入 step-manifest.json

## 4. CLI 命令集成

- [x] 4.1 在 `src/cli/commands/task.ts` 中调用上述函数
- [x] 4.2 验证 CLI 无状态维护，纯编排

## 5. 验证与测试

- [x] 5.1 写 Layer 2 集成测试：submit → next → verify → status 完整流程
- [x] 5.2 运行 `pnpm typecheck` 确保无类型错误
- [x] 5.3 运行 `pnpm test` 确保所有测试通过