## ADDED Requirements

### Requirement: README.md 结构精简

README.md 文件应满足以下要求：

1. 总行数不超过 150 行
2. 必须包含以下章节：
   - 一句话简介
   - 快速开始（3-5 步）
   - CLI 速查（核心命令示例）
   - 文档导航（指向 docs/manual/ 和 docs/architecture.md）
   - 从源码构建
3. 必须删除以下内容：
   - Skill 系统描述（Skill 是 AI 指令，AI 读源码）
   - 核心运转机制详细说明（迁移至 docs/manual/）
   - Mermaid 流程图（迁移至 docs/manual/）
   - 详细技术栈说明（参考 docs/architecture.md）

#### Scenario: README 结构验证
- **WHEN** 检查 README.md 总行数
- **THEN** 行数 < 150

#### Scenario: 快速开始章节存在
- **WHEN** 检查 README.md 包含快速开始章节
- **THEN** 包含 `## 快速开始` 或类似标题，且步骤可执行

#### Scenario: CLI 速查存在
- **WHEN** 检查 README.md 包含 CLI 速查
- **THEN** 包含主要命令示例（oxn help 等）

### Requirement: docs/manual/ 结构重组

docs/manual/ 目录应满足以下结构：

| 文件 | 内容要求 |
|------|---------|
| 01-intro.md | 保持现有内容不变 |
| 02-concepts.md | 合并术语词典（核心原语 + 术语） |
| 03-lifecycle.md | 完整交互生命周期 + Mermaid 流程图 |
| 04-cli-ref.md | 原 03-cli.md 重命名，全 CLI 参考 |
| 05-arsenal.md | 确认内容有效性（过时则清空） |
| 06-troubleshooting.md | 确认内容有效性 |
| 07-dev.md | 新建，包含从源码构建等开发文档 |

不得存在 04-architecture.md（architecture.md 是唯一架构权威）

#### Scenario: manual 文件数量验证
- **WHEN** 检查 docs/manual/ 目录
- **THEN** 存在 7 个 .md 文件（01-07）

#### Scenario: 无架构重复文件
- **WHEN** 检查 docs/manual/ 不存在 04-architecture.md
- **THEN** docs/manual/04-architecture.md 不存在

### Requirement: 文档引用关系

文档之间应建立清晰的引用关系：

1. README.md 应引用 docs/manual/ 和 docs/architecture.md
2. docs/manual/03-lifecycle.md 末尾应引用 docs/architecture.md
3. docs/architecture.md 是唯一架构权威，不在 manual 中重复

#### Scenario: README 引用 manual
- **WHEN** 检查 README.md
- **THEN** 包含指向 docs/manual/ 的链接

### Requirement: Skill 系统文档删除

Skill 系统相关描述应从文档中删除：

1. 不得在 README 或 manual 中描述 Skill 实现细节
2. Skill 是给 AI 的指令，AI 直接读取 src/skills/*.ts
3. 人类无需 Skill 实现文档

#### Scenario: Skill 文档已删除
- **WHEN** 检查 README.md 和 docs/manual/
- **THEN** 不包含 Skill 系统详细说明章节

### Requirement: docs/manual/07-dev.md 新建

docs/manual/07-dev.md 应包含：

1. 从源码构建步骤
2. 开发环境说明
3. 贡献流程（如果有）

#### Scenario: 07-dev.md 存在
- **WHEN** 检查 docs/manual/07-dev.md
- **THEN** 文件存在且包含从源码构建说明