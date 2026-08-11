---
entity: workflow
version: 3.0.0
name: asset-create
abstract: |
  Asset 生命周期统一流水线（mode 参数化）：4 模式覆盖 create / skeleton / evolve / archive 全生命周期。
references:
  - oxn-asset-domain
  - oxn-draft-domain
  - oxn-work-domain
citations: 0
synced-at: 2026-08-09
---

# Workflow: asset-create

> Asset 生命周期统一流水线 v3（oxn-asset Skill 步骤 1-5 整合）—— 4 模式：
> - `--mode create`（默认）：fork 同 kind 模板 → 填写正文 → 校验 → 落盘
> - `--mode skeleton`：从 .openxenon/draft-skeletons/<target>[-<kind>].md 派生骨架（含 frontmatter + H2 段）→ 注入 promote-target hint
> - `--mode evolve`：读当前内容 → 制定变更计划 → 应用变更 → 更新 planLock 哈希
> - `--mode archive`：检查引用 → 二次确认 → 物理移至 .openxenon/.archived/assets/{kind}/<name>.md
>
> mode 参数化覆盖 4 个原独立 Workflow：
> - draft-skeleton-fork.md（删）→ mode skeleton
> - asset-archive.md（删）→ mode archive
> - asset-evolve.md（删）→ mode evolve
> - oxn-workflow.md（删）→ root Blueprint oxn-blueprint 在 Boundaries 中组合 dev-workflow + doc-author 实现

## Phases

### choose-kind
- 选择要操作的 Asset 类型（domain / workflow / stack / blueprint / assetmap），对应 5 类 AssetKind。
- mode=create / skeleton 时必选；mode=evolve / archive 时可省略（提供 `--name` 后自动解析）。
- mode 参数解析失败 → 报 `OXN_ASSET_MODE_INVALID`（列出 4 个合法 mode）。

### fork-template
- mode create / skeleton 走此 phase；mode evolve / archive 跳过。
- mode create：从 .openxenon/assets/ 同 kind 模板 fork 一份空白骨架（含 frontmatter + 章节结构 + 必填字段占位）。
- mode skeleton：从 .openxenon/draft-skeletons/<target>[-<kind>].md 解析 skeleton 字符串（v0.6.3 Fix #1 路径修正）。失败 → 报 `OXN_DRAFT_SKELETON_NOT_FOUND`（推荐性 hint，不阻塞）。
- 共同产物：返回 skeleton 字符串（CLI writeFileSync 写文件）。

### fill-content
- 按模板填写正文（Concept / Forbidden / Boundary for Domain；Phases for Workflow；Foundation / Tools for Stack；Use / Slot / Scope for Blueprint；Scenes for Roadmap）。
- mode create / skeleton：工程师填正文中。
- mode evolve：读取当前内容做 diff；与计划对比，逐字段修改。

### validate-commit
- 校验 Asset 格式（frontmatter 必填字段 + 引用一致性 + 词汇禁用旧词清单 + DAG 无环）。
- 通过后落盘并 citations 自增；mode archive 不落 .openxenon/assets/ 而是落 .openxenon/.archived/assets/{kind}/。

### apply-mode
- mode 特定后处理：
- mode archive 的 check-references phase（移至 choose-kind 阶段）：mode=archive 时先跑 check-references，citations > 0 或被 Workflow/Blueprint/AssetMap 引用 → 报 `OXN_ASSET_ARCHIVE_BLOCKED`（v0.6.3 Inv10 delete-requires-no-refs）。
- mode archive 的 confirm phase：二次确认归档操作（人类 review）。
- mode evolve 的 read-current / plan-changes phase（移至 fork-template 之前）：read-current 读取目标 Asset 当前内容，列出所有引用方与 citations 数；plan-changes 制定变更计划（新增/删除/修改 哪几条；是否破坏 kind-isolation；是否影响 Roadmap 路由）。
- 共同确认：planLock 哈希更新 + 通知引用方重新评估。已 accept 的 RFC 不可修改（frozen+errata）。

## Practice

### ModeParameterization
- 4 mode 通过 `--mode <create|skeleton|evolve|archive>` 参数切换。
- 默认 mode=create（向后兼容 v2.0.0 老调用）。
- mode skeleton 由 `oxn draft create --target X` 触发（CLI 内部调 `--mode skeleton`）。
- mode evolve 由 `oxn asset evolve <name>` 触发（CLI alias）。
- mode archive 由 `oxn asset archive <name>` 触发（CLI alias）。

### EvolveVsArchiveAtomicity
- mode evolve 与 mode archive 是 transactional —— 任一阶段失败 → 整事务回滚，已落盘部分恢复。
- mode create / skeleton：写文件失败 → CLI 报 `OXN_ASSET_CREATE_FAILED`（保留文件路径便于工程师手动清理）。

### MergeOf4Workflows
- 本 Workflow 集成了 v2.0.0 之前的 4 个独立 Workflow 行为（asset-create v2 / draft-skeleton-fork / asset-archive / asset-evolve）。删文件 4 个 + 本文件重写。
- 引用方更新：
- `promote-target-aware-workflow.md` `## Use workflow` 段：原 `draft-skeleton-fork` 改 `asset-create`（PR-D 已完成）
- `oxn-system.md` scene-dev 删除 4 个孤儿 workflow 引用行（原 PR-C 已删 4 个；本 PR 再删 2 个）
- builtin skeleton 模板 `asset-{domain,workflow,stack,blueprint,assetmap}.md` 文件名不变

## Reference

### SourceDefinition
- v2.0.0: 单 mode create 4 phase（choose-kind / fork-template / fill-content / validate-commit）。
- v3.0.0: 4 mode 覆盖 create / skeleton / evolve / archive。
- 4 个独立 Workflow 来源（已删）：
- draft-skeleton-fork → mode skeleton fork-template phase
- asset-archive → mode archive apply-mode phase（check-references + confirm + move-to-archived）
- asset-evolve → mode evolve apply-mode phase（read-current + plan-changes）
- oxn-workflow → 由 root Blueprint oxn-blueprint 在 Boundaries 中组合 dev-workflow + doc-author（无需独立 root Workflow）

### MigrationNote
- v0.7.0 PR-H 落地：4 个 Workflow 文件删除，asset-create mode 参数化。
- 旧 CLI 调用（`oxn draft create --target X` 等）内部自动适配新 mode 参数，工程师无感。
- 旧 Workflow 引用方需 cascade 更新：`promote-target-aware-workflow.md` 已 PR-D 完成；`oxn-system.md` 已 PR-C 部分完成；Skill instruction.md 在本 PR 更新。
- 旧 workflow .md 文件已删除（PR-H 一次性合入）；如有自定义 Blueprint 引用，CLI 报 `OXN_WORKFLOW_NOT_FOUND`（YIELD_TO_HUMAN）指导迁移到 asset-create mode。

## FailureHandling

- 任一 Quality Gate 失败 → 立即停 → 回到对应 phase 重试。
- mode evolve / archive 是 transactional —— 任一阶段失败 → 整事务回滚，已落盘部分恢复（git revert 或 .openxenon/.archived/ 物理移动回退）。
- mode archive 的 check-references 失败 → 不回到 evolve，直接升级为 Issue Draft 标记 P0 归档阻塞。