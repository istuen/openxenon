# v0.6.1 — Blueprint 结构重组 PR-3.3（Skill 文档同步）

## Bug Fix

### Skill 文档同步（S11-S15 from PR-3 副作用清单）

PR-1+PR-3.1+PR-3.2 已落地 Blueprint `## Use` + `## Boundaries` 新语法，**Skill 文档仍描述旧 5 AssetKind 体系（含 `## Externals`）**。本 PR 把 `oxn init` 派发的 Skills 同步到 v0.7+ canonical 语法。

#### 改动文件（8 个）

**`oxn-asset` instruction.md（zh-CN + en）**
- 范式速记 5 AssetKind 移除 `## Externals`：
  - Domain = 业务边界（term/ban/invariant）
  - Workflow = 执行边界（slot DAG with desc only）
  - Stack = 环境边界（tools 列表）
  - Blueprint = 组合模板（`## Use` 引用 3 边界 + `## Boundaries` 编排单元）
  - Roadmap = 跨类型导航索引
- 模板选择表 Core H2 更新（Props/Slots → Slots(desc)；Runtimes/Linters/Tests → Tools；Refs → Use/Boundaries）
- v0.6.1-alpha.4 变化 note 改 "External 已移除（references: [{ url }]）"
- 删 `E_MD_EXTERNAL_*` 错误码

**`oxn-asset` references/asset-kind-reference.md（zh-CN + en）**
- 总览表去 `**Externals**（可选）`
- 删 Domain/Workflow/Stack 三段 `## Externals` 示例块
- Blueprint `## Refs` → `## Use` + `## Boundaries`（含示例）
- 删除整段 "External inline" 章节 + 关系图

**`oxn-asset` references/asset-creation.md（zh-CN + en）**
- 表去 Externals；删步骤 4 External inline + 步骤 6 External status
- Blueprint 示例 `## Refs` → `## Use` + `## Boundaries`
- en 版同步删除 library.md/external.md 引用、`oxn domain create` → `oxn asset create`

**`oxn-work` instruction.md（zh-CN + en）**
- 执行段「自编辑 `## Refs` + `## Context`」→「`## Use` + `## Context`」
- 多 Asset 关系「Work 级 `## Refs`」→「Work 级 `## Use`」

### 不在范围

- `assets/*.md` 模板文件（`domain.md`/`workflow.md`/`stack.md`/`blueprint.md`）— draft 声明已在 PR-1 完成，不在 PR-3.3 范围（仍含旧 `## Externals`/`## Refs`，留待后续清理）
- 引擎代码（无改动）
- `oxn external` 命令移除（v0.7+ 工作）

## 验证

- biome check `src/ packages/`：✅ 0 error
- eslint `src/ packages/`：✅ 0 error
- 手动 grep 确认 8 文件无残留 `## Refs` / `## Externals` 语法（仅 "removed" 说明句保留）

## 关联

- PR-3 总稿：`.openxenon/pools/drafts/pr-3-follow-up.md`
- PR-3.1 changelog：`.changes/0-6-1-blueprint-structure-pr3-1.md`
- PR-3.2 changelog：`.changes/0-6-1-blueprint-structure-pr3-2.md`
- Work：`pr-3-3-skill-docs`（5/5 tasks passed）
