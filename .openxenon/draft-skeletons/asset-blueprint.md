---
entity: skeleton
target-entity: blueprint
version: 0.1.0
name: TODO_<blueprint-name>
abstract: |
  TODO: one-line description of this composition template
references: []
citations: 0
---

# Blueprint: TODO_<blueprint-name>

> TODO: one-line description of this composition template

## Use

### TODO_UseEntity1
- workflow: @md/workflows/TODO_workflow
- domain: @md/domains/TODO_domain
- stack: @md/stacks/TODO_stack

## Boundaries

### stage-1
- refs:
  - domain: TODO_domain
- observe:
  - fs-exists
  - lint-check
- deps: []
- desc: TODO: stage 1 阶段要做什么

### stage-2
- refs: []
- observe:
  - docs-heading-check
- deps:
  - stage-1
- desc: TODO: stage 2 阶段要做什么

### stage-3
- refs: []
- observe:
  - fs-exists
- deps:
  - stage-2
- desc: TODO: stage 3 阶段要做什么

## Scope
<!-- 文件范围声明：lock 时 Engine 校验 Task ## Artifacts ⊆ allow AND ∩ forbid = ∅ -->
- allow:
  - TODO: 允许修改的文件路径 glob（缺省工程根全树 `**`）
- forbid:
  - TODO: 禁止修改的文件路径 glob（缺省空列表）
- desc: TODO: 描述本蓝图的修改边界（如：CLI 命令族 vs Engine Kernel）

## Context Template
<!-- 可选：上下文组装指令。缺省 Engine 用内置默认模板（基于 Use refs + Boundaries + Goal 推导）。Blueprint 可覆写默认。 -->
<!-- 设计参考：.openxenon/drafts/design-blueprint-context-template.md -->

### Work Context
- business: TODO: 从 ## Use 引用的 Domains 提取的术语 + invariants（业务语义）
- implementation: TODO: 从 ## Use 引用的 Stacks 提取的工具 + 约束（实现边界）
- process: TODO: 从 ## Use 引用的 Workflows + ## Boundaries 提取的 slot 拓扑（执行流程）
- goal: TODO: 工程师在 Work create 时声明的 intent + constraints

### Task Context
- unit: TODO: 以 ## Boundaries 的每个 Slot 为单元（拆分依据）
- split: TODO: 把 Work Goal 按 Slot 拆分为独立 Task 的方式
- carry: TODO: 每个 Task 携带 Work Context 中与该 Slot 相关的子集
- acceptance: TODO: 从该 Slot 的 observe 数组提取验证标准
