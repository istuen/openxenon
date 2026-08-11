---
entity: rfc
id: RFC-0019
theme: draft-promote-routing
status: Draft
date: 2026-08-02
synced-at: 2026-08-02
promote-target: rfc
created-from: draft-skeleton-fork@0.1.0
landing-reason: declarative
---

<!-- allow-version -->
# v0.6.2 Draft Promote 路由 RFC — 用 OXN 形式管理 Draft 生命周期
<!-- /allow-version -->

> **日期**：2026-08-02
<!-- allow-version -->
> **状态**：🟡 **Draft**（待 promote 进 RFC 流程；v0.6.2-alpha.3 已落地 P1-P5，待 P1α review）
> **作者**：draft-system-design 实施
> **目标版本**：v0.6.2-alpha.3（实施已落地）/ v0.6.3（正式 promote）
<!-- /allow-version -->
> **关联**：
>   - RFC-0009 (Doc 三情态)
>   - RFC-0011 (Asset 两层)
>   - RFC-0017 (术语双层 SSOT)
>   - RFC-0018 (Meta 层)
<!-- allow-version -->
>   - `.openxenon/drafts/draft-system-design-grilling.md`（v0.6.2 起点）
<!-- /allow-version -->
>   - `.openxenon/drafts/ssot-asset-doc-boundary-audit-2026-07-28.md`

---

## 0. 背景与动机

<!-- allow-version -->
### 0.1 v0.6.2 现状

v0.6.2 起 Draft 用 4 命令（`create / list / archive / discard`）管理，但 Promote 路径走 `oxn work create --blueprint X`（工程师手动拼装）：
<!-- /allow-version -->

```
oxn draft create x.md       # 0 bytes 空白
[工程师手写,结构随意]
oxn work create x-rfc --blueprint doc-rfc-workflow  # 4 件 promote Blueprint 之一
```

**3 个核心问题**：

1. **Draft 与 Target 结构不一致**：Draft 是 0 bytes 空白，目标（RFC / Asset / Work）有特定 frontmatter + H2 段。工程师手写时容易遗漏必填字段。
2. **Promote 路由硬编码在 CLI 层**：CLI 不感知 target 类型，要工程师手动选 Blueprint（`doc-rfc-workflow` / `asset-workflow` / `doc-dev-workflow` / `doc-prod-workflow`）。
3. **4 Promote Blueprint 重复**：4 件各自 `gather / author / validate / promote` 边界近似，但 refs / deps / outputs 各异，合并可能性未被探索。

<!-- allow-version -->
### 0.2 v0.6.2-alpha.3 触发
<!-- /allow-version -->

基于：
- 用户意图（"Draft 创建时**参考目标结构** OR Promote **重写**对应结构" + "新增 Asset 围绕 Draft-Promote"）
<!-- allow-version -->
- oxn-draft-domain v0.1.0 决议（"v0.6.2 不实现，4 命令 CLI 够用时不需要" → v0.6.2-alpha.3 时机已到）
- 4 件 Promote Blueprint 已收敛到边界定义（v0.7 Workflow 编译器形状 → 合并为 1 件的契机）

→ **v0.6.2-alpha.3 设计落地：用 OXN 形式（Blueprint + Domain + Workflow + Stack）管理 Draft 生命周期**。
<!-- /allow-version -->

---

## 1. 决策总览（D1-D7）

### D1: Draft 不新增 AssetKind 6 — Draft 仍是独立 4+2 命令
- **决议**：Draft 不进 Asset 5 类型；仍走独立 4 命令 + 新 2 命令
- **理由**：违反 `oxn-draft-domain inv-4` + `forbidden-draft-as-asset`（Draft 不属于 Asset）
- **绕开**：用 **Blueprint / Workflow / Domain / Stack**（现有 Asset 4 类型）管理 Draft 生命周期

### D2: 路由分 2 层 — router Blueprint (L1) + target-aware Blueprint (L2)
- **L1 (`draft-promote-router`)**：4 阶段生命周期（gather → select-target → validate → dispatch-target），按 `promote-target` 字段路由
- **L2 (`promote-target-aware-workflow`)**：合并原 4 件 Promote Blueprint，按 7 sub-target dispatch
- **理由**：4 阶段生命周期是 Draft 专属（路由逻辑），target-aware 是通用 promote（具体执行）→ 关注点分离

### D3: Promote 4 阶段顺序强制 — 不允许 short-circuit
- **决议**：`gather → select-target → validate → dispatch-target` 严格顺序
<!-- allow-version -->
- **理由**：v0.6.2-alpha.3 锁定为 Draft 专属生命周期（与 Work IAP 不同）
<!-- /allow-version -->
- **兜底**：每阶段 transaction，失败回滚，下次 retry 走完整流程

### D4: skeleton 派生走 Asset 层 — Draft engine 不内置 Template
- **决议**：Draft 可选 `--target` 时，从 `.openxenon/assets/blueprints/draft-skeletons/<target>[-<kind>].md` 派生
- **理由**：违反 `oxn-draft-domain inv-2`（OXN 不执行 Draft 创建逻辑业务）+ `forbidden-draft-builtin-template`（Draft 内置 template 已废）
- **绕开**：用 draft-skeleton-fork Workflow（Asset 层）派生 skeleton，由 caller 写文件

<!-- allow-version -->
### D5: 兼容 v0.6.2 空白模式 — `--target` 缺失时仍 0 bytes
- **决议**：默认行为不变（兼容 v0.6.2 4 命令）；`--target` 是可选增强
- **理由**：v0.6.2 已落地 4 命令 + 现有 17+ draft；强制 frontmatter 会破坏现有数据
<!-- /allow-version -->
- **落实**：`oxn-draft-domain forbidden-draft-frontmatter-required` ban 锁定为空 Draft 合法

### D6: 7 sub-target 是 dispatch 终点 — 不再细分
- **决议**：`promote-rfc` + `promote-asset-{domain|workflow|stack|blueprint|roadmap}` + `promote-work` 共 7 条
- **理由**：5 AssetKind 必须分（不同 frontmatter + H2 段），rfc / work 单条足够
- **未来**：如 AssetKind 扩展到 N，sub-target 表随 N 增长

### D7: Promote 后源 Draft 不变 — 工程师决定 archive / discard
- **决议**：Promote 是从 Draft 拷到 Target，不是状态转移
- **理由**：`oxn-draft-domain inv-1` 锁定 promote 是拷贝
- **可选**：`--archive-after` flag 自动 archive 原 Draft（工程师仍可手动 discard）

---

## 2. 目标与非目标

<!-- allow-version -->
### 2.1 目标（v0.6.2-alpha.3 必达）
<!-- /allow-version -->

| # | 目标 | 验收 |
|---|---|---|
| G1 | Draft 可选带 frontmatter hint（`promote-target` / `promote-kind`） | `oxn draft create x --target asset --kind domain` 派生含 frontmatter 文件 |
| G2 | Draft Promote 4 阶段生命周期 | `oxn draft promote x` 走 draft-promote-router Blueprint，4 阶段顺序强制 |
| G3 | 3 类 Target（rfc / asset / work）路由 | 7 sub-target dispatch 全部落地 |
| G4 | 7 skeleton 模板驱动 per-target frontmatter + H2 段 | `.openxenon/assets/blueprints/draft-skeletons/{rfc,asset-*,work}.md` 全建 |
<!-- allow-version -->
| G5 | 4 旧 Promote Blueprint 合并为 1 | `promote-target-aware-workflow.md` v0.1.0 + 4 旧归档 |
| G6 | retarget 显式操作 | `oxn draft retarget x --new-target <...>` 重新派生 skeleton，保留工程师内容 |
| G7 | 与 v0.6.2 4 命令完全兼容 | 默认 `--target` 缺失时仍走空白模式 |
<!-- /allow-version -->

### 2.2 非目标（明确推迟）

| # | 非目标 | 推迟到 |
|---|---|---|
<!-- allow-version -->
| NG1 | AI Agent 自动推断 promote-target（基于内容关键字） | v0.7.x |
| NG2 | 多人协同 Draft（lock / concurrent edit / merge） | v0.7.x |
| NG3 | Promote 时自动生成 changelog 段（与 .changes/ 集成） | v0.7.x |
| NG4 | Per-target Probe（rfc-promote-hook / asset-promote-hook） | v0.7.x |
| NG5 | 跟踪 `.openxenon/assets/` 到 git（团队治理决策） | 待 RFC |
| NG6 | Promote 实际写文件（当前仅返回 dispatch 信息，CLI 接 `oxn work create --blueprint`） | v0.6.3 |
<!-- /allow-version -->

---

## 3. 架构（D-α）

### 3.1 完整架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                          Layer 0 — User CLI                       │
├──────────────────────────────────────────────────────────────────┤
│ oxn draft create <name>                                            │
│   [--prefix report|issue|design]                                   │
│   [--target rfc|asset|work]                                        │
│   [--kind domain|workflow|stack|blueprint|roadmap]                 │
│                                                                   │
│ oxn draft promote <name>                                           │
│   [--target auto|rfc|asset|work]                                   │
│   [--archive-after]                                                │
│                                                                   │
│ oxn draft retarget <name>                                          │
│   --new-target rfc|asset|work                                      │
│   [--new-kind <5 AssetKind>]                                       │
│                                                                   │
<!-- allow-version -->
│ oxn draft list/archive/discard  (v0.6.2 不变)                     │
<!-- /allow-version -->
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│              Layer 1 — Engine (Draft module)                       │
├──────────────────────────────────────────────────────────────────┤
│ packages/engine/src/Draft/                                         │
│ ├── skeleton.ts    (forkDraftSkeleton + DRAFT_TARGETS +           │
│ │                    ASSET_KINDS + DraftTarget + DraftAssetKind)  │
│ ├── promote.ts     (promoteDraft 4 阶段 + SUB_TARGETS + SubTarget)│
│ ├── retarget.ts    (retargetDraft 保留工程师内容)                 │
│ └── index.ts       (createDraft 增 --target/--kind 派生 + 6 操作) │
│                                                                   │
│ packages/engine/src/infra/probes/boundary-guard.ts               │
│   OXN_BUILTIN_DOMAINS_FALLBACK 9 → 10 (新增 oxn-draft-promote-    │
│   domain)                                                         │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│              Layer 2 — Asset (OXN 形式)                           │
├──────────────────────────────────────────────────────────────────┤
│ .openxenon/assets/                                                │
│ ├── domains/                                                       │
<!-- allow-version -->
│ │   ├── oxn-draft-domain.md           (v0.1.0 → v0.2.0 增 3 Term)│
│ │   └── oxn-draft-promote-domain.md   (v0.1.0 新增)               │
│ ├── workflows/                                                     │
│ │   └── draft-skeleton-fork.md        (v0.1.0 新增)               │
│ ├── blueprints/                                                    │
│ │   ├── draft-promote-router.md       (v0.1.0 新增 Layer 1)       │
│ │   ├── promote-target-aware-workflow.md (v0.1.0 新增 Layer 2)    │
<!-- /allow-version -->
│ │   └── draft-skeletons/                (7 skeleton 模板)          │
│ │       ├── rfc.md                                                  │
│ │       ├── asset-{domain,workflow,stack,blueprint,roadmap}.md    │
│ │       └── work.md                                                │
│ └── stacks/                                                        │
<!-- allow-version -->
│     └── draft-promote-tooling.md      (v0.1.0 新增)               │
<!-- /allow-version -->
│                                                                   │
│ .openxenon/.archived/assets/blueprints/                           │
│   (4 旧 Promote Blueprint 归档)                                   │
│   ├── doc-rfc-workflow.md (deprecated)                            │
│   ├── asset-workflow.md (deprecated)                              │
│   ├── doc-dev-workflow.md (deprecated)                            │
│   └── doc-prod-workflow.md (deprecated)                            │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│                    Layer 3 — Work (existing)                       │
├──────────────────────────────────────────────────────────────────┤
│ oxn work create <name> --blueprint <name>                          │
<!-- allow-version -->
│   (v0.6.2-alpha.3 仅返回 dispatch 信息;                            │
│    v0.6.3 由 router 真正调 work create)                            │
<!-- /allow-version -->
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Promote 4 阶段生命周期

```
┌─────────────────────────────────────────────────────────────┐
│ Draft file: .openxenon/drafts/<name>.md                      │
│   frontmatter:                                              │
│     promote-target: rfc|asset|work                            │
│     promote-kind: <5 AssetKind> (仅 target=asset)            │
│     created-from: draft-skeleton-fork@0.1.0                  │
│     synced-at: <YYYY-MM-DD>                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: gather                                              │
│   - 读 Draft frontmatter + body                              │
│   - 校验文件存在                                             │
│   - 校验 frontmatter 不空                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: select-target                                       │
│   - 读 promote-target 字段 (or --target override)            │
│   - 校验 ∈ {rfc, asset, work}                                │
│   - 校验 promote-kind (仅 target=asset 时)                   │
│   - 校验 promote-kind 不与 target=rfc/work 同时存在           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: validate                                            │
│   - 校验必填字段: promote-target                             │
│   - 校验 promote-kind (target=asset 时)                      │
<!-- allow-version -->
│   - v0.6.2-alpha.3: 简化版（v0.6.3 扩为 H2 段校验）           │
<!-- /allow-version -->
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: dispatch-target                                     │
│   - resolveSubTarget(target, kind) → 7 sub-target            │
│   - computeTargetPath(target, kind, name) → 落盘路径          │
<!-- allow-version -->
│   - v0.6.2-alpha.3: 返回 dispatch info（不实际写文件）       │
│   - v0.6.3: 由 promote-target-aware-workflow 真正写文件      │
<!-- /allow-version -->
└─────────────────────────────────────────────────────────────┘
```

### 3.3 7 sub-target dispatch

```
TargetDispatchTable (oxn-draft-promote-domain §TargetDispatchTable)
┌────────────────┬──────────────┬────────────────────────────┬─────────────────────────────────┐
│ promote-target │ promote-kind │ sub-target                 │ 落盘路径                        │
├────────────────┼──────────────┼────────────────────────────┼─────────────────────────────────┤
│ rfc            │ (none)       │ promote-rfc                │ docs/rfcs/zh-cn/RFC-XXXX-X.md  │
│ asset          │ domain       │ promote-asset-domain       │ .openxenon/assets/domains/X.md │
│ asset          │ workflow     │ promote-asset-workflow     │ .openxenon/assets/workflows/X.md│
│ asset          │ stack        │ promote-asset-stack        │ .openxenon/assets/stacks/X.md   │
│ asset          │ blueprint    │ promote-asset-blueprint    │ .openxenon/assets/blueprints/X.md│
│ asset          │ roadmap      │ promote-asset-roadmap      │ .openxenon/assets/assetmaps/X.md│
│ work           │ (none)       │ promote-work               │ .openxenon/works/<id>/work.md   │
└────────────────┴──────────────┴────────────────────────────┴─────────────────────────────────┘
```

---

## 4. Asset 集合（11 件新 + 4 归档 + 2 改 Domain）

### 4.1 新建 Asset（local-only）

| # | 资产路径 | 类型 | 用途 |
|---|---|---|---|
<!-- allow-version -->
| 1 | `domains/oxn-draft-promote-domain.md` v0.1.0 | Domain | Promote 路由领域（Target · PromoteRoute · SkeletonForking · PromoteLifecycle · TargetDispatchTable） |
| 2 | `workflows/draft-skeleton-fork.md` v0.1.0 | Workflow | skeleton 派生流水线（pick-target → pick-kind → fork-template → inject-frontmatter） |
| 3 | `blueprints/draft-promote-router.md` v0.1.0 | Blueprint | Layer 1 总路由（4 Boundaries 顺序强制） |
| 4 | `blueprints/promote-target-aware-workflow.md` v0.1.0 | Blueprint | Layer 2 通用 Promote（合并 4 → 1；4 Boundaries + 7 Tasks） |
| 5 | `stacks/draft-promote-tooling.md` v0.1.0 | Stack | Promote 工具栈（yaml-parser / mdast-validator / path-guard） |
<!-- /allow-version -->
| 6 | `blueprints/draft-skeletons/rfc.md` | Skeleton | RFC skeleton（frontmatter 5 字段 + 5 H2 段） |
| 7 | `blueprints/draft-skeletons/asset-domain.md` | Skeleton | Domain skeleton（frontmatter 7 字段 + 3 H2 段） |
| 8 | `blueprints/draft-skeletons/asset-workflow.md` | Skeleton | Workflow skeleton（frontmatter 7 字段 + 1 H2 段） |
| 9 | `blueprints/draft-skeletons/asset-stack.md` | Skeleton | Stack skeleton（frontmatter 7 字段 + 1 H2 段） |
| 10 | `blueprints/draft-skeletons/asset-blueprint.md` | Skeleton | Blueprint skeleton（frontmatter 7 字段 + 2 H2 段） |
| 11 | `blueprints/draft-skeletons/asset-roadmap.md` | Skeleton | Roadmap skeleton（frontmatter 7 字段 + 4 H2 段） |
| 12 | `blueprints/draft-skeletons/work.md` | Skeleton | Work skeleton（frontmatter 6 字段 + 4 H2 段） |

### 4.2 修改 Domain（1 件）

| # | 资产路径 | 改动 |
|---|---|---|
<!-- allow-version -->
| M1 | `domains/oxn-draft-domain.md` | v0.1.0 → v0.2.0（增 3 Term / 改 2 Ban / 增 2 Invariant / Future extension 改写） |
<!-- /allow-version -->

具体改动：

**Term 新增**：
- `DraftTarget` — 3 值枚举（rfc / asset / work）
- `DraftSkeleton` — per-target 模板（7 件 skeleton）
- `DraftPromoteLifecycle` — 4 阶段生命周期

**Ban 改动**：
- `forbidden-draft-template` → `forbidden-draft-builtin-template`（移除 `draft-frontmatter-required` item）
- 新增 `forbidden-draft-frontmatter-required`（独立 ban）

**Invariant 新增**：
- `inv-5`: Draft skeleton 来源唯一（必须由 skeleton 模板派生）
- `inv-6`: Draft Promote 路由单一入口（必须经 draft-promote-router）

### 4.3 归档 4 旧 Blueprint（local-only）

| # | 原路径 | 归档到 |
|---|---|---|
| A1 | `blueprints/doc-rfc-workflow.md` | `.archived/assets/blueprints/` |
| A2 | `blueprints/asset-workflow.md` | `.archived/assets/blueprints/` |
| A3 | `blueprints/doc-dev-workflow.md` | `.archived/assets/blueprints/` |
| A4 | `blueprints/doc-prod-workflow.md` | `.archived/assets/blueprints/` |

---

## 5. Engine 模块（3 件 + 1 barrel + 1 signature）

### 5.1 新模块

| 文件 | 行数 | 公开 API |
|---|---|---|
| `packages/engine/src/Draft/skeleton.ts` | 187 | `forkDraftSkeleton` / `DRAFT_TARGETS` / `ASSET_KINDS` / `DraftTarget` / `DraftAssetKind` |
| `packages/engine/src/Draft/promote.ts` | 261 | `promoteDraft` / `SUB_TARGETS` / `SubTarget` / 4 阶段 phases |
| `packages/engine/src/Draft/retarget.ts` | 173 | `retargetDraft` 保留工程师 frontmatter + body |

### 5.2 改动

| 文件 | 改动 |
|---|---|
| `packages/engine/src/Draft/index.ts` | export 新模块 + `createDraft` 增 `--target`/`--kind` 派生 |
| `packages/engine/src/infra/probes/boundary-guard.ts` | OXN_BUILTIN_DOMAINS_FALLBACK 9 → 10 |

### 5.3 9 新错误码

```
OXN_DRAFT_TARGET_INVALID         --target 不在 3 类中
OXN_DRAFT_KIND_REQUIRED          --target=asset 缺 --kind
OXN_DRAFT_KIND_INVALID           --kind 不在 5 类中
OXN_DRAFT_SKELETON_NOT_FOUND     skeleton 模板缺失
OXN_DRAFT_FRONTMATTER_INVALID    frontmatter 缺失或格式错
OXN_DRAFT_PROMOTE_TARGET_MISSING frontmatter 缺 promote-target
OXN_DRAFT_PROMOTE_TARGET_UNKNOWN promote-target 值不在 3 类中
OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH  target/kind 组合不合法
OXN_DRAFT_PROMOTE_VALIDATE_FAILED frontmatter 校验失败
```

---

<!-- allow-version -->
## 6. CLI 6 子命令（v0.6.2 4 + v0.6.2-alpha.3 2）
<!-- /allow-version -->

### 6.1 create（增强）

```bash
<!-- allow-version -->
# v0.6.2 (兼容)
<!-- /allow-version -->
oxn draft create <name> [--prefix <3 types>]

<!-- allow-version -->
# v0.6.2-alpha.3 (新增 --target/--kind)
<!-- /allow-version -->
oxn draft create <name> [--prefix <3 types>] \
                     --target <rfc|asset|work> [--kind <5 AssetKind>]
```

行为：
<!-- allow-version -->
- 无 `--target` → 0 bytes 空白（v0.6.2 兼容）
<!-- /allow-version -->
- 有 `--target` → 调 `forkDraftSkeleton` 派生含 frontmatter + H2 段

<!-- allow-version -->
### 6.2 promote（v0.6.2-alpha.3 新增）
<!-- /allow-version -->

```bash
oxn draft promote <name> [--target auto|<rfc|asset|work>] [--archive-after]
```

行为：
- 4 阶段：gather → select-target → validate → dispatch-target
<!-- allow-version -->
- v0.6.2-alpha.3：返回 dispatch info（含 subTarget + targetPath）
- v0.6.3：实际调 `oxn work create --blueprint promote-target-aware-workflow`

### 6.3 retarget（v0.6.2-alpha.3 新增）
<!-- /allow-version -->

```bash
oxn draft retarget <name> --new-target <rfc|asset|work> [--new-kind <5 AssetKind>]
```

行为：
- 读 Draft frontmatter + body
- 调 `forkDraftSkeleton` 用 new target 派生 skeleton
- 合并：保留工程师 frontmatter（除 `promote-target` / `promote-kind` / `created-from` / `synced-at`）
- 写回：保留 body 内容到 `<!-- engineer-preserved-content -->`

<!-- allow-version -->
### 6.4 list / archive / discard（v0.6.2 不变）
<!-- /allow-version -->

```bash
oxn draft list [--include-archived]
oxn draft archive <name>
oxn draft discard <name> --force
```

---

## 7. 概念变化（D-γ）

### 7.1 术语更新

<!-- allow-version -->
| 概念 | v0.6.2 | v0.6.2-alpha.3 |
<!-- /allow-version -->
|---|---|---|
| Draft 模板 | 强制无 Template | 可选 skeleton 派生（Asset 层） |
| Draft frontmatter | 强制无 frontmatter | 可选 `--target` 派生 `promote-target` / `promote-kind` hint |
| Draft Promote | 手动 `oxn work create --blueprint X` | `oxn draft promote x` 走 router |
| 4 Promote Blueprint | 独立 4 件 | 合并为 1 件（`promote-target-aware-workflow`） |
| Draft 命令数 | 4（create/list/archive/discard） | 6（+promote +retarget） |

### 7.2 边界规则（不破坏）

- Draft 不进 Asset 5 类型（仍独立）→ 不破坏 `AssetKind` 枚举
- Promote 后源 Draft 不变 → 不破坏 inv-1
- Draft engine 无 Template 机制 → skeleton 走 Asset 层派生 → 不破坏 inv-2
- 4 Promote Blueprint 归档但保留文件 → 不破坏引用
<!-- allow-version -->
- 兼容 v0.6.2 4 命令空白模式 → 不破坏现有 17+ draft 文件
<!-- /allow-version -->

---

## 8. 测试统计

<!-- allow-version -->
### 8.1 单元测试（v0.6.2-alpha.3 新增 33 件）
<!-- /allow-version -->

| 文件 | 测试数 | 覆盖 |
|---|---|---|
| `__tests__/skeleton.test.ts` | 12 | 7 skeleton 派生 / 4 错误码 / preserveContent / 枚举 |
| `__tests__/promote.test.ts` | 14 | 4 阶段 / 7 sub-target / 5 错误码 / override |
| `__tests__/retarget.test.ts` | 7 | retarget 改 frontmatter / 保留内容 / 链式 / oversized |

<!-- allow-version -->
### 8.2 集成测试（v0.6.3+）

- `tests/integration/draft-promote.test.ts` — CLI e2e 测试（未实现，v0.6.3 阶段）
- `tests/integration/draft-skeleton.test.ts` — skeleton 派生 e2e（未实现，v0.6.3 阶段）
<!-- /allow-version -->

### 8.3 累计测试

| 版本 | 新增 | 累计 |
|---|---|---|
<!-- allow-version -->
| v0.6.2-alpha.2 | — | 1622 pass |
| v0.6.2-alpha.3 | + 33 | 1864 pass / 0 fail / 3 skip |
<!-- /allow-version -->

---

## 9. 实施时间线

| 版本 | Week | 任务 | 工作量 |
|---|---|---|---|
<!-- allow-version -->
| **v0.6.2-alpha.3** | 2026-08 | P1-P5 全部（5 commits） | 3 天 |
| **v0.6.3 W1** | 2026-09 | Promote 实际写文件（router 调 work create）+ 集成测试 | 3 天 |
| **v0.6.3 W2** | 2026-09 | promote-target-aware-workflow 7 Tasks 实际产物 | 4 天 |
| **v0.7.x** | 2026-Q4 | AI Agent 自动推断 target / 多人协同 / changelog 集成 | 待评估 |
<!-- /allow-version -->

---

## 10. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Domain ban 修改引发争议 | 中 | 中 | 用 RFC 流程（本文）正式批准 |
| skeleton fork 误覆盖用户内容 | 中 | 高 | fork-template 只在空文件时 fork；非空则报错；retarget 才允许 merge |
| 双 Blueprint（router + target-aware）边界混淆 | 中 | 中 | router **只做路由**，不实现 rewrite 逻辑 |
| 7 skeleton 字段与目标 Asset 漂移 | 高 | 中 | 写 CI Probe 校验：每次 `oxn asset create <kind>` 后跑 `compare-skeleton <target>` |
| 旧 Draft（无 frontmatter）兼容 | 高 | 低 | 老 Draft 走 `oxn draft retarget` 注入 frontmatter |
| 工程师误声明 target | 中 | 低 | `oxn draft promote` 二次确认 + 列出 override 警告 |
<!-- allow-version -->
| `.openxenon/assets/` 不 commit 导致其他开发者拿不到新 Asset | 中 | 中 | engine fallback 列表（已注册 `oxn-draft-promote-domain`）+ README 指引（v0.7.x 走 RFC 决策） |
<!-- /allow-version -->
| 4 旧 Promote Blueprint 引用未更新 | 低 | 低 | grep 扫描 + changelog 提示 |

---

<!-- allow-version -->
## 11. 不做（明确推迟到 v0.7.x）

- 跨 Project 引用 Draft → v0.7.x Skill Registry
- Draft 自动 refactor 工具 → v0.9.0 自适应 Blueprint
- Draft 内容 ML 预测 → v0.9.0+
- Hall 实时 Promote 图 → v0.8.0 WebSocket
<!-- /allow-version -->
- `.openxenon/assets/` 跟踪 git → 团队治理 RFC

---

## 12. 关联 ADR / RFC / 文档

### ADR
- ADR-0055（Blueprint composition template）
- ADR-0066/0067（OXN 宪法 / 4 阶段生命周期）
- ADR-0074（OXN self-host 项目）

### RFC（已落地）
- RFC-0009（Doc 三情态）
- RFC-0010（Doc → Doc 引用规则）
- RFC-0011（Asset 两层）
- RFC-0013（版本化策略）
- RFC-0014（Asset 探索 UX）
- RFC-0015（Proof 系统）
- RFC-0017（术语双层 SSOT）
- RFC-0018（Meta 层）

### RFC（本文相关）
<!-- allow-version -->
- 本文 → RFC-0019（v0.6.2-draft-promote-routing）
<!-- /allow-version -->

### 草稿（已落地 + 待 promote）
<!-- allow-version -->
- `.openxenon/drafts/draft-system-design-grilling.md`（v0.6.2 起点）
<!-- /allow-version -->
- `.openxenon/drafts/ssot-asset-doc-boundary-audit-2026-07-28.md`（Step 1-2-3-4-5-7-9-10 已落；Step 6/8 待）
- `.openxenon/drafts/onboarding-cold-start-solution.md`（冷启动相关，待排期）
- `.openxenon/drafts/probe-coef-slot-cost-grilling.md`（Q4 推迟决策）

### Skill / 文档
- `packages/cli/src/skills/locales/{zh-CN,en}/oxn-draft/instruction.md`
- `packages/cli/src/skills/locales/zh-CN/oxn-draft/references/draft-lifecycle.md`
- `docs/product/zh-cn/concepts/glossary.md`（6 新 Term）
- `.changes/0-6-2-alpha-3-draft-promote-routing.md`

---

## 13. Changelog 摘要

`.changes/0-6-2-alpha-3-draft-promote-routing.md` 已落地（含完整 release notes）。

主要条目：
- **新 Asset 11 件**：1 Domain + 1 Workflow + 2 Blueprint + 1 Stack + 7 skeleton
<!-- allow-version -->
- **改 Domain 1 件**：oxn-draft-domain.md v0.1.0 → v0.2.0
<!-- /allow-version -->
- **归档 4 Blueprint**：4 Promote Blueprint 合并为 1
- **新 Engine 3 模块**：skeleton.ts / promote.ts / retarget.ts
- **新 CLI 2 命令**：promote / retarget
- **新错误码 9 个**
- **新测试 33 件**

---

## 14. 作者与决策记录

| 角色 | 决定 | 日期 |
|---|---|---|
| 工程师 | Q-A: 1（router Blueprint L1） | 2026-08-02 |
| 工程师 | Q-B: 保留（separate Workflow） | 2026-08-02 |
| 工程师 | Q-C: 重构 1 件（合并 4 → 1） | 2026-08-02 |
| 工程师 | Q-A: Asset 跟踪策略 A（保持 local-only） | 2026-08-02 |
| 工程师 | 批准 P1-P5 实施 | 2026-08-02 |
<!-- allow-version -->
| 待 review | v0.6.2-alpha.3 整套设计 | 待 promote |
<!-- /allow-version -->

---

## 15. promote-checklist

- [x] P1: Domain 变更（commit `0ad9fc0`）
- [x] P2: Layer 1 新 Asset（10 件，local-only）
- [x] P3: 重构 4 → 1 + 4 归档（local-only）
- [x] P4: CLI + Engine + 33 测试（commit `ced7eee`）
- [x] P5: Skill + glossary + changelog + lint（commit `0fdfef2` + `a88e129`）
- [ ] review 本文 RFC
- [ ] 走 `oxn work create rfc-0019 --blueprint doc-rfc-workflow` 正式 promote
- [ ] 落盘 `docs/rfcs/zh-cn/RFC-0019-draft-promote-routing.md`
- [ ] 更新 Domain changelog
<!-- allow-version -->
- [ ] v0.6.3 实施剩余（实际写文件 + 集成测试）
<!-- /allow-version -->

---

<!-- allow-version -->
**作者**：draft-system-design 实施（v0.6.2-alpha.3）
**目标发布**：v0.6.3（v0.6.2-alpha.3 已落地 P1-P5）
<!-- /allow-version -->
**状态**：🟡 Draft（待 promote 进 RFC 流程）

---

<!-- allow-version -->
### v0.3 (2026-08-08) — Asset 结构 v2 收编：Blueprint Use/Slot 段格式
<!-- /allow-version -->

- **背景**：v0.7.4（2026-08-08）Asset 结构 v2 收编让 Blueprint 的 Use / Slot 段格式语义更清晰。
- **Use 段格式 v2**：
  - v1 形式：`## Use`（单 H2 段，下含 `### name` + `- kind / - ref` 列表）
  - v2 形式：`## Use workflow` / `## Use domain` / `## Use stack` / `## Use blueprint` / `## Use roadmap`（按 Asset Type 分组的独立 H2 段）
  - 兼容：两种形式 Engine 均解析（`packages/engine/src/Work/per-work-blueprints-merger.ts`）
- **Slot 段格式 v2**：Blueprint 的 Slot 段从 `## Boundaries`（v1）收编为 `## Slot`（v2）；功能等价；Engine 解析器两种形式均识别。
- **Task 派发 `## Tasks (sub-target dispatch)` 段保留**：作为 Blueprint 的 sub-target 派发表（如 `### promote-rfc` / `### promote-asset-domain` 等 8 条），与 `## Slot` 顶层 Slot 段平级（不是 Slot 内部 Axiom）；Engine 解析时跳过此段。
- **影响**：Draft Promote 路由 Blueprint（`draft-promote-router` / `promote-target-aware-workflow`）已收编为 v2 形式；Draft 派生、4 Boundaries 生命周期、8 sub-target 派发语义保持不变。
- **参考**：详细结构规范见 `.openxenon/drafts/design-asset-structure-unification.md` §5 Phase 1+2；Schema 文档为 `docs/dev/zh-cn/asset-structure-v2.md`（RFC 不直接引用 dev 手册，参见设计稿）。
