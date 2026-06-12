## Why

**当前问题**：`ProofInvocationSchema.probeRefs` 是 `string[]`，只有 Probe 名字，没有参数。

当 Daemon 执行 ProofInvocation 时：
```typescript
// 当前：只有名字
probeRefs: ['exec_exit_zero', 'fs_exists']

// 问题：Daemon 怎么知道 fs_exists 的 path 是什么？
```

**Layer 1 测试暴露**：35/35 测试通过，但测试验证的是 Definition/Invocation **互斥性**，不是 Invocation 的**完备性**。

## What Changes

1. **修改 ProofInvocationSchema.probeRefs 类型**
   - `string[]` → `ProbeInvocation[]`
   - 使 Invocation 内联完整 Probe 参数

2. **更新相关 Schema 和代码**
   - `src/kernel/schemas/proof.ts`: 修改 ProbeRefSchema
   - `src/daemon/` 中使用 probeRefs 的代码

3. **添加 Layer 1 测试验证新行为**
   - 测试 probeRefs 可以包含完整 ProbeInvocation
   - 测试互斥性仍然成立

## Capabilities

### Modified Capabilities
- `kernel-schema-tests`: ProofInvocationSchema.probeRefs 类型变更

## Impact

- **涉及文件**:
  - `src/kernel/schemas/proof.ts` (Schema 修改)
  - `tests/kernel/schemas/proof.test.ts` (添加测试)
  - 使用 probeRefs 的 Daemon 代码（待检查）

- **BREAKING**: Blueprint 中引用 Proof 时，probeRefs 格式从 `string[]` 变为 `{ type, params }[]`