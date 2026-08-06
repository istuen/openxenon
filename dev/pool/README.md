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
| **情态** | 描述性 Doc（备选池，未绑版本）| 描述性 Doc（已绑版本，含 `version` 字段）|
| **frontmatter version 字段** | ❌ 无（`scheduled-version: ~`）| ✅ scheduling 后 git mv 时补 |
| **入池/出池动作** | 工程师 mental commit 后入池 | scheduling 时从 pool `git mv` 过来 + 补 `version: 0.X.Y` |
| **文件命名** | `<slug>.md` | `<slug>.md`（与 pool 一致）|
| **frontmatter 必填** | `id` / `theme` / `priority` / `status` / `created-at` / `scheduled-version` | `version` / `date` / `type` / `status` |

**当前 `dev/versions/` 为空**——所有规划先入 pool，待 0.6.x 自举完成后由工程师调度绑版本。

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
rfc:                           # 可选：引用的 RFC 路径列表
  - <rfc-path>
adr:                           # 可选：引用的 ADR 路径列表
  - <adr-path>
baseline:                      # 可选：已 ship 的 baseline 路径列表（可选）
  - <baseline-path>
promoted-from: <path>          # 可选：从 draft/rfc promoted 来的路径
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
   - git mv dev/pool/<slug>.md dev/versions/<slug>.md
   - 补 version / date / type 字段
   - scheduled-version: 0.X.Y
   - H1 可加版本前缀 `# 0.X.Y — ...`（scheduling 后允许）

3. 转正 (released):
   - 版本转正时（alpha → stable）
   - 创建对应 .changes/0-X-Y-*.md（Version Fragment）
   - git mv dev/versions/<slug>.md .openxenon/.archived/dev/versions/<slug>.md
   - （roadmap 文件归档，不删除）
```

## 当前内容（2026-08-06 dev-versionless-pooling 后）

| id | theme | priority | status | 来源 |
|---|---|---|---|---|
| `emergence` | 涌现层骨架 + Insight 工程化 + Hall v0.5 + Infra Ports | high | planned | 从 `dev/versions/0-7-0-emergence.md` 回滚（去版本化）|
| `asset-graph` | Asset 影响图（Mermaid/DOT 渲染）| medium | planned | 从 `dev/versions/0-7-0-asset-graph.md` 回滚（去版本化）|
| `ai-three-modes` | AI 三模式（Edit / Plan / Apply）| medium | planned | 从 `dev/versions/0-7-1-ai-three-modes.md` 回滚（去版本化）|
| `anchor-slot` | Anchor slot 机制 | medium | planned | 从 `dev/versions/0-7-2-anchor-slot.md` 回滚（去版本化）|
| `term-upstream-dag` | Term 上游 DAG | low | planned | 从 `dev/versions/0-8-0-term-upstream-dag.md` 回滚（去版本化）|
| `infra-ports` | Infra Ports 扩展：ResourcePort / CachePort / WorkSnapshot | high | planned | 从 `dev/versions/0-7-0-infra-ports.md` 回滚（去版本化）|
| `work-unified-model` | Work 统一模型 + 引用收敛 + Round 改进 | high | planned | 从 `dev/versions/0-7-0-work-unified-model.md` 回滚（去版本化）|
| `probe-system-evolution` | Probe 体系演进（追溯 + 内外拆 + 目标成果分类）| medium | planned | 从 `dev/versions/0-8-1-probe-system-evolution.md` 回滚（去版本化）|
| `engine-closure-self-verify` | Engine 闭环自证（Work 模板）| **critical** | planned | 2026-07-27 grilling session 新增 |
| `npm-ship-path` | npm 发版路径（自举完成 → Release）| **critical** | planned | 2026-07-27 grilling session 新增 |

> 注：5 个 slug（emergence/asset-graph/ai-three-modes/anchor-slot/term-upstream-dag）原本在 `dev/pool/` 有 brief 摘要，已在 2026-08-06 dev-versionless-pooling 工作中备份到 `.openxenon/.archived/dev/pool/<slug>-brief-2026-07-28.md`，新 pool 文件内容来自 versions/ 中的 detail 版本。

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
- 2026-08-06 dev-versionless-pooling 计划：`.openxenon/drafts/doc-dev-versionless-pooling.md`