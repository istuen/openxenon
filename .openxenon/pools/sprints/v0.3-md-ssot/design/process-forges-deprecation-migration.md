# forges/ 分类与 Intent 迁移实际执行记录（v0.3 阶段 3）

> **日期**：2026-06-21
> **状态**：✅ 已完成（v0.3 阶段 3 实际执行）
> **基础**：[`md-ssot-system.md` v3.2](./md-ssot-system.md) §1.1 + [`intent-ssot-boundary.md` v1.0](./intent-ssot-boundary.md) §2

---

## 0. 实际执行摘要（v0.3 阶段 3）

**v0.3 阶段 3 关键发现**：

`forges/` 48 个文档 ≠ 全部是 Intent 决策。**只有 7 篇是 OpenXenon 内部 Intent 决策**，其余 41 篇是 v0.1.x / v0.2.x 历史过程产物，应**保留在 `forges/`** 作为外部参考。

| 类别 | 数量 | 处理 | 目标位置 |
|---|---|---|---|
| **Intent 决策** | 5 | ✅ 迁移 | `pools/sprints/v0.3-md-ssot/{design,journal}/` |
| **DEPRECATED 路线** | 2 | ✅ 归档 | `pools/sprints/v0.3-md-ssot/_archive/2026-06/` |
| **v0.1.x / v0.0.x 历史** | 23 | 🟡 **保留 forges/** | forges/ 不变 |
| **Sprint 1-9 设计稿** | 16+1 | 🟡 **保留 forges/** | forges/sprints/ 不变 |
| **Ponytail Analysis** | 1 | 🟡 **保留 forges/** | forges/ 不变 |
| **总计** | **48** | — | — |

**关键决策**（v0.3 §1.1 边界规则）：
> `forges/` 物理目录**保留**为外部历史源；不再"物理删除"（v0.2 计划已废除）。

---

## 1. 分类规则

### 1.1 Intent vs 外部判定

| 文档特征 | 判定 | 处理 |
|---|---|---|
| v0.3 决策类（路线 C / Taint / Three-Layer / Domain SSOT / Intent Pool）| **Intent** | 迁移到 `pools/sprints/v0.3-md-ssot/` |
| DEPRECATED 路线（route A / route B）| Intent Archive | 归档到 `_archive/2026-06/` |
| v0.1.x / v0.2.x sprint 1-9 设计稿 | 外部 | 保留 `forges/sprints/` |
| v0.1.x / v0.0.x 各类设计稿 | 外部 | 保留 `forges/` |
| v0.2.0 各类审计 / 复盘 / 分析 | 外部 | 保留 `forges/` |

### 1.2 forges/ 不再"废弃"

**v0.2 计划（已废除）**：`forges/` 物理删除（v0.3 阶段 5 强制）

**v0.3 阶段 3 修正**：`forges/` **永久保留**为外部历史源

理由：
1. 51 篇中只有 7 篇是 v0.3 Intent 决策
2. 其余 41 篇是 v0.1.x / v0.2.x 实施历史，OpenXenon 不应控制
3. 物理删除将丢失大量过程产物，影响未来审计与回溯

---

## 2. 实际迁移映射表（v0.3 阶段 3）

### 2.1 Group A — Intent 决策（5 篇）→ `pools/sprints/v0.3-md-ssot/`

| 旧路径（`forges/`） | 新路径 | 角色 |
|---|---|---|
| `2026-06-13-intent-pool-design.md` | `pools/sprints/v0.3-md-ssot/journal/2026-06-13-intent-pool-design-v0.3.0.md` | Intent Pool v3 决策 |
| `2026-06-14-probe-signal-taint-design.md` | `pools/sprints/v0.3-md-ssot/design/probe-signal-taint-design.md` | Probe Taint 系统设计 |
| `2026-06-14-three-layer-proof-design.md` | `pools/sprints/v0.3-md-ssot/design/three-layer-proof-design.md` | Three-Layer Proof 设计 |
| `2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md` | `pools/sprints/v0.3-md-ssot/design/domain-as-ssot-doc-binding.md` | Domain SSOT 提议 |
| `2026-06-18-md-as-canonical-rewrite-design.md` | `pools/sprints/v0.3-md-ssot/journal/2026-06-18-md-canonical-v1.md` | **路线 C v1 基线**（v0.3 战略起点）|

### 2.2 Group B — DEPRECATED 路线（2 篇）→ `_archive/2026-06/`

| 旧路径（`forges/`） | 新路径 | 角色 |
|---|---|---|
| `2026-06-18-md-as-friendly-view-spike-design.md` | `pools/sprints/v0.3-md-ssot/_archive/2026-06/2026-06-18-md-friendly-view-deprecated.md` | **路线 A**（DEPRECATED）|
| `2026-06-18-ddd-terms-decouple-oxl-grammar-design.md` | `pools/sprints/v0.3-md-ssot/_archive/2026-06/2026-06-18-ddd-terms-deprecated.md` | **路线 B**（DEPRECATED）|

**`_archive/` 目录约定**（v0.3 阶段 0 引入）：
- 位置：`pools/sprints/v0.3-md-ssot/_archive/2026-06/`
- 命名：`<原文件名>-deprecated.md`
- 永久保留，不修改
- 标注 `[DEPRECATED]` 头（人工标注，v0.4 自动化）

### 2.3 Group C — 外部保留（41 篇）→ **forges/ 不变**

| 类别 | 文档数 | 保留路径 |
|---|---|---|
| v0.0.27 pre-release 设计 | 4 | `forges/2026-06-11-v0.0.27-*.md` |
| v0.0.27 审计 | 1 | `forges/2026-06-11-v0.0.27-product-audit.md` |
| v0.1.0 pre-publish | 1 | `forges/2026-06-11-v0.1.0-pre-publish-design.md` |
| v0.1.x 各类（code quality / i18n / docs site / work CLI / product manual）| 5 | `forges/2026-06-12-*.md` |
| v0.1.x 审计（rename / infra state diff）| 2 | `forges/2026-06-11-*-audit*.md` |
| v0.0.x / 早期 runtime adapter | 2 | `forges/2026-06-11-runtime-adapter-design.v0.2.deprecated.md` + `arch-discussion.md` |
| Probe mount / Git workflow workspace | 2 | `forges/2026-06-11-probe-mount-system-design.md` + `git-workflow-workspace.md` |
| Runtime adapter v0.3 | 1 | `forges/2026-06-11-runtime-adapter-design.v0.3.md` |
| Daemon functional / Infra IO | 2 | `forges/2026-06-11-daemon-functional-design.md` + `infra-io-layer-reorg.md` |
| i18n / Grammar deps fix | 2 | `forges/2026-06-11-i18n-version-drift.md` + `grammar-deps-fix-design.md` |
| Test coverage / work journal | 2 | `forges/2026-06-11-*-work-journal.md` + `*-test-coverage.md` |
| Ponytail analysis | 1 | `forges/2026-06-16-ponytail-analysis.md` |
| **Subtotal top-level** | **23** | — |
| Sprint 1-9 设计稿 | 17 | `forges/sprints/sprint-{1,2,3a,3b,3c,3d,4,5a,5b,5c,5d,6,7,8,9}/*.md` |
| EXECUTION-ORDER | 1 | `forges/sprints/EXECUTION-ORDER.md` |
| **Subtotal sprints/** | **18** | — |
| **Total Group C** | **41** | forges/ 不变 |

---

## 3. 与 v0.2 计划的差异

| 维度 | v0.2 计划 | v0.3 实际 |
|---|---|---|
| forges/ 物理删除 | 阶段 5 强制 | **永久保留**（废除）|
| 迁移目标 | `pools/{5 池}/` | `pools/sprints/v0.3-md-ssot/{design,journal}/` |
| 迁移文档数 | 51 全量 | **7 篇**（5 Intent + 2 Archive）|
| 分类方式 | 按文档类型 | 按"是否 OpenXenon 内部决策" |
| 归档目录 | `_archive/2026-06-forges/` | `_archive/2026-06/`（单期）|

---

## 4. v0.3 阶段 3 验证

| 项 | 数据 |
|---|---|
| 实际迁移 | 7 篇（5 Intent + 2 Archive）|
| 保留 forges/ | 41 篇（23 top-level + 18 sprints/）|
| 迁移后 forges/ 文档总数 | 48 - 7 = 41 ✓ |
| pools/sprints/v0.3-md-ssot/ 总文档数 | 18 + 7 = 25（含迁移）|
| typecheck / lint / test | 0 error / 1524 pass / 0 fail |

---

## 5. 后续

- **v0.4.0**：考虑在 `forges/` 添加 README 说明其角色为"外部历史源"
- **v0.4.0**：考虑为 forges/ 添加 CHANGELOG（按 v0.1.x / v0.2.x 分组）
- **v0.4.0**：修复 `.gitignore` 第 83 行（`pools/*/!(.gitkeep)` 实际未生效）
