---
status: planned
created-at: 2026-08-06
authors:
  - opencode（与 user 协作，2026-08-06）
---

# dev-versionless-pooling — `dev/versions/` 去版本化合并到 `dev/pool/`

> **来源**：2026-08-06 user 需求「分析 dev/versions/*.md 里版本文档，我需要去除这些版本信息，把其都当做是『未来』规划，但直到下一个版本才会从中选择」
> **目的**：将 `dev/versions/` 中过早绑版本的 10 个文件回归到 RFC-0013 Errata 2026-07-27 的 pool/versions 双层架构

## 现状问题

1. **过早绑版本**：`dev/versions/` 10 个文件全部带 `version: 0.X.Y` + `date: YYYY-MM-DD` + H1 含版本前缀
2. **slug 重叠混乱**：`dev/versions/` 5 个 slug（emergence/asset-graph/ai-three-modes/anchor-slot/term-upstream-dag）与 `dev/pool/` 同名 brief 重复
3. **未遵循 RFC-0013 Errata**：原设计是 pool（unscheduled brief）→ scheduling → git mv 到 versions + 加 version 字段；但实际 versions 已存在但未进入 scheduling 决策
4. **CI 守门矛盾**：`scripts/check-versioned-docs.ts` 视 `dev/versions/` 为允许放版本号的位置，但实际上很多版本号是过早绑定

## 架构决策

**采用「设计 2：pool→versions 是 git mv + 扩写」**：

```
dev/pool/<slug>.md          ← unscheduled brief（~5-9KB）
        ↓ scheduling 决定
        ↓ git mv + 扩写
dev/versions/<slug>.md      ← scheduled + detail（带 version: 0.X.Y，~10-30KB）
```

- 现在 `dev/versions/` 内容错位——detail 在 versions，brief 在 pool，版本号过早填入
- 修正路径：detail 回到 pool（作为完整规划），pool 文件扩写为 detail（不增加新 detail，只去掉版本号）
- scheduling 决定后，由工程师 `git mv` pool → versions + 加 version: 0.X.Y 字段

## 处置策略

| 类别 | 文件 | 处置 |
|---|---|---|
| **Baseline shipped**（进度已完成）| `0-7-0-logger-migration.md`（P0+P1 done）| git rm + 归档 `.archived/dev/versions/` |
| | `0-7-0-oxn-deprecation.md`（v0.6.1 partial ship）| git rm + 归档 `.archived/dev/versions/` |
| **Slug 重叠**（5 个有 pool brief）| emergence/asset-graph/ai-three-modes/anchor-slot/term-upstream-dag | pool brief 先归档到 `.archived/dev/pool/`，再 git mv versions detail 到 pool |
| **Slug 全新**（3 个无 pool brief）| infra-ports/work-unified-model/probe-system-evolution | 直接 git mv 到 pool |

## 去版本化规则

每个新 pool 文件统一处理：

### frontmatter 转换

```yaml
# 改前
version: 0.7.0
date: 2026-11-15
type: minor
status: planned
rfc: [...]
adr: [...]

# 改后
id: <slug>
theme: <人类可读主题>
priority: <low|medium|high>
status: planned
created-at: 2026-07-28
scheduled-version: ~
synced-at: 2026-08-06
note: |
  从 dev/versions/0-X-Y-<slug>.md 回滚（去版本化）；scheduling 时由工程师判定版本。
```

### H1 标题

- `# 0.7.0 — Asset 影响图 + Hall v0.5 集成` → `# Asset 影响图 + Hall v0.5 集成`

### body 文本替换

| 旧文本模式 | 新文本 |
|---|---|
| `v0.7.0 主题：xxx` | `主题：xxx` |
| `v0.7.0 优化` | `本版本优化` |
| `v0.7.0 W11-12` | `W11-12` |
| `v0.7.0 不做` | `本版本不做` |
| `v0.7.0 验收门槛` | `验收门槛` |
| `v0.7.0 末` | `完成时` |
| `v0.7.0 增量` | `本版本增量` |
| `目标版本：v0.7.0` | `目标版本：~（scheduling 决定）` |
| `目标发布：v0.7.0 = 2026-11-15` | 删除 |
| `v0.6.x → v0.7.0` | `上一版本 → 本版本` |
| `Phase A/B/C（X 天）` | 保留（子里程碑，不是版本号） |

## 引用更新（24 处扫描结果）

### 直接引用（迁移后会断）

1. `dev/meta/oxn-deprecation-baseline.md` (3 处) → `.archived/dev/versions/0-7-0-oxn-deprecation.md`
2. `docs/adrs/0082-diagnostic-unification.md` (2 处) → `.archived/dev/versions/0-7-0-logger-migration.md`
3. `docs/rfc/zh-cn/RFC-0023-asset-paper-schema.md` (2 处) → `dev/pool/asset-graph.md`
4. `dev/versions/0-8-1-probe-system-evolution.md` 自引用 → `dev/pool/term-upstream-dag.md`
5. `dev/versions/0-7-0-infra-ports.md` 自引用 → `dev/pool/emergence.md`

### 历史叙述（保留并标记为 historical）

- `dev/pool/README.md` (3 处 "从 `dev/versions/0-X-Y-...` 迁入") → 改为 "从 versions/ 回滚到 pool"
- `dev/pool/{asset-graph,emergence,term-upstream-dag}.md` frontmatter `note` 字段 → 调整
- `.openxenon/drafts/doc-versionless-restructuring.md` → 加注"本计划已演进，详见 doc-dev-versionless-pooling"

## 元信息文件更新

| 文件 | 改动 |
|---|---|
| `dev/versions/README.md` | 重写：lifecycle 强调"scheduling 时 git mv 进来"，删除"当前内容"表，删除命名约定中 `0-X-Y-` 前缀要求 |
| `dev/pool/README.md` | 更新「当前内容」表（13 个条目），删除「与 dev/versions/ 的关系」对比表 |
| `dev/README.md` | 第 13 行调整 |
| `dev/meta/README.md` | 第 19-20 行关系表 |
| `AGENTS.md` | "版本号中性原则"段落微调 |
| `scripts/check-versioned-docs.ts` | line 191-197 输出文案调整 |

## Commit 拆分

| # | 标题 | 文件改动 |
|---|---|---|
| 1 | `docs(dev): 归档 logger-migration + oxn-deprecation baseline-shipped → .archived/` | 2 git mv + 5 处引用更新 |
| 2 | `docs(dev): 8 个 dev/versions/ 合并到 dev/pool/ + 去版本化（含 5 brief 归档）` | 13 git mv + 8 个文件 frontmatter/H1/body 编辑 |
| 3 | `docs(dev): 更新 README + AGENTS.md + check-versioned-docs 反映新架构` | 7 个元文件 |

## 后续（v0.6.x 自举完成后）

scheduling 决定时（v0.X.Y 进入开发周期）：
1. `git mv dev/pool/<slug>.md → dev/versions/<slug>.md`
2. frontmatter: `scheduled-version: ~` → `scheduled-version: 0.X.Y`
3. 在 versions 文件中补 version field：`version: 0.X.Y` + `date: YYYY-MM-DD`
4. H1 标题可加 `# 0.X.Y — ...`（scheduling 后才允许）
5. body 中"目标版本：~（scheduling 决定）" 改为 "目标版本：v0.X.Y"

## 进度追踪

| 阶段 | 任务 | 状态 |
|---|---|---|
| P0 | 计划落地（Draft + Work）| 📝 pending |
| P1 | 归档 2 个 baseline-shipped | 📝 pending |
| P2 | 备份 5 个 pool brief | 📝 pending |
| P3 | git mv 8 个 versions → pool | 📝 pending |
| P4 | 8 个 pool 文件去版本化 | 📝 pending |
| P5 | 元文件更新 | 📝 pending |
| P6 | 守门 + 3 commit | 📝 pending |