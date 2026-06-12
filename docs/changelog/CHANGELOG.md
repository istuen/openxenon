# Changelog

OpenXenon 的所有重要变更都会记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/)。

## [Unreleased] - v0.1-final

### 重大变更
- **Intent-Align 范式正式确立** — Domain + Blueprint 是 Intent（声明），Work + Task + Part 是 Align（实例）
- **DDD 双层架构 → Intent-Align 范式** — 重新命名架构灵魂
- **Stage 概念 → Slot（Blueprint）/ Part（Task）** — 统一术语
- **Map 概念删除** — 不再使用跨域 map，所有跨域通过 Domain `context_map.imports` 声明

### Added
- `domain` 实体（DDD 限界上下文）：term/ban/invariant/context_map
- `blueprint` 实体的 `observe = ["ShellExec"]` 数组形式
- `work` 实体的资源池（domain/blueprint/part/probe ref）
- `task` 实体的声明式 align（`domain "X"; blueprint "Y";`）
- `part` 嵌套在 task 内，可包含 probe 块
- `oxn work context` 全量隔离（task 级只看 align 的 domain）
- `oxn work add-task/edit/status/list` 子命令
- 4 个端到端 work 示例（onboarding/develop-member/fix-issue/explore-dsl）
- 4 个内部 domain（ArsenalContext/WorkContext/DSLContext/CLIContext）
- 双层 state.json（workspace + task）
- 7 篇 ADR（架构决策记录）

### Changed
- `noun` + `verb` → `term`（map 格式）
- `domain_rules { rule }` → `invariant { "..." }`（字符串）
- `use_domain` / `use_blueprint` → `domain "X" ref "..."` / `blueprint "X" ref "..."`
- `task "X" align "Y.Z"` → `task "X" { blueprint "Y"; part "Z" }`
- `inject "X"` → task 块内 `domain "X"`
- `expectation` 块 / Blueprint `rule` 块 → **完全删除**（验证标准由 Probe 承载）
- 文档目录重组：`docs/{en,zh-cn,architecture}/` → `docs/{core,architecture,reference,guides,adr,blog}/`
- 简体中文为唯一权威，英文版清空

### Removed
- `Blueprint.expectation` 块
- `Blueprint.rule` 块
- `Domain.noun` / `Domain.verb`（合并为 `term`）
- `Domain.domain_rules`（合并为 `invariant`）
- `Work.use_domain` / `Work.use_blueprint`（改为 ref 池）
- `Task.inject`（改为 task 块内 `domain` 字段）
- `Task.align` 字符串拼接（改为 `task { blueprint; part }`）
- `Stage` 概念
- `YAML` / `JSON` Blueprint 格式（OXN DSL 单一权威）

### Deprecated
- `Arsenal` 资产生命周期（DRAFT → CANONICAL）— 不在 v0.1 核心流程
- 旧的 `oxn-task` / `oxn-explore` / `oxn-plan` 命令
- 旧的 `Stage` 概念

### Fixed
- 旧文档中残留的 `expectation` / `rule` / `noun` / `verb` / `inject` 等已删除概念的描述
- 文档与代码实现的不一致
- README §快速开始示例改用 v0.1-final 语法

## [v0.1.0] - 2026-05

### Added
- DDD 双层架构初版（Domain + Work 双 state 层）
- Domain 实体（noun/verb/ban/domain_rules/context_map）
- `oxn domain {new,validate,list}` 命令
- `oxn work task {new,status,list,edit,delete,submit}` 命令
- 双层 state.json
- Blueprint 保持 v0.0.x 兼容（slot/observe）

### Notes
- 此版本文档与代码已废弃，被 v0.1-final 取代
