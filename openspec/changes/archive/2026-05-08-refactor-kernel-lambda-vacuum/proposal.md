## Why

当前 `src/kernel/lib/task-trace.ts` 是一只**"辐射狗"**——表面看是返回 `TaskTraceState` 的纯函数，实际内部调用了 `appendFileSync` 执行文件系统写入。这违反了**Kernel 是兰姆达真空**的宪法原则。

类似的架构腐败还包括：
- `kernel/probes/executor.ts` 硬编码 switch 路由，而非数据驱动
- `kernel/built-in-proofs-registry.ts` 硬编码探针注册表
- `infra/staging/staging-manager.ts` 反向依赖 Kernel

这些问题导致：
1. **Kernel 不再是纯函数库**，无法单独进行单元测试
2. **架构边界模糊**，工程师可能无意间引入更多副作用
3. **违反三大公理**，系统丧失可验证性

## What Changes

### 斩首任务（按依赖排序）

**Phase 1: Kernel 纯函数化（无依赖）**

1. 重构 `kernel/lib/task-trace.ts`
   - 将 `appendFileSync`/`writeFileSync` 驱逐到 `daemon/trace/writer.ts`
   - Kernel 只保留：`buildTraceEvent()` / `reduceTraceEvents()` / `computeNextStage()`
   - 函数签名改为纯函数：`input -> output`，无副作用

2. 重构 `kernel/probes/executor.ts` 为 `kernel/probes/evaluator.ts`
   - 移除硬编码 switch 路由
   - 探针执行逻辑移入 `infra/probes/*.ts`（能力层）
   - Kernel 只做纯函数评判：`evaluate(probeResult) -> verdict`

3. 删除 `kernel/built-in-proofs-registry.ts`
   - 启动时扫描 `src/arsenals/probes/*/canonical.yaml`
   - 在内存中动态构建 `type -> handler` 映射表

**Phase 2: 修正 Infra 反向依赖**

4. 重构 `infra/staging/staging-manager.ts`
   - `taskPath` 改为原始参数传入，不引用 Kernel
   - 删除对 `kernel` 的所有 import

## Impact

- **Kernel 可以单独单元测试**：无 I/O，无 mock 依赖
- **架构宪法可执行**：ESLint 规则可检测 Kernel 中的 I/O import
- **为后续重构奠定基础**：CLI/Daemon 隔离可在此基础上展开

## High Risk

- `task-trace.ts` 被多个模块引用，修改签名需要同步更新所有调用方
- `daemon/trace/writer.ts` 需要作为"唯一写入点"重新设计
- 需要确保 `pnpm run typecheck` 在重构后仍然通过
