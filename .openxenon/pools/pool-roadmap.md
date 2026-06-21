# OpenXenon Intent Pool 地图

> **角色**：`.openxenon/pools/` 目录的入口与导航。读者从这里进入任何 pool 文档。
>
> **读者**：v0.2.0+ 所有参与者（AI 协作者 + 人类协作者）
>
> **维护**：每次新增 / 移动 / 废弃 pool 文档时同步更新本文
>
> **版本**：v0.2.0（持续维护，无版本绑定）

---

## What — Intent Pool 是什么

Intent Pool 是 OpenXenon v0.2.0（T13）引入的**思考资产池**，存放设计 / 审计 / 决策 / 调研 / 问题等"过程产物"。

它与 IAP 全栈的关系：

| 类别 | 路径 | 角色 | 何时写入 |
|---|---|---|---|
| **Intent 资产** | `domains/` `blueprints/` | 业务声明 + AI 创作模板 | IAP Intent 阶段 |
| **Align 资产** | `works/` `tasks/` | 工作执行 | IAP Align 阶段 |
| **Proof 资产** | `proofs/` | frozen.json 验证 | IAP Proof 阶段 |
| **Pool 资产** | `pools/{research,design,issue,audit,journal}/` | **过程产物** | 全程 |
| **Sprint 资产** | `pools/sprints/<sprint-name>/` | **版本化 sprint 文档** | Sprint 期间 |

**目录结构**（v0.3 sprint 化后）：

```
.openxenon/pools/
├── pool-roadmap.md              # 本入口（顶层 tracked）
├── research/                    # 5 池（保持 5 池结构）
├── design/                      # 5 池（当前为空；sprint 文档进 sprints/）
├── issue/                       # 5 池
├── audit/                       # 5 池
├── journal/                     # 5 池
└── sprints/                     # 版本化 sprint 容器
    └── v0.3-md-ssot/            # v0.3 sprint 文档集
        ├── design/  (14 篇)
        ├── audit/   (2 篇)
        └── journal/ (1 篇)
```

**5 类池的角色分工**：

| 池 | 角色 | 何时写入 | 谁来写 |
|---|---|---|---|
| `research/` | 调研材料、外部参考、技术雷达 | 调研阶段 | 任何人 |
| `design/` | 长期架构决策（5 池常规）| 决策 + 设计阶段 | 设计者 |
| `issue/` | 问题追踪、bug 报告、风险评估 | 发现问题时 | 任何人 |
| `audit/` | 长期审计记录 | 版本收尾 | 审计者 |
| `journal/` | 长期决策日志 | 关键节点 | 决策者 |

---

## Why — 为什么需要 Pool + Sprints

**问题**（v0.1.x 时代）：所有设计文档堆在 `.openxenon/forges/` 单一目录（51 篇），导致：
- 文档无分类，找不到入口
- 决策 / 审计 / 调研混杂，难以追溯
- 命名混乱（`2026-06-XX-topic.md` + 偶尔带版本）
- 跨版本对比困难（v0.2 vs v0.3 文档混在一起）

**解决**（v0.2.0 T13 + T14 + v0.3 sprint 化）：
- 5 类池按"思考类型"清晰分类
- **v0.3 新增**：`pools/sprints/<sprint-name>/` 子目录——按版本/主题归类 sprint 文档
- 每类池有独立 CLI（`oxn pool create research|design|issue|audit|journal`）
- IAP 资产（`domains/blueprints/works/proofs/`）与 pool 文档分离
- 命名规范化（见 [`naming-system.md`](./sprints/v0.3-md-ssot/design/naming-system.md) v1.0）
- forges/ 计划于 v0.3 阶段 5 物理删除（详见 `process-forges-deprecation-migration.md`）

---

## How — 如何使用

### 当前 Sprint 概览

| Sprint | 状态 | 文档数 | 阶段 |
|---|---|---|---|
| **v0.3-md-ssot** | 🟡 阶段 0（设计收尾）| 16 篇 | 2026-06-20 ~ |

### 当前文档地图

#### `pools/sprints/v0.3-md-ssot/` 详解

##### `design/` — 14 篇（v0.3 规划核心）

**核心架构（3 篇，必读）**：

| 文档 | 角色 | 行数 |
|---|---|---|
| [`md-ssot-system.md`](./sprints/v0.3-md-ssot/design/md-ssot-system.md) | MD-SSOT 系统架构（路线 C v3.2 + 4 风险协议 + 范围收窄）| 521 |
| [`v0.3.0-roadmap.md`](./sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md) | v0.3 路线图（**2 阶段 ~6 周，v3.1 收窄**）| 353 |
| [`intent-ssot-boundary.md`](./sprints/v0.3-md-ssot/design/intent-ssot-boundary.md) | **Intent SSOT 边界权威定义（v1.0）**| 411 |

**v0.3 阶段文档（5 篇，特定于 v0.3.0）**：

| 文档 | 角色 | 行数 |
|---|---|---|
| [`req-md-ssot-v0.3.0.md`](./sprints/v0.3-md-ssot/design/req-md-ssot-v0.3.0.md) | v0.3 需求（R1-R5）| 165 |
| [`arch-md-ssot-v0.3.0.md`](./sprints/v0.3-md-ssot/design/arch-md-ssot-v0.3.0.md) | v0.3 架构 | 298 |
| [`dev-design-md-ssot-v0.3.0.md`](./sprints/v0.3-md-ssot/design/dev-design-md-ssot-v0.3.0.md) | v0.3 实施路径 | 524 |
| [`test-design-md-ssot-v0.3.0.md`](./sprints/v0.3-md-ssot/design/test-design-md-ssot-v0.3.0.md) | v0.3 测试设计 | 468 |
| [`product-md-ssot-overview-v0.3.0.md`](./sprints/v0.3-md-ssot/design/product-md-ssot-overview-v0.3.0.md) | v0.3 产品视角 | 337 |

**跨切架构（6 篇）**：

| 文档 | 角色 | 行数 |
|---|---|---|
| [`l0-l3-alignment.md`](./sprints/v0.3-md-ssot/design/l0-l3-alignment.md) | L0–L3 兼容 + mdast 接入 | 341 |
| [`arch-v0.2.0-feature-matrix.md`](./sprints/v0.3-md-ssot/design/arch-v0.2.0-feature-matrix.md) | v0.2.0 除 Pool 外 7 大特性矩阵 | 268 |
| [`process-pool-operation.md`](./sprints/v0.3-md-ssot/design/process-pool-operation.md) | Pool 完整生命周期（create→write→freeze→scan→archive）| 458 |
| [`naming-system.md`](./sprints/v0.3-md-ssot/design/naming-system.md) | OpenXenon 文档命名体系 v1.0（**v0.4.0 再规划**）| 463 |
| [`process-version-iteration-flow.md`](./sprints/v0.3-md-ssot/design/process-version-iteration-flow.md) | 版本迭代流（5 scripts，**v0.4.0 再规划**）| 419 |
| [`process-forges-deprecation-migration.md`](./sprints/v0.3-md-ssot/design/process-forges-deprecation-migration.md) | 51 forges/ → pools/ 分类迁移（**v0.4.0**）| 297 |

##### `audit/` — 2 篇（v0.2.0 收尾审计）

| 文档 | 角色 | 行数 |
|---|---|---|
| [`audit-v0.2.0-md-ssot-readiness.md`](./sprints/v0.3-md-ssot/audit/audit-v0.2.0-md-ssot-readiness.md) | v0.2.0 MD-SSOT 准备度审计（85%）| 222 |
| [`retro-v0.2.0-roadmap-execution.md`](./sprints/v0.3-md-ssot/audit/retro-v0.2.0-roadmap-execution.md) | v0.2.0 路线图执行复盘（15/15 PR）| 321 |

##### `journal/` — 1 篇（v0.3 决策日志）

| 文档 | 角色 | 行数 |
|---|---|---|
| [`2026-06-20-md-ssot-decision.md`](./sprints/v0.3-md-ssot/journal/2026-06-20-md-ssot-decision.md) | MD-SSOT 5 项关键决策日志 | 323 |

#### `pools/{research,design,issue,audit,journal}/` 顶层

5 池顶层目录保留（结构不变），**当前为空**（v0.3 sprint 文档已统一归入 `sprints/v0.3-md-ssot/`）。

**何时使用 5 池顶层**（vs sprints/）：
- **5 池顶层**：长期保留、跨版本适用的资产（如 `domain/MD-SSOT-System.md` 风格）
- **sprints/**：特定版本的 sprint 文档（v0.3 / v0.4 / ...）

---

### 命名规范（v1.0 简版）

完整规范见 [`sprints/v0.3-md-ssot/design/naming-system.md`](./sprints/v0.3-md-ssot/design/naming-system.md) §2-§4。

**格式**：`<scope>-<topic-slug>[-v<X.Y.Z>][@<status>].md`

**典型示例**：

```
sprints/v0.3-md-ssot/design/req-md-ssot-v0.3.0.md     # v0.3 需求
sprints/v0.3-md-ssot/design/naming-system.md           # 跨切命名规范
sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md          # 版本路线图（带版本）
sprints/v0.3-md-ssot/journal/2026-06-20-...md         # 日期前缀日志
sprints/v0.3-md-ssot/audit/audit-v0.2.0-...md         # 准备度审计
sprints/v0.3-md-ssot/audit/retro-v0.2.0-...md         # 复盘
```

---

### 添加新文档 — 5 步流程

1. **选位置**：
   - **跨版本适用** → `pools/{research,design,issue,audit,journal}/` 顶层 5 池
   - **特定 sprint** → `pools/sprints/<sprint-name>/{design,audit,journal}/`
2. **命名**：按 `<scope>-<topic>[-v<X.Y.Z>][@<status>].md` 格式
3. **创建**（二选一）：
   ```bash
   oxn pool create <type> <name>     # 5 池顶层（v0.2.0 已实施）
   ```
   或手动：`touch .openxenon/pools/<sprint>/<type>/<doc>.md`
4. **写头骨架**：
   ```markdown
   # <标题>

   > **角色**：...
   > **读者**：...
   > **版本**：v<X.Y.Z> / @<status>
   > **关联**：...
   ```
5. **同步本文**：在 `pool-roadmap.md` 对应 sprint/池章节添加条目

**CLI 命令**（v0.2.0 已实施）：

| 命令 | 角色 |
|---|---|
| `oxn pool list` | 列出所有池文档（含 sprints/）|
| `oxn pool create <type> <name>` | 新建池文档（含 frozen.json 落盘）|
| `oxn pool show <name>` | 查看文档元数据 + 校验 |

---

### 跨切架构入口（适用所有版本）

`pools/sprints/v0.3-md-ssot/design/` 中的 **6 篇跨切架构文档**适用于所有版本，是查阅最频繁的入口：

| 何时查阅 | 查阅 |
|---|---|
| 启动 v0.3 任意阶段前 | [`v0.3.0-roadmap.md`](./sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md)（**v3.1 收窄 2 阶段**）|
| 涉及文档 / MD 解析时 | [`md-ssot-system.md`](./sprints/v0.3-md-ssot/design/md-ssot-system.md)（**v3.2 + 4 风险协议**）|
| 创建/分类任何 .openxenon/ 文档前 | [`intent-ssot-boundary.md`](./sprints/v0.3-md-ssot/design/intent-ssot-boundary.md)（v1.0 边界权威）|
| 创建任何 pool / IAP 文档前 | [`naming-system.md`](./sprints/v0.3-md-ssot/design/naming-system.md)（**v0.4.0 再规划**）|
| 涉及版本号 / release 时 | [`process-version-iteration-flow.md`](./sprints/v0.3-md-ssot/design/process-version-iteration-flow.md)（**v0.4.0 再规划**）|
| 涉及 forges/ 迁移时 | [`process-forges-deprecation-migration.md`](./sprints/v0.3-md-ssot/design/process-forges-deprecation-migration.md)（**v0.4.0**）|
| 涉及 kernel/infra/oxl/builtin 时 | [`l0-l3-alignment.md`](./sprints/v0.3-md-ssot/design/l0-l3-alignment.md) |
| 理解 Pool 内部机制时 | [`process-pool-operation.md`](./sprints/v0.3-md-ssot/design/process-pool-operation.md) |
| 查阅 v0.2.0 重点特性时 | [`arch-v0.2.0-feature-matrix.md`](./sprints/v0.3-md-ssot/design/arch-v0.2.0-feature-matrix.md) |

---

## 维护规则

| 场景 | 操作 |
|---|---|
| **新增** | 写完新文档后立即在本文对应 sprint/池章节添加条目 |
| **移动** | 跨 sprint 迁移时同步更新 §当前文档地图 + `naming-system.md` §附录 |
| **废弃** | 标记 `[DEPRECATED]` + 归档到 `pools/sprints/<sprint>/_archive/<YYYY-MM>/` |
| **Sprint 完结** | 冻结 `pools/sprints/<sprint-name>/`；保留为只读历史 |
| **命名** | 所有改动遵循 `naming-system.md` v1.0 |
| **CI 校验**（**v0.4.0 实施**）| `bun scripts/check-heading-skeleton.ts` + `bun scripts/check-naming.ts` |

### Sprint 完结流程（v0.3 完成后）

1. 冻结 `pools/sprints/v0.3-md-ssot/`（标记为 `status: completed`）
2. 写 `pools/sprints/v0.3-md-ssot/audit/retro-v0.3.0-roadmap-execution.md`
3. 启动 `pools/sprints/v0.4.0-*/`（下一 sprint）

### 是否对应小版本？

**Sprint 完结 = Minor 版本**（OpenXenon 约定）：
- 完整 sprint 完结 → `v0.X.0` minor 版本
- Sprint 内 checkpoint → 内部 tag（如 `v0.3.0-sprint-1`），**不计入版本号**
- Patch 版本（`v0.X.Y`）= bug 修复；Minor 版本（`v0.X.0`）= 新 sprint 完结

**示例**（v0.3.0 计划）：
- `v0.3.0-sprint-1` 完成 unified 接入 → 内部 tag
- `v0.3.0-sprint-2` 完成双轨制 → 内部 tag
- **所有 sprint 完结 → tag `v0.3.0`** + 发版

---

## 统计

| 维度 | 数据 |
|---|---|
| 池类型 | 5（research / design / issue / audit / journal）|
| Sprint 数 | 1（v0.3-md-ssot 阶段 0）|
| 当前文档 | 17 篇（pool-roadmap + 16 篇 sprint 文档）|
| 核心架构 | 3 篇（md-ssot-system + v0.3.0-roadmap + intent-ssot-boundary）|
| v0.3 阶段 | 5 篇（req/arch/dev-design/test-design/product）|
| 跨切架构 | 6 篇（l0-l3 / feature-matrix / process-pool / naming / version-iteration / forges-deprecation）|
| 审计报告 | 2 篇（v0.2.0 readiness + retro）|
| 决策日志 | 1 篇（2026-06-20 MD-SSOT）|
| 总行数 | ~6442 行（含本入口）|

---

## 参考

- [`naming-system.md`](./sprints/v0.3-md-ssot/design/naming-system.md) v1.0 — 命名规范权威源
- [`process-forges-deprecation-migration.md`](./sprints/v0.3-md-ssot/design/process-forges-deprecation-migration.md) — 51 forges/ → pools/ 迁移映射表
- [`v0.3.0-roadmap.md`](./sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md) §阶段 5 — forges/ 物理删除 + pools/ 完全接管
- `.gitignore` — `pools/*/!(.gitkeep)` 实际未生效；设计稿 tracked。本入口 `pool-roadmap.md` 在 `pools/` 顶层，**默认 tracked**
