# 变更日志

本文件记录项目所有重要变更。

## [0.0.20] - 2026-05-17

### 新增
- Hall 仪表盘，支持 Arsenal/Forge 资产展示和详情视图
- Task 探索和状态管理命令
- 增量编译与编译缓存
- Daemon 运行时监控、进程管理和 SSE 事件

### 变更
- 支持目录扫描功能

### 修复
- 解决所有类型检查错误

## [0.0.19] - 2026-05-16

### 新增
- Hall（研讨厅）仪表盘
- Forge/Arsenal 物理分离
- Harvest 和 Probe 判定结果展示

### 变更
- 统一 blueprint/arsenal/forge 文件结构
- 完全重写 - 新的交互拓扑、四大核心概念、修订的文档结构

### 修复
- 添加 blueprint 支持到 forge --save 命令
- 改为项目级 Hall 而非全局
- 修复 Hall 文档在 README 中的位置
- 修复 oxn-trace skill 使用 'oxn export' 而非不存在的 'oxn api'

## [0.0.18] - 2026-05-15

### 新增
- F3 AI 执行循环 - 隐私隔离
- HTML 渲染器用于 task-trace 报告和 Blueprint DAG 预览

### 变更
- 移除 proof 概念，扁平化 stage 结构
- 合并 proof 到 stage，统一 probe/definition 调用 schema
- 统一所有命令使用集中式输出模块

### 移除
- 弃用的 CLI 命令（draft、force-pass、rollback、inspect、trace、api、proof-list）

## [0.0.17] - 2026-05-14

### 新增
- Stage/Probe 命名空间和 Blueprint v1 架构
- Skill 引用支持 skill-compiler
- 探索机制 - 覆盖率、质量、自动化的 markdown 报告

### 变更
- 优化代码性能和减少重复

### 修复
- DAG 基础的 stage 顺序
- 统一 Schema 和 Skill 引用的 probe 类型命名
- 使用 kebab-case 名称作为 Task ID 而非随机 UUID

## [0.0.16] - 2026-05-13

### 新增
- Arsenal 注册表和语义注解搜索
- ProbeDefinitionSchema
- 宪法级 eslint 规则

### 变更
- 迁移到 kernel/infra/arsenals FP 架构
- 合并 api 和 cli
- 简化物理架构为零数据库
- 将 meta-forge 约束内部化到 YAML 文件

### 修复
- 解决高危和中危漏洞

## [0.0.15] - 2026-05-12

### 新增
- Kernel lambda vacuum 重构
- Daemon IPC 使用 receiver.ts 和 handlers/
- CLI handlers 使用 socket-client 而非导入 daemon 模块

### 变更
- 连接 daemon executor 到 kernel evaluator
- 物理宪法 enforcement

### 移除
- 移除违反 Lambda Vacuum 的 dead kernel/probes/executor.ts

## [0.0.14] - 2026-05-11

### 新增
- Arsenal list 显示 stages 并支持类型/来源过滤
- 内置资产 fallback，Skills 去除 daemon 引用

### 变更
- 更新 README 和 architecture.md 到 0.1 探索模式
- 移除学术术语，使用通俗工程语言

### 修复
- 支持 oxn forge probe -s 使用 YAML 格式
- 支持 oxn arsenal inspect 使用 <type>/<name> 格式
- 接受 fs_exists/fs_not_exists probes 的 params.path 和 params.pattern

## [0.0.13] - 2026-05-10

### 新增
- 实现 arsenal 注册表和搜索
- 实现带语义注解的 arsenal 注册表和搜索
- Skill-compiler 输出到 <skillId>/SKILL.md

### 变更
- 净化 Skills
- 修复 Forge/Task 循环

### 修复
- Skill-compiler 在 SKILL.md frontmatter 中使用 name: 而非 skill:

## [0.0.12] - 2026-05-09

### 新增
- Layer 1 Kernel Schema 测试
- 基于文件的配置和纯文件系统状态规格

### 变更
- 从核心模块移除数据库引用
- 更新 handlers 使用追加-only task-trace 和原子 manifest
- 更新 runtimes、server、skills 为纯文件系统架构

### 修复
- 对齐代码和文档与当前 Schema
- ProofInvocationSchema.probeRefs 现在接受 ProbeInvocation[]

## [0.0.11] - 2026-05-08

### 新增
- CLI task 命令使用直接文件系统操作

### 变更
- 重构 README 和手册以提高清晰度

### 修复
- StageDefinitionSchema 添加 description
- ProofDefinitionSchema.probes 结构化
- ParameterDefSchema.description 必填

## [0.0.10] - 2026-05-07

### 新增
- MIT 许可证

### 变更
- 移除 proof 概念，合并验证到 stage 扁平字段

## [0.0.9] - 2026-05-06

### 新增
- BlueprintCompiler 集成到 task pipeline
- L2 self-hosting 支持

### 变更
- 从文件路径派生 arsenal 状态（draft/canonical）

### 修复
- proof.probes 迁移和 probe 参数提取
- 解决剩余类型检查错误

## [0.0.8] - 2026-05-05

### 新增
- 标准生命周期 DRAFT/CANONICAL
- /oxn-forge skill 用于生成 Draft 标准资产

### 变更
- 将 standards 命令重命名为 arsenal
- 将 standards 重命名为 arsenals 并统一路径

### 修复
- 解决低危漏洞

## [0.0.7] - 2026-05-04

### 新增
- Blueprint 模板和 Core tasks 表
- Blueprints 资产类型支持
- Blueprint CRUD 和 stage 引用解析器

### 变更
- 扩展 BlueprintSchema 添加 topology 和 edges
- 添加 scope 和 state 过滤器到 arsenal 命令

## [0.0.6] - 2026-05-03

### 新增
- 沙箱模式和 arsenal 导出/导入
- Meta-forge blueprint 用于引导资产生成

### 变更
- 清理 post-mvp 功能 - 移除 draft/export/gc/daemon 命令和未使用的 proofs

## [0.0.5] - 2026-05-02

### 新增
- 文件系统优先的 task 执行架构
- BlueprintParser 用于 stage 声明

### 变更
- 重构 arsenals 目录并添加 migrate 命令

### 修复
- Blueprint-parser 正确处理 probes 上下文中的 stage 声明

## [0.0.4] - 2026-05-01

### 新增
- Blueprint 模板和 Core tasks 表

### 变更
- 迁移项目数据库到三表扁平 schema

### 修复
- 统一 task 状态为大写并添加 task 目录创建

## [0.0.3] - 2026-04-30

### 新增
- Task-Blueprint-Stage 的 Zod schemas
- 重构 CLI 命令
- 全局 --json flag 和 task 命令

### 变更
- 实现 flat-schema-migrator 与 XnMigrator 和 draft 系统

## [0.0.2] - 2026-04-29

### 新增
- HTTP API 迁移到 Unix Socket 通信
- fs* proofs 的默认 Stage 模板

### 变更
- 从 xn 迁移到 oxn 命名
- 将 Xenonix 重命名为 OpenXenon
- 用 Blueprint 替换 Playbook
- 统一 Blueprint/Stage/Proof 命名

## [0.0.1] - 2026-04-28

### 新增
- 初始提交
- Skill 注入系统和适配器支持
- Daemon 健康检查和错误处理
- Task 执行 API
- Xn* 接口和核心类型
- Stage 模块和类型重构