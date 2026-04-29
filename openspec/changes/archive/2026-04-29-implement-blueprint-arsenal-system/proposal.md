## Why

OpenXenon 需要建立 Blueprint 模板资产系统，实现 Blueprint 从创建到执行再到归档的完整生命周期管理。当前 Arsenal 系统仅支持 probes、proofs、stages 三种资产类型，缺少对 Blueprint 作为拓扑蓝图资产的完整支持。

## What Changes

- 新增 Blueprint 作为 Arsenal 资产类型（`arsenals/blueprints/`）
- Blueprint 文件结构：纯 JSON，仅包含 `id`, `status`, `topology[]`, `edges[]`
- Stage 引用使用前缀机制：`defaults/<stage-name>` 或 `custom/<stage-name>`
- Task 启动时从 Arsenal 复制 Blueprint 模板到 Task 目录
- Task 结束后工程师确认是否将副本反哺到 Arsenal
- Task 目录下的 Stage 可独立修改，不影响 Arsenal 原版

## Capabilities

### New Capabilities
- `blueprint-arsenal`: Blueprint 模板资产管理系统
- `blueprint-lifecycle`: Blueprint 从模板到执行到归档的完整生命周期
- `stage-references`: Stage 在 Blueprint 中的引用机制（defaults/custom 前缀）

### Modified Capabilities
- `arsenal-asset-types`: 扩展 AssetType 支持 blueprints
- `task-blueprint-binding`: Task 与 Blueprint 的绑定关系

## Impact

- 受影响代码：`src/core/arsenals-loader.ts`、`src/core/arsenals-paths.ts`
- 受影响模块：Arsenal 资产加载系统、Task 生命周期管理
- 新增目录结构：`arsenals/blueprints/<name>/{canonical.json,draft.json,archive/}`