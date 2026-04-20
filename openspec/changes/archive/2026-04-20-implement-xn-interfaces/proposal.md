## Why

README 定义了四大命脉接口和核心类型接口（XnTask、XnBlueprint、XnStage 等），需要与现有代码对齐并更新字段命名。现有 `src/types/` 目录下已有基础类型，需扩展为 README 定义的标准接口。

## What Changes

- 实现四大命脉接口定义（新增）
- 扩展现有核心类型（更新字段命名以匹配 README）
- 对齐 Xn* 前缀命名规范

## Capabilities

### New Capabilities

- `xn-store-interface`: XnStore 状态真理源接口定义（新增）
- `xn-sandbox-interface`: XnSandbox 进程沙箱接口定义（新增）
- `xn-radar-interface`: XnRadar 暗线雷达接口定义（新增）
- `xn-transport-interface`: XnTransport 控制通道接口定义（新增）

### Modified Capabilities

- `xn-core-types`: 更新现有类型字段
  - `Task` → `XnTask`: 添加 `xnAction` 字段
  - `Step` → `XnStage`: 添加 `xnSpec`、`xnAction`、`xnSample` 字段
  - `Proof` → `XnProof`: 添加 `type` 字段
  - 状态类型：`TaskStatus` → `XnTaskStatus`、`StepStatus` → `XnStageStatus`
- `xn-blueprint`: 新增，封装 `Playbook`
- `xn-spec`: 新增，定义约束
- `xn-action`: 新增，定义执行动作

## Impact

- 修改 `src/types/task.ts`
- 修改 `src/types/playbook.ts`
- 修改 `src/types/proof.ts`
- 修改 `src/types/core.ts`
- 新增 `src/runtimes/interfaces/`