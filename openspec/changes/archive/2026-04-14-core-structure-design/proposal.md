## Why

Xenonix 作为一个面向大语言模型的工程化控制引擎，需要一个坚实的架构基础来支撑其核心运转机制。当前项目缺乏明确的目录结构、数据表设计和类型接口定义，这将阻碍后续核心功能的实现。现在进行架构设计，可以为"演化工程意图"、"收敛 AI 推理"、"实现软件交付"三大核心机制奠定物理基础。

## What Changes

- 建立全局物理边界目录结构 (`~/.xenonix/`)
- 建立项目物理边界目录结构 (`<project>/.xenonix/`)
- 设计全局元数据数据库表结构 (`core.db`)
- 设计项目状态数据库表结构 (`project.db` with WAL mode)
- 定义核心 TypeScript 类型接口 (Playbook, Step, Spec, Proof, Task 等)
- 设计文件监听机制相关的数据结构
- 建立双轨验证机制的数据模型

## Capabilities

### New Capabilities

- `global-structure`: 全局物理边界目录结构与元数据管理能力
- `project-structure`: 项目物理边界目录结构与状态管理能力
- `database-schema`: SQLite 数据库表结构设计能力
- `type-definitions`: TypeScript 核心类型接口定义能力

### Modified Capabilities

无现有能力需要修改。

## Impact

- 影响整个项目的物理结构设计
- 影响后续所有核心功能的实现路径
- 影响数据持久化策略和并发控制机制
- 影响类型系统在整个项目中的使用方式
