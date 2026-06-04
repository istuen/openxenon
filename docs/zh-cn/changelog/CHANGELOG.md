# 变更日志

本文件记录项目所有重要变更。

## [Unreleased] - 2026-06-04

### 重大变更：Leader 接入 v0.1 双层状态机

将 leader run/submit/status 改为 task 粒度，承接 v0.1 DDD 双层架构。

### 新增

- **`src/work/dual-state-exec.ts`** — 双层状态机执行器
  - `runWorkSpace` — 写 `works/<w>/workspace.json`（workspace 级 state）
  - `runTask` — 写 `works/<w>/tasks/<t>/state.json`（task 级 state）+ 同步 workspace 索引
  - `submitTaskPart` — 推进 task part，写 task 级 state + workspace 索引 + trace
  - `validateTasksPresent` — leader run 时 fail-fast 校验 task.oxn 齐备
  - `ExecError` 错误类（`OXN_TASK_OXN_MISSING` / `OXN_TASK_NOT_FOUND` / `OXN_WORKSPACE_NOT_FOUND`）
- **`oxn work task` 新增子命令**：
  - `oxn work task edit --work W --task T --objective ... --add-constraint ... --add-inject ...` — 改 objective / 加 constraint / 加 inject
  - `oxn work task delete --work W --task T --force [--keep-state]` — 删 task（含 state/trace/frozen）
  - `oxn work task submit --work W --task T [--run-probes]` — 薄壳包装，调 `oxn leader submit`
- **3 套工作流端到端示例** (`src/oxn-dsl/examples/works/`)：
  - `explore-dsl/` — explore 类（1 task，注入 dsl-context）
  - `develop-member/` — develop 类（1 task，注入 member-context）
  - `fix-issue/` — fix 类（4 task 串行：diagnose → locate → fix → verify，注入 work-context）

### 变更

- **`src/cli/leader.ts`**：run 改写双层 state；submit 必传 `--task`；status 报告 task 分解
- **`src/work/dual-state-io.ts`**：workspace state 路径改为 `works/<w>/workspace.json`，与 legacy `state.json` 分离避免覆盖
- **`src/work/blueprint-freezer.ts`**：frozen 落点从 work 级 `works/<w>/frozen.json` 改为 task 级 `works/<w>/tasks/<t>/frozen.json`
- **`src/skills/locales/{zh-CN,en}/oxn-leader/instruction.md`**：4 阶段流程（prepare → run → act → submit），v0.1 错误码表
- **`src/skills/locales/{zh-CN,en}/oxn-work/instruction.md`**：5 步创建流程，task 必创说明
- **`docs/architecture/v01-ddd-dual-layer.md` §9**：新增 3 类工作流端到端示例
- **`docs/zh-cn/guides/getting-started.md`**：补 "Run → Submit → Status" 完整 5 步演示

### 标记 v0.2 TODO

- `src/hall/index.ts` — Hall 扫旧 `.openxenon/tasks/<id>/` 布局，需改为扫 `works/<w>/tasks/<t>/`
- `src/daemon/index.ts` — Daemon radar 监控单层 work，需改为 task 粒度 + workspace 聚合

### 测试

- `src/cli/__tests__/mvp-leader-e2e.test.ts` 改造：3 个 e2e 用例补 task.oxn + 走 task 粒度 submit 路径
- 全量测试：417/417 通过

## [0.1] - 2026-06-04

### 🌟 重大变更：DDD 双层架构落地

基于 QA 多轮对话的最终结论（Intent-Align 对偶），将 OpenXenon 从"单 Blueprint + 单 Work"模型升级为"Domain + Blueprint + Work + Task"四层领域模型。

### 新增

- **Domain 顶层实体**：承载 DDD 限界上下文（language: noun/verb/ban；domain_rules；context_map）
- **Task 顶层实体**：work.oxn 内的执行单元，绑 1 Blueprint + 注入 N Domain
- **OXN DSL 语法扩展**：
  - `domain "X" { language { ... } domain_rules { ... } context_map { ... } }`
  - `task "X" blueprint "Y" { inject "D"; slot "..." }`
  - `work "X" { use_domain "D"; use_blueprint "B"; task "T" align "B.T" { deps = [...] } }`
- **OXN DSL 语义重写**：Work 不再 `ref` 单 Blueprint，改为 `use_domain` / `use_blueprint` / `task` 三段
- **Zod Schema 增量**：
  - `OxnDomainIR` / `OxnTaskIR` / `OxnWorkIR` 三个新 schema
  - `createOxnDomainIR` / `createOxnTaskIR` / `createOxnWorkIR` 工厂函数
  - `validateOxnDomainIR` / `validateOxnTaskIR` / `validateOxnWorkIR` 校验函数
- **CLI 新命令**：
  - `oxn domain {new,validate,list}` — DDD 限界上下文管理
  - `oxn work task {new,status,list}` — workspace 内 task 生命周期
  - `oxn work migrate [--dry-run]` — 旧 work 硬迁移
  - `oxn get-context` — AI 上下文获取（**全量隔离**）
- **双层 State**：
  - `WorkspaceState` (work.oxn 级) + `TaskState` (task.oxn 级)
  - 独立读写，trace 也分层
  - 路径：`works/<w>/state.json` + `works/<w>/tasks/<t>/state.json`
- **Validators**：
  - `validateWorkTaskReference` — Work 内 use_domain/use_blueprint/task.align 引用校验
  - `validateTaskAlign` — task DAG 校验（重复名/未知 dep/环检测）
- **示例**：
  - `.openxenon/domains/{arsenal,work,dsl,cli}-context.oxn`（项目自身 4 个 DDD 域）
  - `src/oxn-dsl/examples/domains/{member,order,marketing}-context.oxn`（教学示例）
  - `src/oxn-dsl/examples/works/onboarding/{work.oxn, tasks/*/task.oxn}`（跨域编排示例）
- **文档**：
  - `docs/architecture/v01-ddd-dual-layer.md`（架构总览，英文）
  - `docs/architecture/project-domains.md`（项目 Domain 索引）
  - `docs/zh-cn/architecture/ddd-dual-layer.md`（中文版）

### 变更

- **`oxn leader new` 生成的 work.oxn**：从 `work "X" ref "Y" { part "..." align "..." }` 改为 `work "X" { use_blueprint "Y"; task "..." align "Y...." }`
- **`oxn leader run` / `submit` / `status`**：work 解析路径从 `slotBindings` 切换到 `tasks` 编排块
- **既有 5 份 builtin blueprint**（`dev-workflow` / `fix-issue` / `explore-analyze-report` / `add-summary-cmd` / `dual-track`）零改动
- **`oxn task` CLI**：保留旧路径（指向 `.openxenon/tasks/<id>/`），新工作流用 `oxn work task`（指向 `works/<w>/tasks/<t>/`）
- **测试**：
  - DSL 单元测试：186/186 通过
  - leader / task-filesystem e2e：全部通过
  - 总计：417/417 通过，1527 expect calls
- **预提交钩子**：
  - `eslint.config.js`：新增 `src/oxn-dsl/generated/**` ignore（langium 自动生成文件）
  - `lefthook.yml`：`eslint-arch` 加 `--no-warn-ignored` 标志

### 修复

- **Domain CLI 兼容性**：`oxn domain validate` 支持 PascalCase 名自动转 kebab-case 查找文件（如 `DSLContext` → `dsl-context.oxn`）
- **Task 注入校验**：`oxn work task new` 强制 blueprint 名出现在 work.oxn 的 use_blueprint 列表中，inject 列表强制出现在 use_domain 列表中
- **Probe 探针**：`--run-probes` 不再依赖 task 的 `ref` 字段，v0.1 task 也能跑 no-op 探针保持状态机可观察

### 移除

- 旧的 `part "X" align "Y" { ... }` 在 work.oxn 内联（被 `task` 块替代）
- 单层 `WorkState`（被 `WorkspaceState` + `TaskState` 替代）
- `task "X" use "@xxx/blueprints/Y"` 语法（被 `task "X" blueprint "Y"` 替代）

### v0.1 限制（v0.2 解决）

- Slot inputs/outputs 契约未实装
- language 约束不接 Probe（v0.2 引入 `language-ban-checker`）
- task 编排只支持串行 deps（v0.2 引入并行）
- 跨 task prop 引用 `parts.X.outputs.field` 是占位（v0.2 实装）

## [0.0.27] - 2026-05-24

### 新增
- oxn-validate CLI 命令
- OXN DSL example files (blueprint/part/probe/work)
- Work type 简写语法
- Part refs 在 slotBindings 中注入 probes 到 frozen Blueprint

### 修复
- 使用正确的 blueprint ref path @prj/blueprints/<name>
- 使用正确的 OXN DSL 语法 for task.oxn
- resolvedFrom 应为 'project'

## [0.0.26] - 2026-05-23

### 新增
- i18n Phase A — 多语言基座与 Skill 内容国际化
- OxnKernelAdapter 迁移到 oxn-dsl 层
- explore scan 索引模式

### 修复
- 更新 skills 源文件到 OXN DSL v3.1 语法
- 清理 legacy forges 和 probes YAML 文件
- 全部 typecheck + test 通过

## [0.0.25] - 2026-05-22

### 新增
- OXN DSL Slot 范式重构 — 废除 Interface/AbstractPart，确立 slot 插槽机制

### 修复
- resolve 32 lint violations per architecture constitution
- resolve typecheck errors in production code

## [0.0.24] - 2026-05-21

### 新增
- YAML purge — paths .oxn, kill 6 parseYAML sources
- Forge-Arsenal pipeline — publish rename, compile diagnostics, OXN scaffold, dir migration
- E2E param flow — prove explicit parameter mapping closed loop
- Langium services + DocumentBuilder + pipeline integration

## [0.0.23] - 2026-05-20

### 新增
- OXN DSL 核心架构 v1.1~v1.6：Langium grammar、AST-to-IR、Scope Provider、OxnAssemblyIR schema、Kernel adapter、Param evaluator
- CLI 子命令：compile/unpack/promote/migrate-yaml
- Phase 2~4 完成：asset loader、flattener、bundle compiler、unpacker、builtin OXN、sandbox、mutation validator、promote
- 接口/规则/期望验证器、迁移、弃用处理

### 修复
- escape backticks in oxn-task instruction string

## [0.0.22] - 2026-05-19

### 新增
- 编译与缓存机制 — compiled 制品、_depHash、assembly、manifest
- 统一 props/params 命名 + 参数注入链路打通

### 修复
- 代码对齐架构文档

## [0.0.21] - 2026-05-18

### 新增
- Stage→Part 重构 across codebase
- YAML parsing 和 slot 支持
- 文档结构重组（en/zh-cn）
- 架构报告 P0 改进项：Stage→Part 合并、Probe 单文件存储、BUILTIN_PARTS 填充、min_version 校验、Forge unpack/repack

### 移除
- remove proof concept from docs and code

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