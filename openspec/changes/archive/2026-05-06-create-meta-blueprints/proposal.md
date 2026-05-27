## Why

当前 `meta-forge.ts` 包含多个元蓝图（Probe/Proof/Stage/Blueprint），但都放在一个文件中。不便于管理和单独更新。需要拆分为独立的资产文件，放在 `arsenals/` 目录下。

## What Changes

- 创建 `meta-blueprint-for-probe` Blueprint
- 创建 `meta-blueprint-for-proof` Blueprint
- 创建 `meta-blueprint-for-stage` Blueprint
- 创建 `meta-blueprint-for-blueprint` Blueprint

## Capabilities

### New Capabilities

- `meta-blueprint-for-probe`: 用于生成 Probe 的元蓝图
- `meta-blueprint-for-proof`: 用于生成 Proof 的元蓝图
- `meta-blueprint-for-stage`: 用于生成 Stage 的元蓝图
- `meta-blueprint-for-blueprint`: 用于生成 Blueprint 的元蓝图

## Impact

- `src/core/blueprints/meta-forge.ts` → `arsenals/` 下的独立资产文件
- `oxn-forge` 技能需要更新以读取 arsenal 中的元蓝图