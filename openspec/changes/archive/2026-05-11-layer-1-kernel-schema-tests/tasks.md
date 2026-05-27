## 1. 创建测试基础设施

- [x] 1.1 创建 `tests/kernel/schemas/` 目录结构
- [x] 1.2 创建 `tests/kernel/schemas/probe.test.ts`
- [x] 1.3 创建 `tests/kernel/schemas/proof.test.ts`
- [x] 1.4 创建 `tests/kernel/schemas/stage.test.ts`

## 2. Probe Schema 测试

- [x] 2.1 ProbeDefinitionSchema 合法定义通过校验
- [x] 2.2 ProbeDefinitionSchema 拒绝 Invocation 格式
- [x] 2.3 ProbeInvocationSchema 合法调用通过校验
- [x] 2.4 ProbeInvocationSchema 拒绝 Definition 格式
- [x] 2.5 Definition/Invocation 格式互斥验证

## 3. Proof Schema 测试

- [x] 3.1 ProofDefinitionSchema 合法定义通过校验
- [x] 3.2 ProofDefinitionSchema 拒绝 Invocation 格式
- [x] 3.3 ProofInvocationSchema 合法调用通过校验
- [x] 3.4 ProofInvocationSchema 拒绝 Definition 格式

## 4. Stage Schema 测试

- [x] 4.1 StageDefinitionSchema 合法定义通过校验
- [x] 4.2 StageDefinitionSchema 拒绝 Invocation 格式
- [x] 4.3 StageInvocationSchema 合法调用通过校验
- [x] 4.4 StageInvocationSchema 拒绝 Definition 格式

## 5. 验证与修正

- [x] 5.1 运行 `pnpm test` 确认所有测试通过
- [x] 5.2 根据测试结果修正 Schema（如有 bug）
- [x] 5.3 确认修正后所有测试仍然通过

## Schema 修正记录

- `src/kernel/schemas/stage.ts`: 添加 `.strict()` 到 StageInvocationSchema 和 StageDefinitionSchema，确保 Definition/Invocation 格式互斥