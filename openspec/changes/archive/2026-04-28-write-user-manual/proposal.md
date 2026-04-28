## Why

OpenXenon 目前缺乏完整的用户使用手册，工程师难以理解系统的核心概念（Blueprint、Arsenal、Stage、Proof）和 CLI 命令的正确用法。编写使用手册可以帮助新用户快速上手，同时也作为系统架构和设计决策的权威文档。

## What Changes

- 编写 OpenXenon 核心概念介绍（Blueprint、Arsenal、Stage、Proof）
- 编写 CLI 命令使用指南（oxn init、oxn task、oxn standards、oxn prove 等）
- 编写标准资产生成流程（/oxn-forge → Draft → CANONICAL）
- 编写故障排查和最佳实践
- 生成 markdown 格式的文档输出到 `docs/` 目录

## Capabilities

### New Capabilities

- `user-manual`: 面向工程师的完整使用手册，包含核心概念、CLI 命令参考、资产生成流程

### Modified Capabilities

- 无

## Impact

- 生成 `docs/manual/` 目录下的 markdown 文档
- 不影响任何代码逻辑