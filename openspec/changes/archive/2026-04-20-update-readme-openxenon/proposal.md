## Why

当前 README 基于旧的 Xenonix 架构设计，需要根据《OpenXenon（修订版）》文档进行全面更新，引入新的核心概念和架构术语。

## What Changes

- 更新核心命名：从 `Xenonix` 改为 `OpenXenon` 或 `Xn` 前缀
- 更新目录结构说明：`.xenonix` → `.oxn`
- 更新数据库文件命名：`project.db` → `space.oxn`，`core.db` → `core.oxn`
- 更新通信协议说明：HTTP → Unix Socket
- 引入四大核心原语：XnStage、XnProof、XnBlueprint、XnSample
- 引入四大命脉接口：XnStore、XnSandbox、XnRadar、XnTransport
- 引入四层防御体系说明
- 更新系统交互流程图

## Capabilities

### New Capabilities

- 无新 capabilities（仅文档更新）

### Modified Capabilities

- 无（README 是文档，不涉及 spec）

## Impact

- 仅修改 README.md 文档
- 可能需要更新部分文档文件
