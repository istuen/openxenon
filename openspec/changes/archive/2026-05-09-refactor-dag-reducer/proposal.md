## Why

`src/kernel/schemas/dag-validator.ts` 当前包含副作用（Promise, async），但处于 Kernel 层。Kernel 必须是"兰姆达真空"——纯函数，无 I/O，无副作用。

**问题**：
- DAG 验证器当前是 async 函数，有隐式的状态依赖
- 违反了 Kernel 层的纯函数约束

## What Changes

1. 将 `dag-validator.ts` 改造为**纯函数**
2. 返回类型从 `Promise<DAGValidationResult>` 改为 `DAGValidationResult`
3. 所有依赖数据通过参数传入，不产生副作用

## Impact

- Kernel 层完全无副作用
- DAG 验证可被缓存、测试、重放
- 符合"图灵机边界"架构

## High Risk

- 需要确认 DAG 验证的所有调用方都已准备好处理同步结果
