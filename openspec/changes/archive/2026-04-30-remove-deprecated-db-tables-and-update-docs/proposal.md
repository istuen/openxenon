# Proposal: 删除 Deprecated 数据库表并更新架构文档

## 概述

完成文件系统优先任务执行架构的最后阶段：删除 deprecated 数据库表并更新架构文档。

## 问题背景

2026-04-30 实现了文件系统优先任务执行架构（commit 3d017e2），将任务状态从 SQLite 迁移到文件系统（task-trace.yaml）。为了保持向后兼容，当时保留了 `project.oxn` 和 `core.oxn` 中的 task 相关表并标记为 deprecated。

现在需要完成以下工作：

1. **删除 deprecated 数据库表**
   - `project.oxn` 中的 tasks、blueprints、stages、escape_logs、proof_logs 表
   - `core.oxn` 中的 tasks 表
   - 更新所有依赖这些表的代码

2. **更新架构文档**
   - 更新 `docs/architecture.md` 反映新的架构
   - 更新 `docs/database.md` 说明当前数据库状态
   - 更新 `docs/types.md` 中的类型定义

## 范围

### 包括
- 删除 `src/db/` 中的 task 相关 schema 和操作
- 更新 `src/api/handlers/` 中的 task handler 使用文件系统
- 更新测试文件使其不依赖 task 相关 DB 操作
- 更新架构文档

### 不包括
- 修改项目结构（已通过 file-system-first 架构实现）
- 修改 arsenal 相关功能
- 修改其他非 task 相关的数据库表（如 projects、config）

## 约束

- 必须保持向后兼容性至少一个版本
- 所有现有测试必须通过
- 文档必须与实现保持同步

## 风险

1. **测试覆盖率风险**：删除 DB 操作后，某些测试场景可能无法执行
2. **向后兼容风险**：如果用户有外部工具依赖 task DB 操作，可能受影响

## 验收标准

1. `src/db/` 中不再包含 task 相关的 schema 定义
2. 所有 task CLI 命令正常工作
3. 任务可以正常创建、执行、完成
4. 架构文档准确反映当前实现