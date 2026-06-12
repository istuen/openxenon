## Why

**文档可以是假的，代码可以是错的，但 `ProbeDefinitionSchema.parse(input)` 要么通过要么抛异常——这是唯一切实可信的真相源。**

当前问题：
- CLI 命令和文档对不上（`oxn standards` 不存在）
- Probe Definition vs Invocation 格式混淆
- 无任何测试基础设施（tests/ 目录不存在）

执行路径：以 Layer 1 Kernel Schema 测试为锚点，依次对齐 CLI 和文档。

## What Changes

1. **创建 Layer 1 测试基础设施**
   - 创建 `tests/kernel/schemas/` 目录
   - 为每个 Schema 编写测试文件

2. **Probe Schema 测试**
   - `ProbeDefinitionSchema`: 合法定义通过，非法调用拒绝
   - `ProbeInvocationSchema`: 合法调用通过，非法定义拒绝
   - 交叉验证：Definition 和 Invocation 格式互拒绝

3. **Proof Schema 测试**
   - `ProofDefinitionSchema`: 合法定义通过
   - `ProofInvocationSchema`: 合法调用通过

4. **Stage Schema 测试**
   - `StageDefinitionSchema`: 合法定义通过
   - `StageInvocationSchema`: 合法调用通过

5. **Schema 修正**（基于测试暴露的问题）
   - 用测试结果修正 Schema
   - 用验证后的 Schema 修正 CLI
   - 用验证后的 Schema 修正文档

## Capabilities

### New Capabilities
- `kernel-schema-tests`: Kernel 纯函数测试基础设施

### Modified Capabilities
- (无 spec 级变更，仅测试基础设施)

## Impact

- **涉及文件**:
  - `tests/kernel/schemas/probe.test.ts` (新建)
  - `tests/kernel/schemas/proof.test.ts` (新建)
  - `tests/kernel/schemas/stage.test.ts` (新建)

- **不变**:
  - 文档结构（已在 restructure-readme-and-manual 中完成）
  - CLI 命令（待 Layer 1 测试通过后修正）