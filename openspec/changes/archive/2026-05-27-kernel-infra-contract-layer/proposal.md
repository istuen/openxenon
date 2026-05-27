## Why

当前 Kernel 与 Infra 之间缺乏显式的契约层，导致类型定义分散在多个模块中，ProbeStrategy（Kernel）和 ProbeHandler（Infra）的配对关系不明确。这违反了"三权分立"架构原则，增加了维护成本和出错风险。

## What Changes

- 新增 `kernel/contracts/` 目录，定义 Probe 相关的核心接口契约
- 统一 `ProbeObservation` 接口，消除 Kernel 与 Infra 的重复定义
- 将 `ProbeStrategy` ↔ `ProbeHandler` 的配对关系显式化
- 重构 `kernel/probes/evaluator.ts`，移除全局状态，改用依赖注入
- 将探索模块的 Raw 类型到 Kernel 类型的转换逻辑移至 Kernel 层
- 清理 `infra/loader.ts` 中重复的 ProbeNamespace、ParsedProbeRef 等定义

## Capabilities

### New Capabilities

- `probe-contract`: 定义 Probe 系统的核心契约层，包括 ProbeObservation 接口、ProbeStrategy 与 ProbeHandler 的配对规范
- `kernel-purity`: 确保 Kernel 层严格遵循纯函数设计，移除全局可变状态

## Impact

- **新增目录**: `src/kernel/contracts/probe.ts`
- **修改文件**:
  - `src/kernel/probes/evaluator.ts` - 移除全局状态
  - `src/kernel/probes/namespace.ts` - 保留并导出给 Infra 使用
  - `src/infra/probes/index.ts` - 使用 kernel/contracts 中定义的接口
  - `src/infra/loader.ts` - 移除重复的类型定义
  - `src/kernel/explore/types.ts` / `infra/explore/collector.ts` - 重构类型转换
- **依赖方向调整**: Infra 层依赖 Kernel 层（通过 contracts），而非各自独立定义
