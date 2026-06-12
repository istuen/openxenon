## Why

当前 `src/types/playbook.ts` 混装了多个概念：Step（遗留）、XnStage、XnBlueprint。违反单一职责原则，且不便于模块化。需拆分为独立文件。

## What Changes

- 从 playbook.ts 拆分 XnStage 到独立文件
- 从 playbook.ts 拆分 XnBlueprint 到独立文件
- 保留 Step（遗留兼容）

## Capabilities

### New Capabilities

- `xn-stage-type`: 独立的 XnStage 类型文件
- `xn-blueprint-type`: 独立的 XnBlueprint 类型文件

### Modified Capabilities

- `xn-playbook-types`: 仅保留 Legacy 的 Step 和 Playbook

## Impact

- 新增 `src/types/xn-stage.ts`
- 新增 `src/types/xn-blueprint.ts`
- 修改 `src/types/playbook.ts`
- 修改所有 import 引用