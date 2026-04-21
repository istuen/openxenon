## Why

README 定义了 XnStage 作为 Blueprint 的最小执行单元，但当前代码库中尚未实现该模块。需要基于已定义的 `XnStage` 接口实现具体的功能模块，支持 Stage 的状态流转、验证执行和结果记录。

## What Changes

- 实现 XnStage 生命周期管理模块
- 实现 Stage 状态机（pending → running → passed/failed）
- 实现 Stage 与 XnProof 的绑定执行逻辑
- 支持 XnAction 的指令解析
- 支持 XnSample 的样本分支处理

## Capabilities

### New Capabilities

- `xn-stage-executor`: XnStage 执行器，负责调度单个 Stage
- `xn-stage-validator`: Stage 验证结果处理器
- `xn-sample-handler`: XnSample 样本分支处理器
- `xn-stage-dispatcher`: Stage 调度器，管理多个 Stage 的执行顺序

### Modified Capabilities

- 无

## Impact

- 新增 `src/core/stage/` 目录
- 修改 `src/types/playbook.ts` 中的 XnStage 引用
- 影响 Task 执行的流程逻辑