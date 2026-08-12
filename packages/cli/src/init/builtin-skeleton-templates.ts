/**
 * Built-in skeleton templates for `oxn draft create --target` mode.
 *
 * 8 模板（v0.6.2-alpha.3 新增 + v0.7.0 RFC-0026 D2 加 goal.md）：
 *   - rfc.md
 *   - asset-domain.md / asset-workflow.md / asset-stack.md / asset-blueprint.md / asset-assetmap.md
 *   - work.md
 *   - goal.md (v0.7.0 RFC-0026 D2: --target goal 升华路由骨架)
 *
 * 用途：
 *   - `oxn init` 创建时落地到 `.openxenon/draft-skeletons/`
 *   - 解决新项目 `OXN_DRAFT_SKELETON_NOT_FOUND` 错误
 *
 * 关键约束（v0.6.3 Q1）：
 *   - `entity: skeleton` 标识模板自身（独立 entity，不与其他 AssetKind 混淆）
 *   - `target-entity` 字段标识 fork 后生成的目标 entity
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
entity: skeleton
target-entity: rfc
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
entity: skeleton
target-entity: domain
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
entity: skeleton
target-entity: workflow
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
entity: skeleton
target-entity: stack
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
`

const ASSET_ASSETMAP_SKELETON = `---
entity: skeleton
target-entity: assetmap
version: 0.1.0
name: TODO_<assetmap-name>
abstract: |
  TODO: one-line description of this navigation map
references: []
---

# AssetMap: TODO_<assetmap-name>

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
entity: skeleton
target-entity: work
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

const GOAL_SKELETON = `---
entity: skeleton
target-entity: goal
---

# Goal: <theme>

> Goal = IAP 准备阶段承诺单元；与 Work（IAP 执行）正交。
> v0.5.0 / D2 起由 \`oxn draft promote --target goal --goal-slug <slug>\` 从 Draft 派生（v0.7.0 RFC-0026 D2 落地）。

## Goal Frontmatter (派生后)

\`\`\`yaml
---
id: <slug>                    # kebab-case
theme: <human-readable>
priority: low | medium | high | critical
status: planned
created-at: YYYY-MM-DD
scheduled-version: ~          # 改语义："未绑版本"（Goal 天然晚绑）
synced-at: YYYY-MM-DD
branch: feat/goal-<slug>      # 新增：强制显式分支名（auto git checkout -b）
source: draft                 # 本次 D2 路径固定为 draft
source-ref: <draft-path>      # 若 source=draft，记录源 Draft 路径
---
\`\`\`

- 出池条件：cut forcing function 触发（见 RFC-0026 §2.4 a+b+c）。
- 1:1 with branch：每个 Goal 一条 \`feat/goal-<slug>\` 分支（auto 创建于 promote 时）。
- 1:1 with Work：每个 Goal 经 \`oxn goal work <slug>\` 创建对应 Work。

## Intent

TODO: 描述 Goal 要回答什么问题 / 解决什么边界（一两句话）。

## Why

TODO: 为什么这个 Goal 重要；与已存在的 Goal/Work/RFC 的关系。

## Acceptance

TODO: Goal finalize 的判定标准（Domain proof PASS → 立即 cut 当前 Version）。

## References

- 源 Draft: \`<source-ref>\`（由 promote 注入）
- 关联 RFC / ADR: TODO
`

/**
 * All 8 built-in skeleton templates.
 * Order matters: rfc first, then 5 assets, then work, then goal.
 */
export const BUILTIN_SKELETON_TEMPLATES: readonly BuiltinSkeletonTemplate[] = [
  { filename: 'rfc.md', content: RFC_SKELETON },
  { filename: 'asset-domain.md', content: ASSET_DOMAIN_SKELETON },
  { filename: 'asset-workflow.md', content: ASSET_WORKFLOW_SKELETON },
  { filename: 'asset-stack.md', content: ASSET_STACK_SKELETON },
  { filename: 'asset-blueprint.md', content: ASSET_BLUEPRINT_SKELETON },
  { filename: 'asset-assetmap.md', content: ASSET_ASSETMAP_SKELETON }, // 🆕 v0.6.4: 'asset-roadmap.md' → 'asset-assetmap.md'
  { filename: 'work.md', content: WORK_SKELETON },
  { filename: 'goal.md', content: GOAL_SKELETON }, // 🆕 v0.7.0 RFC-0026 D2: --target goal 升华骨架
] as const

/**
 * 落盘目录（相对项目根）
 *
 * v0.6.3 Fix #1 (revised): 移到 `.openxenon/draft-skeletons/`（boundary 顶层），
 * 而非 `.openxenon/draft-skeletons/`。
 * 原因：避开 blueprint 索引扫描（不需要 exclude 逻辑）。
 */
export const SKELETON_OUTPUT_DIR = '.openxenon/draft-skeletons'
