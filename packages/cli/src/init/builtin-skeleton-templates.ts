/**
 * Built-in skeleton templates for `oxn draft create --target` mode.
 *
 * 7 模板（v0.6.2-alpha.3 新增）：
 *   - rfc.md
 *   - asset-domain.md / asset-workflow.md / asset-stack.md / asset-blueprint.md / asset-roadmap.md
 *   - work.md
 *
 * 用途：
 *   - `oxn init` 创建时落地到 `.openxenon/draft-skeletons/`
 *   - 解决新项目 `OXN_DRAFT_SKELETON_NOT_FOUND` 错误
 *
 * 关键约束：
 *   - 不含 `promote-target` / `promote-kind` / `created-from` / `synced-at` 字段（由 skeleton fork 注入）
 *   - 包含目标 H2 段（TODO 占位）
 */

export interface BuiltinSkeletonTemplate {
  /** 文件名 (e.g., "rfc.md") */
  filename: string
  /** 模板内容（含 frontmatter + H2 段） */
  content: string
}

const RFC_SKELETON = `---
entity: rfc
id: RFC-XXXX
theme: TODO_<theme>
status: Draft
date: 2026-08-02
---

# RFC-XXXX: TODO_<theme>

> TODO: one-line description of this RFC's decision

## 决策要点

- TODO: 列出 3-7 条决策要点(每条一句话)

## 影响范围

- TODO: 影响的层 / 模块 / 边界

## 相关术语

- TODO: 引用 oxn-domain 或子域 Term

## 相关决策

- TODO: 引用相关 ADR 编号

## Errata

<!-- status: Draft → 经 grilling → Accepted 后冻结,仅可追加 errata 段,version bump patch -->
`

const ASSET_DOMAIN_SKELETON = `---
entity: domain
version: 0.1.0
name: TODO_<DomainName>
abstract: |
  TODO: one-line description of the bounded context's business boundary
references: []
citations: 0
---

# Domain: TODO_<DomainName>

> TODO: one-line description of the bounded context's business boundary

## Terms

### TODO_Term
- glossary-ref: /openxenon/assets/domains/oxn-domain.md#term-prototype
- desc: TODO: domain term definition

## Bans

### TODO_BanCategory
- items:
  - TODO_BannedTerm1
  - TODO_BannedTerm2
- desc: TODO: why these terms are banned

## Invariants

### inv-1
- value: TODO: business invariant rule 1
- value: TODO: business invariant rule 2
`

const ASSET_WORKFLOW_SKELETON = `---
entity: workflow
version: 0.1.0
name: TODO_<workflow-name>
abstract: "TODO: one-line description of this execution flow"
references: []
citations: 0
---

# Workflow: TODO_<workflow-name>

> TODO: one-line description of this execution flow

## Slots

### stage-1
- desc: TODO: stage 1 阶段要做什么

### stage-2
- desc: TODO: stage 2 阶段要做什么

### stage-3
- desc: TODO: stage 3 阶段要做什么
`

const ASSET_STACK_SKELETON = `---
entity: stack
version: 0.1.0
name: TODO_<stack-name>
abstract: "TODO: one-line description of this technical stack"
references: []
citations: 0
---

# Stack: TODO_<stack-name>

> TODO: one-line description of this technical stack

## Tools

### TODO_Tool1
- version: TODO_<version>
- role: TODO_role
- command: TODO_command
- config:
  - TODO: config key-value
- desc: TODO: description of this tool
`

const ASSET_BLUEPRINT_SKELETON = `---
entity: blueprint
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
`

const ASSET_ROADMAP_SKELETON = `---
entity: roadmap
version: 0.1.0
name: TODO_<roadmap-name>
abstract: |
  TODO: one-line description of this navigation map
references: []
---

# Roadmap: TODO_<roadmap-name>

> TODO: one-line description of this navigation map

## Links

- TODO: 关联 Asset 列表 refs

## Scenes

### TODO_Scene1
- desc: TODO: scene 路由描述
- blueprint: TODO_blueprint_ref

## Usage

- TODO: 使用说明

## Scene quick-reference

- TODO: 快速参考表
`

const WORK_SKELETON = `---
workId: TODO_<work-id>
intent: TODO: one-line description of the work's intent
createdAt: 2026-08-02
status: aligning
currentRound: 1
references:
  - assets/domain/TODO_domain.md
---

# Work: TODO_<work-id>

> TODO: one-line description of the work's intent

## Intent

TODO: 工程师声明的意图

## Roadmap

- [ ] 1. TODO: 阶段 1
- [ ] 2. TODO: 阶段 2
- [ ] 3. TODO: 阶段 3

## Loop History

### Round 1
- User: 启动 Work
- AI: TODO: 初始动作

## Key Observations

- TODO: 关键观察
`

/**
 * All 7 built-in skeleton templates.
 * Order matters: rfc first, then 5 assets, then work.
 */
export const BUILTIN_SKELETON_TEMPLATES: readonly BuiltinSkeletonTemplate[] = [
  { filename: 'rfc.md', content: RFC_SKELETON },
  { filename: 'asset-domain.md', content: ASSET_DOMAIN_SKELETON },
  { filename: 'asset-workflow.md', content: ASSET_WORKFLOW_SKELETON },
  { filename: 'asset-stack.md', content: ASSET_STACK_SKELETON },
  { filename: 'asset-blueprint.md', content: ASSET_BLUEPRINT_SKELETON },
  { filename: 'asset-roadmap.md', content: ASSET_ROADMAP_SKELETON },
  { filename: 'work.md', content: WORK_SKELETON },
] as const

/**
 * 落盘目录（相对项目根）
 *
 * v0.6.3 Fix #1 (revised): 移到 `.openxenon/draft-skeletons/`（boundary 顶层），
 * 而非 `.openxenon/draft-skeletons/`。
 * 原因：避开 blueprint 索引扫描（不需要 exclude 逻辑）。
 */
export const SKELETON_OUTPUT_DIR = '.openxenon/draft-skeletons'