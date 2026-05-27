## 1. 修改 Schema

- [x] 1.1 修改 `src/kernel/schemas/proof.ts` 中 ProofInvocationSchema.probeRefs 类型
- [x] 1.2 导入 ProbeInvocationSchema

## 2. 更新测试

- [x] 2.1 更新 `tests/kernel/schemas/proof.test.ts` 添加新场景测试
- [x] 2.2 测试 probeRefs 接受内联 ProbeInvocation
- [x] 2.3 测试 probeRefs 拒绝 string（旧的 string[] 格式）
- [x] 2.4 测试 probeRefs 拒绝 Definition 格式

## 3. 验证

- [x] 3.1 运行 `pnpm test` 确认所有测试通过
- [x] 3.2 运行 `pnpm typecheck` 确认无类型错误
- [x] 3.3 确认现有 Probe/Proof/Stage 测试仍然通过