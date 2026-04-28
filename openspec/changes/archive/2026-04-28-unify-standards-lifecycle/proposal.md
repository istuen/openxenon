## Why

OpenXenon 的 Arsenal（武器库）中，Proof/Stage/Blueprint 等工程资产的目录结构不统一，命名混乱（`active`、`draft` 等多种状态并存），导致 CLI 命令和 Core 引擎的状态机逻辑复杂且容易出错。需要建立统一的两态生命周期（DRAFT/CANONICAL），作为所有资产的基础规范。

## What Changes

- 建立 `standards/{probes,proofs,stages}/DRAFT/` 和 `standards/{probes,proofs,stages}/CANONICAL/` 目录结构
- 废弃 `active` 目录，统一使用 `CANONICAL` 标识正式资产
- 将现有 `blueprints/` 下的资产迁移到新结构
- 实现 `oxn standards inspect` 和 `oxn standards promote` 命令
- 统一 Core 引擎中资产加载的路径逻辑

## Capabilities

### New Capabilities

- `standards-lifecycle`: 定义 Arsenal 资产的 DRAFT/CANONICAL 两态生命周期，所有标准资产必须经过此流程

### Modified Capabilities

- 无

## Impact

- 影响 `src/core/` 下资产加载相关模块
- 影响 CLI 命令结构，新增 `oxn standards` 子命令
- 影响现有 `blueprints/` 目录（需迁移到新结构）