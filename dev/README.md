# dev/ — OpenXenon 开发者文档

> **本目录是 OpenXenon 项目自身的开发文档，不是用户文档。**
>
> 三层文档架构：
>
> | 层 | 用途 | 路径 |
> |---|---|---|
> | **L1 用户文档** | 用 OXN 的工程师读 | [`../docs/`](../docs/) |
> | **L2 开发文档**（本目录） | 维护者 + AI Agent 读 | `dev/` |
> | **L3 OXN 自举** | OXN 自己读 / 写 | [`../.openxenon/`](../.openxenon/) |
>
> **AI Agent 入口**：[`AGENTS.md`](./AGENTS.md)
> **完整 SSOT 交叉索引**：[`SST-MAP.md`](./SST-MAP.md)

---

## 1. 目录结构

| 子目录 | 内容 | 谁写 |
|---|---|---|
| `architecture/` | 内部架构（含 L0-L3 宪法、错误码、模块边界） | 维护者 |
| `architecture/adr/` | 全部架构决策记录（ADR-0001+） | 维护者 |
| `changelog/` | 全部版本 changelog 片段（v0.0.1 ~ v0.8.0+） | 维护者 |
| `changelog/_archive/` | SUPERSEDED 片段 | 仅审计 |
| `releases/` | 发布说明（合并 changelog + 升级指南） | 维护者 |
| `design/` | 长文设计稿 / RFC | 维护者 + AI |
| `horizon/` | 前瞻（v0.7+ 战略、长期路线） | 维护者 |
| `guides/` | 开发者操作指南（如何本地开发 / 调试 / 发布） | 维护者 |
| `decisions/` | 重大决策记录（不在 ADR 范畴的 meta 决策） | 维护者 |
| `roadmap/` | 路线图（实际路线 + 历史归档） | 维护者 |
| `roadmap/_archive/` | SUPERSEDED 路线图 | 仅审计 |

---

## 2. 受众

| 角色 | 读什么 |
|---|---|
| **OXN 维护者（issac）** | 全部 |
| **AI Agent 协作者** | 必读 `AGENTS.md` + `SST-MAP.md`；按需读其他 |
| **新贡献者** | 先读本 README → `guides/getting-started-dev.md` |
| **用户** | 请移步 [`../docs/`](../docs/) |

---

## 3. 跨层引用规则（强约束）

### 3.1 单向引用

```
L1 docs/  ──→  L2 dev/        ✅ 允许（用户深入了解）
L2 dev/   ──→  L1 docs/       ❌ 禁止（dev/ 应独立可读）
L2 dev/   ──→  L3 .openxenon/ ✅ 允许（RFC 引用具体 sprint 文档）
L3 .openxenon/ ──→ L2 dev/    ❌ 禁止（OXN 自举不引用开发者文档）
L3 .openxenon/ ──→ L1 docs/   ⚠️ 谨慎（OXN 自举读用户 SSOT）
```

### 3.2 守门机制

由 `scripts/check-doc-boundary.ts` 在 pre-commit 自动校验：

- L1 docs/ 不准反向引用 L3 .openxenon/
- L2 dev/ 不准反向引用 L1 docs/
- L1 docs/architecture/ 不准含 `ADR-\d{4}` 编号（迁 dev/architecture/adr/）

---

## 4. 文档 SSOT 优先级

冲突解决：高优先级覆盖低优先级。

| 优先级 | 路径 | 用途 |
|---|---|---|
| 1 | [`AGENTS.md`](./AGENTS.md) | AI Agent 行为宪法 |
| 2 | [`SST-MAP.md`](./SST-MAP.md) | 交叉索引 |
| 3 | `architecture/` | 内部架构 SSOT |
| 4 | `architecture/adr/` | 决策记录 SSOT |
| 5 | `changelog/` | 版本变更 SSOT |
| 6 | `roadmap/` | 路线图 SSOT |
| 7 | `design/` / `horizon/` | 长文设计 / 前瞻 |
| — | `_archive/` | 归档，**不**参与 SSOT |

---

## 5. ADR 编号规则

| 区间 | 含义 | 来源 |
|---|---|---|
| `0000` | 模板 | `architecture/adr/0000-template.md` |
| `0001` ~ `0047` | docs-tmp 时代 ADR | 从 `.openxenon/forges/splits/archive/docs-tmp-era/` 迁入 |
| `0048` ~ `0051` | Asset Paper 4 ADR | 从 `.openxenon/forges/splits/archive/docs-tmp-era/decisions/` 迁入 |
| `0052+` | 新 ADR | 新决策按顺序编号 |

每篇 ADR 必须：
1. 顶部含 `status: PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED`
2. 顶部含 `date: YYYY-MM-DD`
3. 至少含 `## Context` / `## Decision` / `## Consequences` 三节
4. 标题格式：`ADR-NNNN: <一句话标题>`

---

## 6. 维护脚本

```bash
# 三层文档边界守门
bun scripts/check-doc-boundary.ts

# 双语镜像同步率
bun scripts/check-doc-sst-sync.ts

# L3 SUPERSEDED RFC 守门
bun scripts/check-superseded-rfcs.ts

# 聚合入口
bun run check:doc-sst
```

均在 `lefthook.yml` 的 pre-commit hook 中自动运行。

---

## 7. 相关 RFC 与决策

- **v0.6 IAP 架构重构**：[`../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md`](../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- **v0.6.x observability-roadmap**：[`../.openxenon/pools/sprints/v0.6.x-observability-roadmap/`](../.openxenon/pools/sprints/v0.6.x-observability-roadmap/)（**SUPERSEDED**，见 `decisions/`）
- **三层架构决策**：[`decisions/2026-07-XX-three-tier-doc-arch.md`](./decisions/2026-07-XX-three-tier-doc-arch.md)

---

## 8. 版本

| 字段 | 值 |
|---|---|
| 创建 | 2026-07-09 |
| 关联 PR | feat/doc-three-tier-arch |
| 最近更新 | 2026-07-09 |