## Why

Infra 层是"图灵机边界"，是唯一可以触碰硬件的层。但当前 `infra/probes/` 可能依赖了 Kernel 层，造成**反向依赖**。

**问题**：
- Probe 能力层不应该被 Kernel 的类型/接口污染
- Probe 应该独立于 Kernel 存在

## What Changes

1. 确认 `infra/probes/*.ts` 不导入任何 `src/kernel/` 模块
2. Probe 类型定义保持在 `infra/probes/types.ts`
3. Kernel 的 `evaluator.ts` 只消费 Infra 的 probe 接口

## Impact

- Infra 层完全独立
- Probe 可以在不同 Kernel 版本间复用
- 符合"三权分立"架构

## High Risk

- 低风险，纯接口确认
