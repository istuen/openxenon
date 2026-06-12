## Why

当前 README.md 过于臃肿（2700+ 行），包含过多实现细节（Skill 系统、技术栈、Mermaid 流程图），而 docs/manual/ 已有部分内容但命令已过时。需要精简 README、重组 manual，保持单一真相源。

## What Changes

1. **精简 README.md**
   - 目标：< 150 行
   - 保留：一句话简介、快速开始、CLI 速查、文档导航、从源码构建
   - 删除：Skill 系统（AI 读源码）、核心运转机制（迁移 manual）、Mermaid 流程图（迁移 manual）、技术栈（迁移 architecture.md）

2. **重组 docs/manual/**
   - 清空并重建 02-concepts.md：合并"核心原语"+"术语词典"
   - 清空并重建 03-lifecycle.md：完整交互生命周期 + Mermaid 流程图
   - 确认 05-arsenal.md 内容有效性（过时则清空）
   - 确认 06-troubleshooting.md 内容有效性
   - 重命名 03-cli.md → 04-cli-ref.md
   - 新建 07-dev.md：从源码构建等开发文档

3. **确立文档引用关系**
   - README → docs/manual/ + docs/architecture.md
   - docs/manual/03-lifecycle.md 末尾引用 docs/architecture.md
   - docs/architecture.md 是唯一架构权威，不在 manual 中建精简版

4. **删除多余内容**
   - Skill 系统描述不入文档（Skill 是给 AI 的指令，AI 读源码）
   - 不维护术语词典独立文件（合并入 concepts）

## Capabilities

### New Capabilities
- `docs-structure`: 文档结构重组，明确引用关系

### Modified Capabilities
- (无 spec 级变更，仅文档重组)

## Impact

- **涉及文件**:
  - README.md (重写)
  - docs/manual/02-concepts.md (重建)
  - docs/manual/03-lifecycle.md (重建)
  - docs/manual/04-cli-ref.md (原 03-cli.md 重命名)
  - docs/manual/05-arsenal.md (确认/清空)
  - docs/manual/06-troubleshooting.md (确认/清空)
  - docs/manual/07-dev.md (新建)
  - docs/manual/README.md (更新导航)

- **不变**:
  - docs/architecture.md (唯一架构权威)
