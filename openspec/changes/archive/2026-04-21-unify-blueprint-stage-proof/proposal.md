## Why

代码架构与 README 规范不一致，需要统一：
- `playbook` → `blueprint`
- `xnProof` → `proof`
- `Step` → `Stage`

## What Changes

- `Task.blueprint` 保持不变 (已使用 Blueprint)
- `Stage.xnProof` → `Stage.proof`
- DB schema: `playbook` → `blueprint`
- 删除 `Step` 类型，统一使用 `Stage`

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `type-unification`: 类型与字段统一

## Impact

- `src/types/stage.ts`
- `src/types/blueprint.ts`
- `src/types/task.ts`
- `src/db/schema/project.ts`
- `src/db/operations/tasks.ts`
- 测试文件