## Why

OpenXenon 需要一个极简、扁平、可演化的数据结构来描述 Task-Blueprint-Stage。依据"将 AI 视为不可信算力端"的哲学，所有外部输入都必须经过机械级校验。

## What Changes

- Task 使用复数 blueprints（1 个 Task 对应 N 个 Blueprint）
- Stage 是原子工序节点
- 使用 Zod 进行运行时校验

## Capabilities

### New Capabilities
- `task-blueprint-stage-schema`: 使用 Zod 定义 Task-Blueprint-Stage Schema

### Modified Capabilities
- 无

## Impact

- 新增 `src/types/schemas/` 目录存放 Zod Schema
