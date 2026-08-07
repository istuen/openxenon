# `dev/pool/` — Goal 承诺层（Planning Pool · v0.4.0 D5+）

> **情态**：描述性 Doc（前瞻性规划承诺）
> **命名**：每个文件以 `<slug>.md` 命名，1:1 对应一个 Goal
> **frontmatter 必填**：`id` / `theme` / `priority` / `status` / `created-at` / `scheduled-version: ~` / `synced-at` / `branch` / `source`
> **frontmatter 可选**：`note` / `rfc[]` / `adr[]` / `baseline[]` / `promoted-from` / `source-ref`
> **权威定义**：[`oxn-project-domain.md#goal`](../../.openxenon/assets/domains/oxn-project-domain.md#goal) + RFC-0026-version-iteration-redesign.md §2.2 + ADR-0094

## 目录说明

`dev/pool/` 存放 OXN 项目**承诺层规划单元**——每个 Goal 代表一个清晰边界，回答"OpenXenon 是什么"的一个子问题。

**关键不变**：

1. **1:1 锁定分支** —— 每个 Goal 强一致对应 `feat/goal-<slug>` 分支（CLI 校验 `branch` 字段）
2. **1:1 锁定 Work** —— 每个 Goal 通过 `oxn goal work <slug>` 创建对应 Work（`oxn work create --blueprint` 路由）
3. **不带版本号** —— Goal 不含 `version` 字段（晚绑）；cut 时才由 `oxn version cut` 收录到对应 Version（`.changes/0-X-Y-*.md`）
4. **3 路来源** —— (1) `oxn goal create` 直接建；(2) `oxn draft promote --target goal` 从 Draft 升华；(3) 历史 PlanningPool entry 一次性迁移（frontmatter 加 `branch` / `source`）

## frontmatter schema（v0.4.0 D5+）

```yaml
---
id: <slug>                   # kebab-case，与文件名同
theme: <人类可读主题>          # 简短中文描述
priority: low | medium | high | critical
status: planned | in-progress | done | archived
created-at: YYYY-MM-DD       # 入池时间
scheduled-version: ~         # 恒为 ~（晚绑；cut 时 Version 文档 frontmatter 引用 Goal 路径而非反之）
synced-at: YYYY-MM-DD        # 最后一次同步时间
branch: feat/goal-<slug>     # 强一致；CLI 创建时自动生成 + 校验
source: direct | draft       # 来源标记
source-ref: <draft-path>     # 若 source=draft 必填（指向源 Draft）
note: |                       # 备注（可选）
  任意多行备注
rfc:                           # 可选：引用的 RFC 路径列表
  - <rfc-path>
adr:                           # 可选：引用的 ADR 路径列表
  - <adr-path>
baseline:                      # 可选：已 ship 的 baseline 路径列表
  - <baseline-path>
promoted-from: <path>          # 可选：从 draft/rfc promoted 来的路径（兼容历史）
---
```

### 历史字段保留

- `scheduled-version: ~` 保留但语义改：旧语义"scheduling 后填版本号"作废；新语义"Goal 天然晚绑，恒为 ~"。
- `promoted-from` 保留兼容历史 PlanningPool entry。

### 字段删减

- ❌ `version` —— Goal 不带版本号
- ❌ `date` —— Goal 无独立日期（created-at 已含）
- ❌ `type` —— Version Fragment 字段，Goal 无此概念

## 生命周期

```
1. 入池 (planned):
   - 来源 3 路：
     (a) 工程师直接 `oxn goal create <slug> --theme <t> --priority <p>`
     (b) Draft 升华 `oxn draft promote --target goal --goal-slug <slug>`
     (c) 历史 PlanningPool entry 一次性 frontmatter 迁移（加 branch/source）
   - 自动：`git checkout -b feat/goal-<slug> dev`
   - status: planned，branch 已创建

2. 开发 (in-progress):
   - `oxn goal work <slug>` 创建对应 Work → 走 IAP 循环
   - Work 内部记录 Goal 路径于 frontmatter `references`（v0.6+ Work 引用收敛）
   - status: in-progress

4. 完成 + cut (done → archived):
   - Work finalize → status: done
   - Forcing function（a+b+c 任一）触发 cut：
     (b) 最小 Goal 完成
     (c) Goal 变更（scope 蔓延/方向偏移）
     (a) 时间节奏（默认 1 周）
   - `oxn version cut --trigger <done|change|schedule>` 创建 `.changes/0-X-Y-*.md` Version 文档
   - Version frontmatter `goals[]` 引用本 Goal 路径
   - Goal 文件归档到 `.openxenon/.archived/dev/pool/<slug>.md`
   - status: archived

5. 强制清理（inactive Goal）：
   - 超过 90 天未 in-progress 的 Goal（status: planned）
   - 归档至 `.openxenon/.archived/dev/pool/<slug>-stale-<date>.md`（保留历史）
   - 自动触发：`oxn goal cleanup --older-than 90d`
```

## 入池条件（强制约束）

满足以下全部条件才能入池：

1. **一个清晰边界** —— 一个 Goal = 一个"OpenXenon 是什么"的子问题（不允许多目标）
2. **最小 RFC/ADR 引用或 source Draft** —— 不是 spike；不是"未来也许"
3. **工程师 mental commit 会做** —— 不是"也许有空做"
4. **`branch: feat/goal-<slug>` 显式** —— 不创建分支 = 未开工

## 与 `.changes/` Version 文档的关系

| 维度 | Goal（`dev/pool/`）| Version（`.changes/0-X-Y-*.md`）|
|---|---|---|
| **情态** | 描述性 Doc（前瞻承诺）| 描述性 Doc（回顾发布记录）|
| **frontmatter version 字段** | ❌ 无（晚绑）| ✅ 必填（cut 时分配）|
| **创建时机** | 开发前（commit 时）| cut 时（frozen-at-cut）|
| **frontmatter goals[] 字段** | ❌ 无 | ✅ 必填（引用 Goal 路径）|
| **frontmatter branch 字段** | ✅ 必填（feat/goal-<slug>）| ✅ 必填（cut 来源，默认 dev）|
| **可变性** | planned → in-progress → done → archived | frozen（cut 后不可变）|
| **数量关系** | N 个 Goal | 1 个 Version 收录 N 个 Goal（理想 1:1）|

**关键纪律**：Version 是**回顾记录**，由 finalized Goal 聚合生成，**不是前瞻计划文档**。前瞻 intent 在 Goal 层，证据在 Version 层——分形 IAP 映射：

```
Goal    = Intent  （前瞻、可变、"要回答什么问题"）
Work    = Align   （执行、IAP 循环）
Version = Proof   （回顾、不可变、"实际回答了什么"）
```

## 当前内容（2026-08-07）

| id | priority | branch | source | 主题摘要 |
|---|---|---|---|---|
| `emergence` | high | `feat/goal-emergence` | direct | 涌现层骨架 + Insight 工程化 + Hall v0.5 + Infra Ports |
| `asset-graph` | medium | `feat/goal-asset-graph` | direct | Asset 影响图（Mermaid/DOT 渲染）|
| `ai-three-modes` | medium | `feat/goal-ai-three-modes` | direct | AI 三模式（Edit / Plan / Apply）|
| `anchor-slot` | medium | `feat/goal-anchor-slot` | direct | Anchor slot 机制 |
| `term-upstream-dag` | low | `feat/goal-term-upstream-dag` | direct | Term 上游 DAG |
| `infra-ports` | high | `feat/goal-infra-ports` | direct | Infra Ports 扩展：ResourcePort / CachePort / WorkSnapshot |
| `work-unified-model` | high | `feat/goal-work-unified-model` | draft | Work 统一模型 + 引用收敛 + Round 改进 |
| `probe-system-evolution` | medium | `feat/goal-probe-system-evolution` | direct | Probe 体系演进（追溯 + 内外拆 + 目标成果分类）|
| `engine-closure-self-verify` | **critical** | `feat/goal-engine-closure-self-verify` | direct | Engine 闭环自证（Work 模板）|
| `npm-ship-path` | **critical** | `feat/goal-npm-ship-path` | direct | npm 发版路径（自举完成 → Release）|

> 注：`branch` 字段列出的是 CLI 校验的目标分支名。当前物理分支模型启用进度见 ADR-0098 / inv-13 branch-model-main-dev-feat-goal-v0.6.0。

## CLI 接管

- `oxn goal create <slug> --theme <t> --priority <p>` —— 创 Goal + 自动建分支
- `oxn goal list [--status <s>]` —— 列出 Goal
- `oxn goal show <slug>` —— 显示 Goal 详情 + 对应 Work 状态
- `oxn goal work <slug>` —— 创建对应 Work（建议 Blueprint 配置，stub 模式）
- `oxn goal archive <slug>` —— 归档 Goal（手动归档场景）
- `oxn goal cleanup --older-than <days>` —— 清理 stagnant Goal

## 参考

- [`oxn-project-domain.md#goal`](../../.openxenon/assets/domains/oxn-project-domain.md#goal) —— Goal 术语权威定义
- [`oxn-project-domain.md#version`](../../.openxenon/assets/domains/oxn-project-domain.md#version) —— Version 术语定义
- [`oxn-project-domain.md#roadmapdeprecated`](../../.openxenon/assets/domains/oxn-project-domain.md#roadmapdeprecated) —— Roadmap 退役历史
- [`docs/rfc/zh-cn/RFC-0026-version-iteration-redesign.md`](../../docs/rfc/zh-cn/RFC-0026-version-iteration-redesign.md) —— 总体设计
- [`docs/adrs/0093-version-cut-record.md`](../../docs/adrs/0093-version-cut-record.md) —— Version cut-record 模型
- [`docs/adrs/0094-goal-primary-planning.md`](../../docs/adrs/0094-goal-primary-planning.md) —— Goal 主规划单元
- [`docs/adrs/0097-version-forcing-function.md`](../../docs/adrs/0097-version-forcing-function.md) —— Forcing function a+b+c
- [`docs/adrs/0098-branch-model-main-dev-feat.md`](../../docs/adrs/0098-branch-model-main-dev-feat.md) —— 分支模型三层
- `.openxenon/drafts/design-version-iteration-redesign.md` —— 设计稿（promoted to RFC-0026）