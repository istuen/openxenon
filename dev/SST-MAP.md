# SST-MAP · OpenXenon 文档 SSOT 交叉索引

> **三层架构**：
> - **L1 用户文档** → `docs/{zh-cn,en}/`
> - **L2 开发文档** → `dev/`（本目录）
> - **L3 OXN 自举** → `.openxenon/`
>
> **生成**：手工维护 + `bun scripts/check-doc-sst-sync.ts` 自动补齐双语镜像状态
> **最后更新**：2026-07-09

---

## 1. SSOT 优先级

**冲突解决**：高优先级覆盖低优先级。

| 优先级 | 路径 | 用途 | Owner |
|---|---|---|---|
| 1 | [`AGENTS.md`](./AGENTS.md) | AI Agent 行为宪法 | issac |
| 2 | [`../docs/zh-cn/`](../docs/zh-cn/) | 中文用户文档（SSOT 中文） | issac |
| 2 | [`../docs/en/`](../docs/en/) | 英文镜像 | issac |
| 3 | [`architecture/`](./architecture/) | 内部架构 SSOT | issac |
| 4 | [`architecture/adr/`](./architecture/adr/) | 决策记录 SSOT | issac |
| 5 | [`changelog/`](./changelog/) | 版本变更 SSOT | issac |
| 6 | [`roadmap/`](./roadmap/) | 路线图 SSOT | issac |
| 7 | `design/` / `horizon/` | 长文设计 / 前瞻 | issac |
| — | `_archive/` / `roadmap/_archive/` | 归档，**不**参与 SSOT | — |

---

## 2. 核心概念 → SSOT 索引

| 概念 | SSOT | 引用 | 被引用 |
|---|---|---|---|
| **E1 Asset** | `docs/{zh-cn,en}/asset.md` | `changelog/0-6-3-asset-paper.md` | `docs/{zh-cn,en}/core-concepts.md` |
| **E2 Work** | `docs/{zh-cn,en}/work.md` | `architecture/work-and-task.md` | `docs/{zh-cn,en}/core-concepts.md`、`docs/{zh-cn,en}/llm-prompt.md` |
| **E3 Engine** | `docs/{zh-cn,en}/architecture.md` | `architecture/l0-l3-constitution.md` | `docs/{zh-cn,en}/cli.md` |
| **E4 Insight** | `docs/{zh-cn,en}/insight.md` | — | `docs/{zh-cn,en}/core-concepts.md` |
| **L0-L3 宪法** | `architecture/l0-l3-constitution.md` | `AGENTS.md` | `docs/{zh-cn,en}/architecture.md` |
| **Skill 协议** | `architecture/skills-module.md` | `AGENTS.md` | `docs/{zh-cn,en}/cli.md` |
| **Work 5 mode** | `architecture/work-mode.md` | `changelog/0-6-1-pr2-md-prefix.md` | `docs/{zh-cn,en}/work.md` |
| **IAP 错误码** | `architecture/iap-error-codes.md` | — | `docs/{zh-cn,en}/architecture.md` |
| **v0.6 RFC** | `../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md` | `AGENTS.md` | `architecture/l0-l3-constitution.md` |
| **v0.6.1 真实路线** | `changelog/0-6-1-asset-md-default.md` | `AGENTS.md` | `architecture/work-mode.md` |
| **v0.6.3 Asset Paper** | `changelog/0-6-3-asset-paper.md` | `docs/{zh-cn,en}/asset-paper.md` | `docs/{zh-cn,en}/asset.md` |
| **路线图** | `roadmap/README.md` | `changelog/` | `AGENTS.md` |

---

## 3. 双语镜像状态

由 `bun scripts/check-doc-sst-sync.ts` 自动产出。

> **最近一次扫描**：手动 / 待运行

| zh-cn | en | 行数比 | 状态 |
|---|---|---|---|
| `core-concepts.md` (326 行) | `core-concepts.md` (49 行) | 0.15 | ⚠️ **STALE** |
| `work.md` | `work.md` | — | 待扫描 |
| `insight.md` | `insight.md` | — | 待扫描 |
| `asset.md` | `asset.md` | — | 待扫描 |
| `asset-paper.md` | `asset-paper.md` | — | 待扫描 |
| `cli.md` | `cli.md` | — | 待扫描 |
| `proof.md` | `proof.md` | — | 待扫描 |
| `quickstart.md` | `quickstart.md` | — | 待扫描 |
| `faq.md` | `faq.md` | — | 待扫描 |
| `glossary.md` | `glossary.md` | — | 待扫描 |
| `roadmap.md` | `roadmap.md` | — | 待扫描 |
| `recipes.md` | `recipes.md` | — | 待扫描 |
| `extending.md` | `extending.md` | — | 待扫描 |
| `llm-prompt.md` | `llm-prompt.md` | — | 待扫描 |
| `iap-cheatsheet.md` | `iap-cheatsheet.md` | — | 待扫描 |
| `ddd-in-practice.md` | `ddd-in-practice.md` | — | 待扫描 |
| `architecture.md` | `architecture.md` | — | 待扫描 |

> 阈值：行数比 < 0.7 视为 STALE，需立即同步。

---

## 4. SUPERSEDED / 归档

### 4.1 RFC 与路线图

| 路径 | 状态 | 替代 |
|---|---|---|
| `.openxenon/pools/sprints/v0.6.x-observability-roadmap/`（**整体**） | SUPERSEDED 2026-07-09 | `changelog/0-6-1-asset-md-default.md` + `changelog/0-6-3-asset-paper.md` |
| `changelog/_archive/2026-07-05-archive-0-7-X-memory-superseded.md` | SUPERSEDED 2026-07-05 | `changelog/0-6-3-asset-paper.md` |
| `roadmap/_archive/v0.7.x-memory-rfc.md` | SUPERSEDED 2026-07-05 | `roadmap/v0.6.3-asset-paper.md` + `roadmap/v0.7.0-asset-graph.md` |

### 4.2 docs/ 历史归档

| 路径 | 状态 | 替代 |
|---|---|---|
| `docs/{en,zh-cn}/_archive/2026-07-05-archive-memory-superseded.md` | SUPERSEDED 2026-07-05 | 已删除（迁 `changelog/_archive/`） |
| `docs/architecture/v0.7-hall-migration-plan.md` | SUPERSEDED | v0.7 转向 Asset Graph |

### 4.3 历史 ADR 迁移

| 来源 | 去向 |
|---|---|
| `.openxenon/forges/splits/archive/docs-tmp-era/2026-05-XX-*.md` | `architecture/adr/0001-0047-*.md`（按时间顺序编号） |
| `.openxenon/forges/splits/archive/docs-tmp-era/decisions/0040-0047-*.md` | `architecture/adr/0040-0047-*.md`（保留原编号） |
| `.openxenon/forges/splits/archive/docs-tmp-era/decisions/0048-0051-*.md` | `architecture/adr/0048-0051-*.md`（保留原编号） |

---

## 5. 修订记录

| 日期 | 修订 | 作者 |
|---|---|---|
| 2026-07-09 | 初版（v0.6.1 release 后落地） | opencode + issac |