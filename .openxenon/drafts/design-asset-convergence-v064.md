# Design: Asset 数量与定义收敛（v0.6.4）

- **DraftType**: design（设计稿）
- **状态**: draft（grilling session 收束，待 promote 为 RFC 或 Asset）
- **创建日期**: 2026-08-09
- **主题**: 当前 38 个 Asset 收敛到 33 个（-13.2%）；统一 5 类 AssetKind 定义、references 语法、Probe ≠ Asset 边界、AssetMap/Roadmap 术语统一。
- **关联**:
  - `oxn-asset-domain.md` v1.0.0（AssetKind 5 类权威源）
  - `oxn-proof-domain.md` v1.0.0（Proof 业务领域；本设计将 Probe 内容并入）
  - `oxn-work-domain.md`（Work 业务领域）
  - `oxn-project-domain.md`（项目工程元层；术语统一受影响）
  - `oxn-cli-domain.md`（CLI 命令面；`roadmap` → `assetmap` 改名）
  - `.openxenon/drafts/design-asset-structure-unification.md`（Asset v2 结构收敛，本设计在此基础上扩展）
  - `docs/rfc/zh-cn/RFC-0013-versioning-policy.md`（v0.7+ RoadmapAlias 锁定，本设计回收）
  - `docs/rfc/zh-cn/RFC-0020-three-boundary-blueprint-elevation.md`（三边界框架）
- **Grilling 来源**: 2026-08-09 `/grilling` session（grill-with-docs + domain-modeling skill）

---

## 1. 背景与目标

### 1.1 当前现状盘点（v0.6.3 → v0.6.4-alpha.0）

OXN 当前 `package.json:2` 已 bump 到 `0.6.4-alpha.0`，但 `AGENTS.md:6` 锁定 `0.6.3`（版本号漂移 1 个 alpha，本设计一并修正）。

Asset 资产盘点（来源：`packages/engine/src/infra/paths.ts:108-114` SSOT）：

| AssetKind | `.openxenon/assets/` 数量 | builtin 数量 | 合规（frontmatter `entity`） |
|---|---|---|---|
| `domain` | 13 | 1 | 13/13 ✓ |
| `workflow` | 17 | 1 | 17/17 ✓ |
| `stack` | 3 | 1 | 3/3 ✓ |
| `blueprint` | 4 | 4 | 4/4 ✓ |
| `roadmap` (= AssetMap) | 1 | 1 | 1/1 ✓ |
| **合计** | **38** | **7** | — |

边界外共存但**不在 5 AssetKind 内**：
- **Probe**：`.openxenon/assets/probes/` 4 个 + `packages/engine/src/builtin/probes/` 19 个（独立 `AssetType` 联合体，**非 Asset**）
- **Skeleton (draft)**：`.openxenon/draft-skeletons/` 8 个（独立 `entity: skeleton`，**非 Asset**）

### 1.2 9 项主要问题

| # | 问题 | 严重度 |
|---|---|---|
| 1 | Probe 二象性：物理住 `assets/probes/` 但代码用独立 `AssetType`，不参与 5 AssetKind 闭环 | 高 |
| 2 | AssetMap/Roadmap 术语 4 处不一致（enum `roadmap` / 目录 `assetmaps` / glossary `AssetMap` / parser 注释 `Roadmap`） | 高 |
| 3 | references 3 套语法并存（bare name / `@md/{kind}/{name}` / file path），`isAssetReferenced` 假阴性导致 archive/delete 守门失效 | 高 |
| 4 | 5 AssetKind 字面量重复声明 5 处，缺 SSOT 编译保证 | 中 |
| 5 | `.oxn` 写路径幽灵代码残留（`Asset/evolve.ts` / `Asset/delete.ts` / `Asset/create.ts:193-209`），v0.7+ 已声明废弃但未清理 | 中 |
| 6 | Workflow 17 个有 4 个与 `dev-workflow` 高度重叠（`add-cli-subcommand` / `ts-retrieve-design-develop-test` / `refactor-safe` / `git-workflow`） | 中 |
| 7 | `oxn-system.md:34-36` 引用 3 个已归档 Blueprint（`doc-prod-workflow` / `doc-dev-workflow` / `doc-rfc-workflow`） | 高 |
| 8 | `Roadmap/parser.ts:148` 与 `oxn-system.md` v3.1.0 格式不兼容（实测返回 0 scenes，`oxn roadmap suggest` 完全失效） | 高 |
| 9 | `oxn-insight-domain` 几乎 0 引用，CONTEXT-MAP:41 列为"涌现层跨 Work 推理"，但下游无消费方 | 中 |

### 1.3 目标

让 Asset 体系在 v0.6.4 完成以下收敛：

1. **数量收敛**：38 → 33（-13.2%）
2. **定义收敛**：5 AssetKind 边界清晰，Probe 非 Asset 显式化
3. **术语统一**：AssetMap/Roadmap 一次性全面改名 `assetmap`
4. **语法统一**：references 收敛为 bare name + parent-kind metadata 推断
5. **代码健康**：5 处字面量 SSOT 化 + `.oxn` 残留清理 + parser 格式同步

---

## 2. 12 项决策锁定

| # | 问题 | 决策 | 影响 |
|---|---|---|---|
| Q1 | Probe 是 Asset 吗？ | **否** | Probe 文件从 `assets/` 移出 |
| Q2 | AssetMap/Roadmap 命名 | **b — 全面改为 `assetmap`**（破坏性，一次性改） | enum、目录、术语、CLI、parser、文档全改 |
| Q3 | 4 probe 文件归属 | **先按 B 处理**（迁 `.openxenon/probes/`，`heading-skeleton-check.md` 删） | 探针物理位置变更 |
| Q4 | Root Asset 保留 | **保留**（`oxn-workflow.md` / `oxn-domain.md` 作为 OXN 全局内容） | 不变 |
| Q5 | `oxn-insight-domain` | **删除** | -1 Domain |
| Q6 | `oxn-probe-domain` 合并 | **并入 `oxn-proof-domain`** | -1 Domain（probe 内容并入 proof） |
| Q7 | references 语法 | **B 方案 — bare name + parent-kind metadata 推断** | Blueprint `## Use` 去 `@md/` 前缀 |
| Q8 | Workflow 17 个冗余 | **17 → 13**（4 个折入 `dev-workflow`） | -4 Workflow |
| Q9 | Stack 分离 | **保留分离**（`md-stack` 内置 Engine，`oxn-stack` 项目专属） | 不变 |
| Q10 | Project Probe 覆盖 | **a — 保留**（保留 `.openxenon/probes/` 项目路径） | 不变 |
| Q11 | Probe Domain `## Schema` | **b — 改写为 Axiom**（随 Q6 合并消解） | Schema 内容并入 proof Domain Axiom |
| C1 | references 语法方案 | **B 锁定** | — |
| C2 | Workflow 合并范围 | **4 个全部折入** | — |
| C3 | Q2 改名节奏 | **一次性 PR** | — |
| E1 | PR 顺序 | **按依赖排序**（A → G → F → B → D → C → E），合并成 7 个独立 PR | — |
| E2 | Insight 术语归宿 | **a — 放 `oxn-proof-domain.md`** 的 `## Concept` 段 | TrustMark / Taint / Boundary Deviation → InterferenceFlag 收编 |
| E3 | dev-workflow slot 折叠 | **c — 维持 Blueprint 引用 `dev-workflow`，slot 由上下文推断** | Blueprint 引用方式不变 |

---

## 3. 数量收敛（38 → 33）

| 类型 | 当前 | 收敛后 | Δ | 备注 |
|---|---|---|---|---|
| Domain | 13 | **12** | -1 | 删 `oxn-insight-domain`；`oxn-probe-domain` 并入 `oxn-proof-domain` |
| Workflow | 17 | **13** | -4 | `add-cli-subcommand` / `ts-retrieve-design-develop-test` / `refactor-safe` / `git-workflow` 折入 `dev-workflow` |
| Stack | 3 | **3** | 0 | `oxn-stack` / `git-stack` / `draft-promote-tooling` 保留 |
| Blueprint | 4 | **4** | 0 | `oxn-blueprint` / `bug-fix-blueprint` / `draft-promote-router` / `promote-target-aware-workflow` 保留 |
| Roadmap | 1 | **1** | 0 | `oxn-system` 保留（但 enum `roadmap` → `assetmap`） |
| **Asset 总数** | **38** | **33** | **-5（-13.2%）** | — |
| Probe（非 Asset） | 4 项目 + 19 builtin = 23 | 3 项目 + 19 builtin = **22** | -1 | 删 `heading-skeleton-check.md`（指向已退役 Intent Pool v3） |

**dev-workflow slot 列表收敛**：

| 当前 4 slot | 折入 5 slot | 折入后 9 slot |
|---|---|---|
| retrieve | `cli-add`（来自 add-cli-subcommand） | retrieve |
| design | `ts-implement`（来自 ts-retrieve-design-develop-test） | design |
| develop | `refactor`（来自 refactor-safe） | develop |
| test | `git-branch`（来自 git-workflow） | test |
| | | cli-add |
| | | ts-implement |
| | | refactor |
| | | git-branch |

slot 折叠规则（决策 E3 c）：Blueprint 引用 `dev-workflow` 即可，由 Work Context 上下文推断走哪个 slot。

---

## 4. PR 分解（7 个 PR，按依赖顺序）

### 依赖图

```
PR-A (Q2 全面改名)
  │
  └─► PR-G (P0 功能修复：parser + 悬挂清理)
        │
        └─► PR-F (代码收敛：字面量 SSOT + .oxn 残留)
              │
              └─► PR-B (Q5 + Q6：Domain 收敛)
                    │
                    └─► PR-D (Q7：references 语法统一)
                          │
                          └─► PR-C (Q8：Workflow 合并)
                                │
                                └─► PR-E (Q1 + Q3：物理归位)
```

### PR 概述

| PR | 内容 | 触发点 | 文件数 |
|---|---|---|---|
| **PR-A** | Q2 全面改名 `roadmap` → `assetmap` | `oxn-asset-domain.md:32-33` 删 `RoadmapAlias` 段 | ~25 |
| **PR-G** | P0 功能修复（parser 格式同步 + 悬挂清理） | `oxn-system.md:34-36` 删 3 悬挂 Blueprint | ~5 |
| **PR-F** | 代码收敛（5 处字面量 SSOT + `.oxn` 残留 + 模板去重） | 5 处 `AssetKind` 字面量 | ~15 |
| **PR-B** | Domain 收敛（删 insight + 合并 probe 到 proof） | `CONTEXT-MAP.md` 更新 | ~10 |
| **PR-D** | references 语法统一（Q7 B 方案） | `extractReferences` 双参数化 | ~10 |
| **PR-C** | Workflow 合并（4 折入 dev-workflow） | `dev-workflow.md` slot 列表扩展 | ~10 |
| **PR-E** | 物理归位（Probe ≠ Asset 显式化） | `paths.ts:14` `AssetType` 改名 | ~8 |

---

## 5. 各 PR 文件清单

### PR-A：Q2 全面改名（~25 文件）

**类型层**：
- `packages/engine/src/infra/paths.ts:108-116` — `ALL_ASSET_KINDS` 枚举值 `roadmap` → `assetmap`
- `packages/engine/src/infra/paths.ts:94-100` — `DEFAULT_ASSET_DIRS` 键名改 `assetmap`（value 仍 `assetmaps`）
- `packages/engine/src/Roadmap/types.ts` — `Roadmap` 类型/接口名 → `AssetMap`；目录模块改名 `AssetMap/`
- `packages/engine/src/Roadmap/parser.ts` — 模块/类型改名（同步修 parser 格式 P0）
- `packages/engine/src/Roadmap/sync.ts` — 同上

**5 处字面量**（PR-F 同改，但 PR-A 优先）：
- `packages/engine/src/Asset/dag-validator.ts:36`
- `packages/cli/src/commands/onboard.ts:277`
- `packages/engine/src/Draft/skeleton.ts:35`
- `packages/engine/src/Draft/__tests__/promote-dispatch.test.ts:272`
- `packages/engine/src/infra/probes/stale-draft-check.ts:139`

**Asset 文件**：
- `.openxenon/assets/assetmaps/oxn-system.md:2` frontmatter `entity: roadmap` → `entity: assetmap`

**Domain 文件**：
- `.openxenon/assets/domains/oxn-asset-domain.md:32-33` — 删 `RoadmapAlias` 段（已无别名）
- `.openxenon/assets/domains/oxn-project-domain.md` — 所有 `Roadmap` 引用改 `AssetMap`
- `.openxenon/assets/domains/oxn-cli-domain.md` — 同上
- `.openxenon/assets/domains/oxn-work-domain.md` — 同上
- `.openxenon/assets/domains/oxn-engine-domain.md` — 同上

**守门脚本**：
- `scripts/check-versioned-docs.ts`（如引用）
- `scripts/check-asset-structure.ts:47,218`

**Skill / CLI 文档**：
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-assetmap/instruction.md`
- `docs/product/zh-cn/reference/cli-user-guide.md`
- `docs/product/zh-cn/roadmap.md` → 重命名为 `assetmap.md`（如有）

**测试**：
- `packages/engine/src/Draft/__tests__/promote-dispatch.test.ts` 同步
- 新增 parser 格式兼容测试

### PR-G：P0 功能修复（~5 文件）

**Parser 格式同步**：
- `packages/engine/src/Roadmap/parser.ts:148` — scene 标题正则适配 `### scene-<name>` 形态（v3.1.0 格式）
- `packages/engine/src/Roadmap/parser.ts:181-228` — link 格式适配 bullet 列表（不再用 markdown 表格）

**悬挂清理**：
- `.openxenon/assets/assetmaps/oxn-system.md:34-36` — 删除 3 个悬挂 Blueprint 引用（`doc-prod-workflow` / `doc-dev-workflow` / `doc-rfc-workflow` 已归档）

**回填**：
- `.openxenon/assets/assetmaps/oxn-system.md:10` `oxn-source-sha: pending` → 实际 sha

**AssetPaper 字段统一**：
- `packages/engine/src/Asset/validate.ts:179-185` — 选 4 字段（abstract + references + citations + auditTrail）
- `.openxenon/assets/domains/oxn-asset-domain.md:100-103` `Inv4` 同步升 4 字段

### PR-F：代码收敛（~15 文件）

**5 处字面量 SSOT 化**：
- `packages/engine/src/Asset/dag-validator.ts:36` → `import { ALL_ASSET_KINDS, type AssetKind } from '@openxenon/engine/infra/paths'`
- `packages/cli/src/commands/onboard.ts:277` → 同上
- `packages/engine/src/Draft/skeleton.ts:35` — 删 `ASSET_KINDS`，import `ALL_ASSET_KINDS`
- `packages/engine/src/Draft/__tests__/promote-dispatch.test.ts:272` → 同上
- `packages/engine/src/infra/probes/stale-draft-check.ts:139` → 同上

**`.oxn` 残留清理**：
- `packages/engine/src/Asset/evolve.ts:40-75` — 删 `.oxn` 分支
- `packages/engine/src/Asset/delete.ts:32-34, 69-72` — 同上
- `packages/engine/src/Asset/create.ts:193-209` — `createRoadmapTemplate` 改 `.md` 输出（`oxn-system.md` 形态）
- `packages/engine/src/Asset/create.ts:218` — 默认值 `'oxn'` → `'md'`

**模板去重**：
- `packages/engine/src/Asset/domain-manager.ts:6-62` — 与 `Asset/create.ts:12-39` 模板内容合并
- `packages/engine/src/Asset/blueprint-manager.ts:11` — 删 `_slotsArg` 死参数

**路径拼接**：
- `packages/engine/src/Asset/internal/archived-resolver.ts:42,52,69` — `${kind}s` → `DEFAULT_ASSET_DIRS[kind]`

**死类型清理**：
- `packages/engine/src/Asset/types.ts:67-94` — 删 `CompileInput/Result` / `SyncInput/Result`
- `packages/engine/src/Asset/types.ts:37-44` — 删 `ValidateResult.ast/domain/blueprint/stack` 未填充字段

**Skill 同步**：
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-asset/instruction.md:7,12` — 删 `--type asset`（代码无此参数）
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-asset/references/asset-evolution.md:29-32` — 删 `--evolve-from`（代码无此参数）

### PR-B：Domain 收敛（~10 文件）

**删除**：
- `.openxenon/assets/domains/oxn-insight-domain.md`
- `.openxenon/.archived/assets/domains/oxn-insight-domain.md`（如有）
- `.openxenon/assets/domains/oxn-probe-domain.md`
- `.openxenon/.archived/assets/domains/oxn-probe-domain.md`（如有）

**合并**（E2 = a：Insight 术语放 `oxn-proof-domain.md`）：
- `.openxenon/assets/domains/oxn-proof-domain.md` — 追加内容：
  - `## Concept` 段追加 Axiom：`Probe` / `ProbeOutcome` / `UseName` / `ProbeName` / `InterferenceFlag`（来自 `oxn-probe-domain.md`）
  - `## Concept` 段追加 Axiom：`Insight` / `TrustMark` / `Taint` / `BoundaryDeviation` → 收敛至 `InterferenceFlag`（来自 `oxn-insight-domain.md`）
  - 原 Probe Domain `## Schema` 段改写为 `## Concept.Probe` 下的 Axiom（`SchemaFieldMapping` / `TargetFrozenJsonStructure`，Q11 b 决策）
  - `## Boundary` 段追加 Inv26-29 + Inv4 合并（来自 Probe Domain）
- 删除 `.openxenon/draft-skeletons/insight-*.md`（如有）

**索引更新**：
- `CONTEXT-MAP.md` — 8 个 context → 7 个（删 Insight + Probe），Proof 段扩展，更新 Relationships 图
- `.openxenon/assets/assetmaps/oxn-system.md` — scene-doc/dev/debug/test/release/onboard 中删除引用 `oxn-insight-domain` / `oxn-probe-domain` 的条目
  - scene-doc 删 `oxn-insight-domain`（如有）
  - scene-debug 删 `oxn-probe-domain`

### PR-D：references 语法统一（~10 文件）

**代码**：
- `packages/engine/src/Asset/internal/reference-checker.ts:107-160` — `extractReferences(parentKind, refStr)` 双参数化
  - bare name → 在 `assets/{parentKind}s/{name}.md` 查
  - `@md/{kind}/{name}` → 兼容 Blueprint 现状（向后兼容，标记 deprecated）
  - 找不到 → 报错（含 cycleHint）
- `packages/engine/src/Asset/dag-validator.ts` — 反向引用解析同步支持 parent kind

**Blueprint 文件**（去 `@md/` 前缀）：
- `.openxenon/assets/blueprints/oxn-blueprint.md:29-43` — `- workflow: @md/workflows/oxn-workflow` → `- workflow: oxn-workflow`
- `.openxenon/assets/blueprints/bug-fix-blueprint.md:11` — 同上
- `.openxenon/assets/blueprints/draft-promote-router.md:53` — 同上
- `.openxenon/assets/blueprints/promote-target-aware-workflow.md:60` — 同上

**Domain Inv 强化**：
- `.openxenon/assets/domains/oxn-asset-domain.md:133-134` `Inv15` 升级：
  - 旧："references 仅可引用同 AssetKind"
  - 新："bare name references 强制同 AssetKind（parent kind 推断）；跨 kind 必须用 Blueprint `## Use` 段（显式 `kind:` 字段）"
- 新增 Inv：references 解析优先级（bare > `@md/` deprecated）

**Skill / 文档**：
- `packages/cli/src/skills/locales/{en,zh-CN}/oxn-asset/instruction.md` — references 写法示例更新

### PR-C：Workflow 合并（~10 文件）

**dev-workflow 接收**：
- `.openxenon/assets/workflows/dev-workflow.md` — 扩展 slot 列表：
  - 现有 4 slot（retrieve / design / develop / test）
  - 新增 5 slot：`cli-add`（来自 add-cli-subcommand）/ `ts-implement`（来自 ts-retrieve-design-develop-test）/ `refactor`（来自 refactor-safe）/ `git-branch`（来自 git-workflow）
  - 最终 9 slot
- 在 `## Phases` 增加 Axiom 解释 slot 折叠规则（E3 c 决策）

**删除**：
- `.openxenon/assets/workflows/add-cli-subcommand.md`
- `.openxenon/assets/workflows/ts-retrieve-design-develop-test.md`
- `.openxenon/assets/workflows/refactor-safe.md`
- `.openxenon/assets/workflows/git-workflow.md`

**更新引用方**：
- `.openxenon/assets/assetmaps/oxn-system.md:scene-dev` — 删除这 4 个 workflow 引用条目（保留 dev-workflow 即可）
- 任何 Blueprint 引用这 4 个 workflow 的位置 — 改为引用 `dev-workflow` + 在 Blueprint Slot 内指定 `slot: cli-add` 等

**Domain 文件**：
- `.openxenon/assets/domains/oxn-work-domain.md` — 新增 Axiom 描述 "dev-workflow slot 折叠规则"

### PR-E：物理归位（~8 文件）

**新建目录**：
- `.openxenon/probes/`（与 `.openxenon/assets/` 平级，不混 Asset）

**迁移**：
- `.openxenon/assets/probes/doc-boundary.md` → `.openxenon/probes/doc-boundary.md`
- `.openxenon/assets/probes/docs-build.md` → `.openxenon/probes/docs-build.md`
- `.openxenon/assets/probes/docs-heading-check.md` → `.openxenon/probes/docs-heading-check.md`

**删除**：
- `.openxenon/assets/probes/heading-skeleton-check.md`（指向已退役 Intent Pool v3）
- `.openxenon/assets/probes/` 目录（迁移+删除后空目录清理）

**类型改名**：
- `packages/engine/src/infra/paths.ts:14` — `AssetType = 'probes' | 'blueprints' | 'parts'` → `EngineModuleType = 'probes' | 'blueprints' | 'parts'`
- `packages/engine/src/infra/paths.ts` 同文件其他 `AssetType` 引用全改

**Probe 路径解析**：
- `packages/engine/src/Proof/probe-lint.ts` — 同步更新探针路径解析（`.openxenon/probes/` 与 builtin 并查）

**Domain 文件**：
- `.openxenon/assets/domains/oxn-proof-domain.md`（PR-B 已合并）— 在 Probe Domain 段补 Axiom 说明项目探针路径（`.openxenon/probes/*.md`）

---

## 6. 验证命令清单

每 PR 完成后必跑：

```bash
# 1. 类型 / Lint
bun run typecheck
bun run lint
bun run check

# 2. 单元 + 集成测试
bun test

# 3. Asset 结构守门
bun scripts/check-asset-structure.ts
bun scripts/check-doc-boundary.ts
bun scripts/check-versioned-docs.ts
bun scripts/validate-dependencies.ts

# 4. 端到端冒烟
oxn asset check
oxn assetmap show oxn-system --scene dev
oxn assetmap suggest --goal "fix login bug" --scene dev

# 5. 文档同步校验
bun scripts/sync-domain-glossary.ts

# 6. Q2 改名残留扫描（PR-A 专属）
rg -l "roadmap" --type md

# 7. references 语法残留扫描（PR-D 专属）
rg -l "@md/(domains|workflows|stacks|blueprints|assetmaps)" --type md
```

---

## 7. 风险登记表

| # | 风险 | 缓解措施 |
|---|---|---|
| R1 | `roadmap` → `assetmap` 全面改名可能漏改 | PR-A 后跑 `rg -l "roadmap" --type md` 列出残留；CI 加 grep 守门 |
| R2 | 4 Workflow 合并后 dev-workflow slot 列表过长（9 slot） | 加 Axiom 解释 slot 折叠规则（E3 c）；用户走 Blueprint 时按上下文推断 |
| R3 | Probe Domain 并入 Proof Domain 后上下文长度增加 | 分 Axiom 群（`## Concept.Probe` + `## Concept.Insight` + `## Boundary.Probe` 等） |
| R4 | references 语法统一后老 Blueprint 引用 `@md/` 仍合法（向后兼容） | 长期看 `@md/` 是 deprecated，新代码用 bare |
| R5 | 一次性合入 7 PR 可能引发集成冲突 | 按依赖顺序合并（PR-A → G → F → B → D → C → E） |
| R6 | `oxn-source-sha: pending` 仍可能在 PR 后未回填 | PR-G 末尾强制回填（CI 校验） |
| R7 | 探针文件迁出 `.openxenon/assets/` 后 probe-lint 路径解析失效 | PR-E 同步更新 `packages/engine/src/Proof/probe-lint.ts` 路径 |
| R8 | 12 处源码字面量改名后，外部消费者（如 IDE 插件）依赖旧 enum 值 | 在 changelog 显式标注 breaking change |
| R9 | 删除 `oxn-insight-domain` 后，6 个 context 引用关系图变化 | CONTEXT-MAP.md 同步更新；cross-domain 引用检查 |
| R10 | E3 c（slot 上下文推断）可能引入歧义 | 在 `oxn-work-domain.md` 加 Axiom 明确 slot 推断优先级（goal > blueprint > workflow） |
| R11 | 一次性 PR 节奏（C3）可能引发 code review 疲劳 | 每个 PR 加清晰的 changelog + 风险注释；reviewer 按 PR 顺序过 |

---

## 8. 落地路径与 Promote 引导

### 8.1 本 Draft 的 Promote 路径

| Promote 目标 | 路径 | 适用场景 |
|---|---|---|
| **→ RFC** | `oxn draft promote design-asset-convergence-v064 --target rfc --archive-after` | 内容升格为规定性决策（v0.6.4 Asset 收敛的官方 RFC） |
| **→ Asset (Domain)** | `oxn draft promote design-asset-convergence-v064 --target asset --kind domain --archive-after` | 收敛为 Domain 文件（需先在 Domain 内拆分 Axiom） |
| **→ Work** | `oxn draft promote design-asset-convergence-v064 --target work --archive-after` | 分解为多阶段 Work（7 PR × IAP 三阶段） |

**推荐路径**：
1. 短期：先 promote 为 RFC（`RFC-0027-asset-convergence-v064.md`），作为 v0.6.4 落地宪法
2. 中期：每 PR 开工时 create 独立 Work（`fix-asset-convergence-pr-{a,b,c,d,e,f,g}`），通过 IAP 闭环执行
3. 长期：所有 PR merge 后，本 Draft 可 archive 归档

### 8.2 IAP 阶段映射

| PR | Intent | Align | Proof |
|---|---|---|---|
| PR-A | 12 处字面量改名 + 4 处术语统一 | INV15 kind-isolation 验证 | `oxn assetmap suggest --goal "test" --scene dev` 返回正常 |
| PR-G | parser 格式同步 + 悬挂清理 | parser 单元测试覆盖 v3.1.0 格式 | `bun test packages/engine/src/Roadmap/parser.test.ts` 全绿 |
| PR-F | 5 处字面量 SSOT + 残留清理 | typecheck + lint | 旧 `.oxn` 文件无残留 |
| PR-B | Domain 收敛 + Insight 术语归宿 | 7 Domain 互引验证 + 守门脚本通过 | `oxn asset check` 全绿 |
| PR-D | references 语法统一 + INV15 强化 | `extractReferences` 双参数测试 | `isAssetReferenced` 无假阴性 |
| PR-C | 4 Workflow 折入 dev-workflow | dev-workflow slot 9 个全可解析 | `oxn asset check` 全绿 |
| PR-E | Probe 物理归位 + AssetType 改名 | 探针路径解析测试 | 22 Probe 全部可发现 |

### 8.3 changelog 路径

PR-A 完成后追加 `.changes/0-6-4-asset-convergence.md`：

```markdown
---
version: 0.6.4-alpha.0
type: breaking-change
---

# 0.6.4-alpha.0: Asset 数量与定义收敛

## Breaking Changes

- **AssetMap/Roadmap 全面改名 `assetmap`**：枚举值 `roadmap` → `assetmap`；目录仍 `assetmaps/`；`Roadmap` 类型 → `AssetMap`
- **Probe ≠ Asset 显式化**：项目探针文件从 `.openxenon/assets/probes/` 移至 `.openxenon/probes/`
- **`oxn-insight-domain` 退役**：Insight 术语并入 `oxn-proof-domain`
- **`oxn-probe-domain` 并入 `oxn-proof-domain`**
- **references 语法**：bare name + parent-kind metadata 推断；`@md/{kind}/{name}` 标记 deprecated
- **Workflow 合并**：4 个折入 `dev-workflow`（17 → 13）

## Asset 数量变化

- Domain: 13 → 12
- Workflow: 17 → 13
- Stack: 3 → 3
- Blueprint: 4 → 4
- Roadmap: 1 → 1
- **总计**: 38 → 33（-13.2%）
```

---

## 9. 关键文件引用速查

### 类型定义层
- SSOT：`packages/engine/src/infra/paths.ts:108-116` (`ALL_ASSET_KINDS`)
- `AssetType` 改名 → `EngineModuleType`：`packages/engine/src/infra/paths.ts:14`
- `AssetFormat` deprecation：`packages/engine/src/infra/paths.ts:44`
- `AssetScope` 类型：`packages/engine/src/Asset/types.ts:12, 54`
- `extractReferences` 升级：`packages/engine/src/Asset/internal/reference-checker.ts:107-160`

### 加载/解析/校验层
- `resolveAssetDir`：`packages/engine/src/infra/paths.ts:131-165`
- `parseRoadmapMdContent`：`packages/engine/src/Roadmap/parser.ts:60-83`（P0 修）
- `EntityCompiler` 派发：`packages/engine/src/Asset/validate.ts:60-72`
- DAG Kahn's algorithm + Tarjan SCC：`packages/engine/src/Asset/dag-validator.ts:74-205`

### 业务操作层
- Asset create 模板：`packages/engine/src/Asset/create.ts:12-263`
- Archive：`packages/engine/src/Asset/archive.ts:29-100`
- Delete（删 `.oxn` 分支）：`packages/engine/src/Asset/delete.ts:28-99`
- Evolve（删 `.oxn` 分支）：`packages/engine/src/Asset/evolve.ts:26-110`

### CLI 命令层
- `oxn asset` 7 子命令：`packages/cli/src/commands/asset.ts:62-497`
- `oxn work create --asset-kind`：`packages/cli/src/commands/work.ts:562-885`
- `oxn assetmap list/show/suggest/sync/validate`：`packages/cli/src/commands/assetmap.ts:68-259`
- `oxn onboard --new` 5 Asset 复制：`packages/cli/src/commands/onboard.ts:277-300`

### 守门与文档层
- Asset 结构 v2/v3 守门：`scripts/check-asset-structure.ts:1-900`
- Domain Inv1-29：`oxn-asset-domain.md:91-176`
- Probe Domain Inv26-29：`oxn-probe-domain.md:72-82`（PR-B 后并入 proof）
- Blueprint 守门（`## Use <type>` / `## Slot` / `### Scope` / `### Context Template`）：`scripts/check-asset-structure.ts:528-770`
- AssetMap Parser 与实际格式不兼容（实测 0 scenes）：`packages/engine/src/Roadmap/parser.ts:148` vs `oxn-system.md:26,38,57,63,69,76`

### 概念层
- 5 AssetKind 收敛：`packages/engine/src/infra/paths.ts:108-114`
- RoadmapAlias 已废弃：`oxn-asset-domain.md:32-33`（PR-A 后删）
- 3 边界框架：`docs/adrs/0054-three-boundary-framework.md`、`docs/rfc/zh-cn/RFC-0020-three-boundary-blueprint-elevation.md`
- AssetPaper 4 字段：`docs/rfc/zh-cn/RFC-0023-asset-paper-schema.md`、`docs/adrs/0051-asset-paper.md`

---

## 10. 与现有架构原则的一致性

| 原则 | 一致性 |
|---|---|
| **5 AssetKind 封闭**（ADR-0053 / RFC-0020 §7.1） | ✓ 维持封闭，Probe 显式排除 |
| **3 边界 + Blueprint 组合 + AssetMap 索引**（ADR-0054） | ✓ 维持 |
| **AssetPaper 4 字段**（ADR-0051 / RFC-0023） | ✓ 升级 Inv4 到 4 字段 |
| **AssetMap ≠ Roadmap 术语锁定**（RFC-0013 D4） | ✓ 全面改名 `assetmap`，原 alias 回收 |
| **AI 自建 Asset 走 Draft → Promote**（ADR-0084） | ✓ 本 Draft 是收敛宪法，PR 期间工程师创建 Work 执行 |
| **PlanLock 5-hash**（design-blueprint-context-template） | ✓ 不影响，Asset 侧独立 |
| **版本号中性原则**（AGENTS.md 第 47 行） | ⚠️ Domain 文件带 version 字段是历史遗留，本设计**不**在 v0.6.4 收敛（保留 v1.0.0 / v1.1.0 / v0.1.0） |
| **跨层引用规则**（RFC/Doc/Dev 不依赖 Meta 层） | ✓ 所有 PR 不破坏 |

---

## 11. 待执行时的最后确认

实施 PR 前还需 3 个确认（已在 §2 E1/E2/E3 锁定）：

1. **E1**：PR 顺序按依赖排序（PR-A → G → F → B → D → C → E），合并成 7 个独立 PR
2. **E2**：Insight 术语归宿放 `oxn-proof-domain.md` 的 `## Concept` 段（与 Probe Axiom 同群）
3. **E3**：dev-workflow slot 折叠采用 Blueprint 引用 `dev-workflow` + 上下文推断 slot

**开工建议**：
1. **第一刀 PR-A** 单独合入（小步快跑，建立 changelog 基线）
2. **PR-G** 紧随其后（P0 修复，影响 `oxn roadmap suggest` 命令可用性）
3. **PR-F** 与 **PR-B** 合并为 1 PR（代码 + Domain 同步收敛）
4. **PR-D** 单独合入（references 语法改动 review 成本高）
5. **PR-C** 单独合入（Workflow 合并影响所有 Blueprint）
6. **PR-E** 最后合入（物理归位，破坏性最强）

每个 PR 合入后跑 §6 验证命令清单；CI 全绿方可下一个 PR。

<!-- 已迁移：v0.7 CONTEXT-MAP.md 退役，详见 RFC-0028。文件中 CONTEXT-MAP 原文引用保留作为历史考古链，失效链接请用 git blame 追溯或参考对应 Domain / RFC。-->
