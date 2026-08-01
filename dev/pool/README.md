# `dev/pool/` — 规划池（Planning Pool）

> **情态**：描述性 Doc（前瞻性规划备选）
> **命名**：每个文件以 `<slug>.md` 命名，对应一个待规划的 entry
> **frontmatter**：`id` / `theme` / `priority` / `status` / `created-at` / `scheduled-version` —— **无 `version` 字段**
> **锁定**：RFC-0013 Errata 2026-07-27（grilling session） + [`oxn-project-domain.md`](../../.openxenon/assets/domains/oxn-project-domain.md#planning-pool)

## 目录说明

`dev/pool/` 存放 OXN 项目**前瞻性规划备选**——尚未绑定到具体版本的计划集合。每个 entry 代表一个待规划的 feature / RFC / architecture 工作，可由工程师 mental commit 后入池，由 scheduling 决定绑到哪个版本。

## 与 `dev/versions/` 的关系

| 维度 | `dev/pool/`（当前）| `dev/versions/`（version-bound）|
|---|---|---|
| **情态** | 描述性 Doc（备选池）| 描述性 Doc（已绑版本）|
| **frontmatter version 字段** | ❌ 无（`scheduled-version: ~`）| ✅ 必填 |
| **入池/出池动作** | 工程师 mental commit 后入池 | scheduling 时从 pool 移过来 + 补 version |
| **文件命名** | `<slug>.md` | `0-X-Y-<slug>.md` |
| **frontmatter 必填** | `id` / `theme` / `priority` / `status` / `created-at` | `version` / `date` / `type` / `status` |

**当前 `dev/versions/` 为空**——所有计划都先入池，待 0.6.x 自举完成后由工程师调度绑版本。

## frontmatter schema

```yaml
---
id: <slug>                   # kebab-case, 文件名同
theme: <人类可读主题>          # 简短中文描述
priority: low | medium | high # 优先级（工程师判定）
status: planned              # 当前只允许 planned（scheduling 后改 scheduled）
created-at: YYYY-MM-DD       # 入池时间
scheduled-version: ~         # ~ 表示未绑；scheduling 后改为 0.X.Y
synced-at: YYYY-MM-DD        # 最后一次同步时间
note: |                       # 备注（可选）
  任意多行备注
---
```

## 生命周期

```
1. 入池 (planned):
   - 工程师 mental commit → 创建 dev/pool/<slug>.md
   - status: planned, scheduled-version: ~
   - 必须有 RFC 草稿或 ADR 引用作为依据

2. 调度 (scheduled):
   - 工程师判定本 entry 进入下一开发周期
   - git mv dev/pool/<slug>.md dev/versions/0-X-Y-<slug>.md
   - 补 version / date / type 字段
   - scheduled-version: 0.X.Y

3. 转正 (released):
   - 版本转正时（alpha → stable）
   - 创建对应 .changes/0-X-Y-*.md（Version Fragment）
   - git mv dev/versions/0-X-Y-<slug>.md .openxenon/.archived/dev/versions/
   - （roadmap 文件归档，不删除）
```

## 当前内容（2026-07-27 grilling session 后）

| id | theme | priority | status | 来源 |
|---|---|---|---|---|
| `emergence` | 涌现层骨架 + Insight 工程化 + Hall v0.5 + Infra Ports | high | planned | 从 `dev/versions/0-7-0-emergence.md` 迁入 |
| `asset-graph` | Asset 影响图（Mermaid/DOT 渲染）| medium | planned | 从 `dev/versions/0-7-0-asset-graph.md` 迁入 |
| `ai-three-modes` | AI 三模式（Edit / Plan / Apply）| medium | planned | 从 `dev/versions/0-7-1-ai-three-modes.md` 迁入 |
| `anchor-slot` | Anchor slot 机制 | medium | planned | 从 `dev/versions/0-7-2-anchor-slot.md` 迁入 |
| `term-upstream-dag` | Term 上游 DAG | low | planned | 从 `dev/versions/0-8-0-term-upstream-dag.md` 迁入 |
| `engine-closure-self-verify` | Engine 闭环自证（Work 模板）| **critical** | planned | 2026-07-27 grilling session 新增 |
| `npm-ship-path` | npm 发版路径（自举完成 → Release）| **critical** | planned | 2026-07-27 grilling session 新增 |

## 调度判据（工程师 mental commit）

入池是必要不充分——只有满足以下条件才能入池：

1. **RFC 主题已定**（不是 spike 或开放探索）
2. **有最小 RFC 草稿**（在 `.openxenon/drafts/rfc/` 下或 ADR 引用）
3. **工程师 mental commit 会做**（不是"未来也许"）

调度（scheduled-version 填值）的判据：

1. **前置 entry 已完成或可并入**（dependency graph 清晰）
2. **0.6.x 自举完成**（Engine closure v2 达成）—— 这是 0.7.0 起的硬约束
3. **Release 路径清晰**（npm ship 路径已打通）

## 参考

- RFC-0013 D3 版本相关文档三情态分离（已被 Errata 2026-07-27 补充）
- RFC-0013 D4 AssetMap ≠ Roadmap
- `.openxenon/assets/domains/oxn-project-domain.md#planning-pool` —— 本术语权威定义
- 2026-07-27 grilling session 产出（见 `.changes/0-6-2-alpha-1-pool-and-glossary.md`）