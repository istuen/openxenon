## Why

当前 `dev` 分支混杂了 MVP 0.1 必需功能和未来版本（post-MVP）的探索性代码。MVP 0.1 的目标是验证"双轨并行 + 物理隔离"机制的可工作性，需要一个干净、可聚焦的代码库。将未来功能存档到独立分支，既保留代码历史，又让 dev 分支保持精简。

## What Changes

1. **创建 `archive/post-mvp-features` 分支**
   - 基于当前 `dev` HEAD 创建
   - 包含所有"未来功能"代码的完整快照
   - 推送到远程仓库（如果有）作为长期归档

2. **评估并识别 MVP 0.1 范围外的代码**
   - 检查 `src/` 下哪些模块、API handlers、builtin proofs 属于"未来功能"
   - 常见的未来功能包括：Sample 偏差流、Draft 演化流、提案流程、复杂 DAG 编排、Git 分支沙箱

3. **精简 dev 分支**
   - 删除或注释 MVP 0.1 不需要的功能代码
   - 保留核心的双轨验证、staging 缓冲、Blueprint YAML 存储机制
   - 确保 MVP 0.1 仍能完整运行 Task 生命周期

4. **提交变更**
   - 在 `dev` 分支提交精简后的代码，打上 `v0.1.0-alpha` tag
   - `archive/post-mvp-features` 分支作为历史参考保留

## Capabilities

### New Capabilities
（无 - 本次为代码管理操作，不引入新功能）

### Modified Capabilities
（无 - 不涉及 spec 级别变更）

## Impact

- **Git 分支**：`dev` 分支将更精简，`archive/post-mvp-features` 保留完整历史
- **代码清理**：删除未使用的 builtin proofs、API handlers、CLI 命令
- **测试**：需要确保精简后的 MVP 0.1 测试仍然全部通过
- **文档**：README-v2.md 描述的是目标架构，可能需要同步更新
