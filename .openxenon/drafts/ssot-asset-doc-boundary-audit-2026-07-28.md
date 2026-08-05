# SSOT 收敛 + Asset/Doc 边界审计与修复计划

> **日期**：2026-07-28
> **来源**：grilling session on SSOT management（domain-modeling + grill-with-docs skills）
> **状态**：active（Working Draft，待提升为 RFC 或 promote 到对应 Asset）
> **关联**：ADR-0054（三边界框架）/ ADR-0055（Blueprint 组合模板）/ three-boundary-blueprint-elevation-rfc.md / v0.7.3-ideal-data-flow-rfc.md / ADR-0061（D3 lock-check）/ RFC-0013（版本号政策）

---

## TL;DR

本次审计对 15 个 Workflow + 5 个 Blueprint 做了完整扫描，发现：
- **SSOT 一词被重载到 5 种含义**（product identity / 规定性 / 模板 / 版本号 / 定义性），但项目未明确区分
- **observe 的设计位置存在 v0.7 编译器 vs v0.7.3 RFC 草稿的冲突**，需要锁定权威
- **`forbidden-cross-layer-imports` ban 中 3 条规则未在脚本里强制**（assets-to-docs / rfc-to-product-doc / rfc-to-dev-doc）
- **15 个 Workflow 中 0 个同时合规 v0.7 编译器 + v0.7.3 RFC**
- **5 个 Blueprint 全部不合规新模板**（kind-isolation / scope 前缀 / Use 格式 / Boundaries refs）

修复分 10 步核心 + N 步延后。

---

## Part 1: 调查发现

### 1.1 SSOT 一词的 5 种含义

| 出处 | 用法 | 实际指向 |
|---|---|---|
| `oxn-domain.md` inv-1 | `single-source-of-truth: OpenXenon = OXN CLI + OXN Engine` | 产品身份唯一性 |
| `oxn-project-domain.md` inv-2 | `RFC 是 OXN 项目的 SSOT` | 规定性内容权威源 |
| `oxn-asset-domain.md` inv-18 | `Asset 模板是 SSOT` | Asset 模板权威源 |
| RFC-0013 D5 | `package.json 为版本号 SSOT` | 版本号权威源 |
| `oxn-project-domain.md` D1 | Asset = 定义性 modality | 定义性内容权威源 |

**收敛方案**（用户决策 2026-07-28）：
- SSOT 收敛回其自身定义——**Single Source of Truth**（单一事实来源 / 单一可信源），指某一领域的唯一权威源
- 5 种含义分别标注其应用领域：
  - **RFC = 开发 OpenXenon 的 SSOT**（规定性内容权威源）
  - **Asset = OXN Engine 的 SSOT**（定义性内容权威源）
  - **package.json = 版本号 SSOT**
  - **product identity**（不用 SSOT 术语，直接命名）

### 1.2 observe 设计位置的关键冲突

| 来源 | 状态 | observe 位置 |
|---|---|---|
| ADR-0021 | Adopted | Probe 块（"我测什么"） |
| ADR-0054 | Adopted, 2026-07-10 | **Workflow** = slots/deps/observe |
| ADR-0055 | Adopted, 2026-07-10 | 旧 Blueprint 改名 Workflow，observe 语义不变 |
| three-boundary-blueprint-elevation-rfc.md | Draft | Workflow Slots 有 observe；Blueprint Boundaries 也有 observe |
| v0.7.3-ideal-data-flow-rfc.md | Draft | Workflow = `slots (name + desc + deps + observe)`；Blueprint = `## Boundaries (slot 级 refs/observe/deps)` |
| ADR-0061 D3 | Adopted | `Blueprint.boundaries[].observe` 是 Task.probes 的白名单（lock 期 hard-check） |
| **v0.7 Workflow 编译器**（实际代码） | **已实现** | slot 只有 `name + desc`（deps + observe 移到 Blueprint Boundary） |

**用户决策 2026-07-28：以 v0.7 编译器为准**。
- Workflow slot = `name + desc`（无 observe / deps）
- observe 只在 Blueprint Boundary
- Blueprint.boundaries[].observe 是 Task.probes 的白名单（ADR-0061 D3）

### 1.3 `forbidden-cross-layer-imports` 未强制规则

`oxn-project-domain.md` Bans 声明 6 条规则：

| ban item | 对应 check-doc-boundary.ts 规则 | 状态 |
|---|---|---|
| `docs-to-openxenon` | `product-no-openxenon` | ✅ 强制 |
| **`assets-to-docs`** | **无** | ❌ **未强制** |
| **`rfc-to-product-doc`** | **无** | ❌ **未强制** |
| **`rfc-to-dev-doc`** | **无** | ❌ **未强制** |
| `drafts-rfc-to-assets` | `drafts-rfc-no-assets` | ✅ 强制 |
| `dev-to-drafts` | `dev-no-drafts` | ✅ 强制 |

ban items 中 **3 条无对应脚本规则**，属于"声明但未强制"。

### 1.4 Blueprint references 违反 kind-isolation

ADR-0054 kind-isolation 原则：每种边界类型只引用同类型。Blueprint 是唯一跨类型组合实体（通过 `## Use`，**不是 `references` 字段**）。

但 `asset-workflow.md` 等 4 个 Promote Blueprint 的 `references` 引用混 kind：
- `@prj/workflows/doc-author`（Workflow）
- `@prj/domains/oxn-domain`（Domain）
- `@prj/domains/oxn-asset-domain`（Domain）
- `@prj/stack/oxn-stack`（Stack，且文件不存在）

---

## Part 2: 审计结果

### 2.1 Workflow 审计（15 个文件）

| # | 文件 | ## Use? | ## Boundaries? | ## Slots? | observe:[] slot | 缺 desc | scope | 严重度 |
|---|---|---|---|---|---|---|---|---|
| 1 | `add-cli-subcommand.md` | NO | NO | YES (4) | 0 | **4/4** | none | HIGH（## Props + 缺 desc）|
| 2 | `asset-archive.md` | NO | NO | YES (3) | **3/3** | **3/3** | none | HIGH（observe:[] + 缺 desc）|
| 3 | `asset-create.md` | NO | NO | YES (4) | **4/4** | **4/4** | none | HIGH（observe:[] + 缺 desc）|
| 4 | `asset-evolve.md` | NO | NO | YES (3) | **3/3** | **3/3** | none | HIGH（observe:[] + 缺 desc）|
| 5 | `dev-workflow.md` | NO | NO | YES (4) | 0 | 0 | **@prj/** | MEDIUM（@prj/ + fs-match）|
| 6 | **`doc-author.md`** | **YES** ❌ | **YES** ❌ | NO | — | — | **@prj/** | **CRITICAL（Blueprint 形状）**|
| 7 | `doc-publish.md` | NO | NO | YES (4) | 0 | 0 | none | LOW（frontmatter 极简）|
| 8 | `explore-analyze-report.md` | NO | NO | YES (3) | 0 | **3/3** | none | HIGH（## Props + 缺 desc）|
| 9 | `fix-issue.md` | NO | NO | YES (4) | 0 | **4/4** | none | HIGH（## Props + 缺 desc）|
| 10 | `git-workflow.md` | NO | NO | YES (3) | 0 | **3/3** | none | HIGH（## Props + 缺 desc）|
| 11 | `migrate-version.md` | NO | NO | YES (5) | 0 | **5/5** | none | HIGH（## Props + 缺 desc）|
| 12 | `oxn-workflow.md` | NO | NO | YES (2) | N/A | 0 | none | LOW（只有 desc，符合 v0.7 编译器）|
| 13 | `refactor-safe.md` | NO | NO | YES (4) | 0 | **4/4** | none | HIGH（## Props + 缺 desc）|
| 14 | `release-cut.md` | NO | NO | YES (5) | 0 | **5/5** | none | HIGH（## Props + 缺 desc）|
| 15 | **`ts-retrieve-design-develop-test.md`** | NO | NO | YES (4) | 0 | **4/4** | none | **CRITICAL（无效 probe 名）**|

**关键发现**：
- 15 个 Workflow 中 **0 个同时合规 v0.7 编译器 + v0.7.3 RFC**
- `doc-author.md`（#6）整个结构是 Blueprint 形状——有 `## Use` + `## Boundaries`，没有 `## Slots`
- `ts-retrieve-design-develop-test.md`（#15）用无效 probe 名 `type-check` / `test-runner`（不在 catalog，应为 `ts-compiles` / `test-pass`）
- `asset-create/evolve/archive`（#2/#3/#4）所有 slot `observe: []` + 缺 `desc`
- 7 个文件有 `## Props`（v0.7 编译器会报 `E_MD_CATEGORY_UNKNOWN`）
- 11 个文件缺 slot `desc`
- 5 个文件用废弃 `fs-match` probe
- 2 个文件用废弃 `@prj/` scope

### 2.2 Blueprint 审计（5 个文件）

| 文件 | Use 格式 | scope | Boundaries | refs 格式 | references 问题 | execution ref |
|---|---|---|---|---|---|---|
| `asset-workflow.md` | OLD (`execution/vocabulary/implementation` + `kind:/ref:`) | **@prj/** | ✅ | OLD (裸名) | ❌ 混 kind（1W + 2D + 1S 缺）| doc-author（语义错）|
| `doc-dev-workflow.md` | OLD | **@prj/** | ✅ | OLD | ❌ 混 kind（1W + 3D）| doc-author |
| `doc-prod-workflow.md` | OLD | **@prj/** | ✅ | OLD | ❌ 混 kind + **8 refs 超 ≤5** | doc-author |
| `doc-rfc-workflow.md` | OLD | **@prj/** | ✅ | OLD | ❌ 混 kind（1W + 2D）| doc-author |
| `oxn-blueprint.md` | HYBRID（命名 H3 + old kind:/ref:）| **@prj/** | ✅ | HYBRID/BROKEN | ✅ `references: []` | oxn-workflow |

**全部 5 个 Blueprint 共有问题**：
- 用旧 `@prj/` scope（应 `@md/`）
- 引用不存在的 Stack（`.openxenon/assets/stacks/` 目录不存在）
- Use↔Boundaries ref 链接断裂
- Boundaries refs 缺 workflow/stack

**0/5 Blueprint 完全合规新模板 + ADR-0054/0055**。

### 2.3 v0.7 编译器 vs v0.7.3 RFC 冲突详情

**v0.7 Workflow 编译器**（`packages/engine/src/oxl/md-bridge/compilers/workflow-compiler.ts`）：
- H2 whitelist = `['Slots']` ONLY（`## Props` 删除，`## Use` / `## Boundaries` 不允许）
- Slot fields = `name + desc` ONLY（deps + observe 移到 Blueprint Boundary）

**v0.7.3 ideal-data-flow RFC**（§2.1 line 57）：
- Workflow slot = `name + desc + deps + observe`
- Blueprint = `## Use (三轴 URI 引用) + ## Boundaries (slot 级 refs/observe/deps)`

**结果**：15 个 Workflow 中无一同时合规两者。

---

## Part 3: 修复计划（用户决策 2026-07-28）

### 3.1 决策
- **Workflow slot 字段权威**：以 **v0.7 编译器**为准（slot = `name + desc`，observe 只在 Blueprint Boundary）
- **Stack 目录**：创建 `.openxenon/assets/stacks/` + `oxn-stack.md`
- **修复范围**：**只修核心问题**（SSOT 收敛 + doc-author.md 重构 + Asset 生命周期 desc 补全 + @prj/→@md/ + 无效 probe 名 + boundary 脚本扩展）

### 3.2 10 步修复

#### Step 1: SSOT 收敛（Q1）
- `oxn-domain.md` inv-1: `single-source-of-truth: OpenXenon = OXN CLI + OXN Engine` → `product-identity: OpenXenon = OXN CLI + OXN Engine`
- `oxn-asset-domain.md` inv-18: `Asset 模板是 SSOT` → `Asset 模板是 OXN Engine 的 SSOT`
- `oxn-project-domain.md` inv-2（保持）: `RFC 是 OXN 项目的 SSOT`
- RFC-0013 D5（保持）: `package.json 为版本号 SSOT`
- glossary 添加 SSOT 术语定义

#### Step 2: 创建 stacks/ 目录 + oxn-stack.md
- 参考 `packages/cli/src/skills/locales/zh-CN/oxn-asset/assets/stack.md` 模板
- 内容：TypeScript ≥5.0 + Node ≥20 + Bun + Biome + bun-test

#### Step 3: 修复无效 probe 名（P0 运行时错误）
- `ts-retrieve-design-develop-test.md`:
  - `type-check` → `ts-compiles`
  - `test-runner` → `test-pass`

#### Step 4: doc-author.md 重构
- `## Use` + `## Boundaries` → `## Slots`（v0.7 编译器）
- 6 个 slot 保留 `desc`，删除 `observe` / `refs` / `constraints`
- observe 信息记录到 memory file，Step 8 迁移

#### Step 5: asset-create/evolve/archive.md 补 desc
- 每个 slot 补 `desc` 字段
- 删除 `observe: []`（v0.7 编译器不需要）

#### Step 6: @prj/ → @md/ scope 替换
- 5 Blueprint + 2 Workflow（doc-author.md, dev-workflow.md）
- `@prj/domains/` → `@md/domains/`
- `@prj/workflows/` → `@md/workflows/`
- `@prj/stack/` → `@md/stacks/`

#### Step 7: asset-workflow.md references 修复
- `references` 改为 `[]`（移除跨 kind 引用）
- `### execution` ref: `doc-author` → `asset-create`（Asset 创建 Blueprint 应引用 Asset 创建 Workflow）

#### Step 8: Blueprint Boundary observe 补全（doc-author 迁移）
- `doc-rfc-workflow.md` validate boundary: 补 `docs-build` + `doc-boundary`
- `doc-dev-workflow.md` validate boundary: 补 `docs-build` + `doc-boundary`
- `doc-prod-workflow.md` validate boundary: 补 `doc-boundary`（已有 `docs-build`）

#### Step 9: check-doc-boundary.ts 扩展
新增 3 条规则：
```typescript
{
  name: 'assets-no-docs',
  description: '.openxenon/assets/ 不可引用 docs/（边界不依赖手册）',
  sourcePattern: /^\.openxenon\/assets\//,
  targetPattern: /^docs\//,
  message: 'Asset 不应依赖手册（边界独立可读）',
},
{
  name: 'rfc-no-product-doc',
  description: 'docs/rfc/ 不可引用 docs/product/（规定性应独立可读）',
  sourcePattern: /^docs\/rfc\//,
  targetPattern: /^docs\/product\//,
  message: 'RFC（规定性）不应引用 product 手册（描述性）',
},
{
  name: 'rfc-no-dev-doc',
  description: 'docs/rfc/ 不可引用 docs/dev/（规定性应独立可读）',
  sourcePattern: /^docs\/rfc\//,
  targetPattern: /^docs\/dev\//,
  message: 'RFC（规定性）不应引用 dev 手册（描述性）',
},
```

#### Step 10: 验证
- `bun run typecheck`
- `bun test`
- `bun run lint`
- `bun scripts/validate-dependencies.ts`
- `bun scripts/check-doc-boundary.ts`

### 3.3 延后不修（非核心）

| 问题 | 文件 | 优先级 |
|---|---|---|
| 7 个 Workflow 有 `## Props`（v0.7 编译器会报错） | #1, #8, #9, #10, #11, #13, #14 | P2 |
| 5 个 Workflow 用废弃 `fs-match` probe | #5, #8, #11, #13, #15 | P2 |
| 11 个 Workflow 缺 slot `desc` | 除 #7 / #12 外 11 个 | P2 |
| 5 个 Blueprint Use/Boundaries 全量格式更新（旧 → 新） | 5 个 Blueprint | P2 |
| frontmatter 4 种模式统一 | 全部 Workflow | P3 |
| `doc-prod-workflow.md` references ≤5 上限违规 | doc-prod-workflow.md | P2 |

---

## Part 4: 影响范围清单

### 4.1 需修改文件（14 个）

| # | 文件 | 修改类型 |
|---|---|---|
| 1 | `oxn-domain.md` | inv-1 改名 |
| 2 | `oxn-asset-domain.md` | inv-18 标注 |
| 3 | `oxn-stack.md`（新建）| 新建 |
| 4 | `ts-retrieve-design-develop-test.md` | probe 名修复 |
| 5 | `doc-author.md` | 重构（Blueprint → Workflow）|
| 6 | `asset-create.md` | 补 desc + 删 observe:[] |
| 7 | `asset-evolve.md` | 补 desc + 删 observe:[] |
| 8 | `asset-archive.md` | 补 desc + 删 observe:[] |
| 9 | `asset-workflow.md` | references 修复 + execution ref 改 |
| 10 | `doc-rfc-workflow.md` | observe 补全 + @prj/→@md/ |
| 11 | `doc-dev-workflow.md` | observe 补全 + @prj/→@md/ |
| 12 | `doc-prod-workflow.md` | observe 补全 + @prj/→@md/ |
| 13 | `dev-workflow.md` | @prj/→@md/ + fs-match→fs-content-match |
| 14 | `check-doc-boundary.ts` | +3 规则 |

### 4.2 引用文件但不直接修改
- `oxn-project-domain.md`（inv-2 保持不变）
- `oxn-blueprint.md`（已是混合格式，按用户选择延后不修）
- `oxn-workflow.md`（已符合 v0.7 编译器）

### 4.3 glossary 待加条目
- **SSOT**（Single Source of Truth）：单一事实来源 / 单一可信源。指某一领域的唯一权威源。本项目内有 4 类 SSOT：
  - **RFC** = 开发 OpenXenon 的 SSOT（规定性内容权威源）
  - **Asset** = OXN Engine 的 SSOT（定义性内容权威源）
  - **package.json** = 版本号 SSOT
  - **product identity**（OXN = CLI + Engine，不用 SSOT 术语）

---

## Part 5: 验证矩阵

修复完成后预期通过的检查：

| 检查 | 当前 | 修复后 |
|---|---|---|
| `bun run typecheck` | ✅ | ✅ |
| `bun test`（1630 tests）| ✅ | ✅ |
| `bun run lint` | ✅ | ✅ |
| `bun scripts/validate-dependencies.ts` | ✅ | ✅ |
| `bun scripts/check-doc-boundary.ts` | 6 rules, 0 violations | **9 rules**, 0 violations |
| `bun run biome check` | ⚠ 1 预存错（oxn-builtin-registry.ts）| 同上（预存）|
| `bun run docs:build` | ⚠ 1 预存错（RFC-0014 ≥ 字符）| 同上（预存）|
| `bun run version:check` | ✅ | ✅ |

---

## Part 6: 未来 Work 入口

这份 working draft 应当作为 `oxn work create asset-migration` 的输入：
1. 提升到 `.openxenon/.archived/drafts/asset-migration-survey.md`（如果 RFC 化）
2. 或保留在 `.openxenon/drafts/` 作为 working draft，让执行阶段 AI 读取

**建议路径**：以 `doc-promote-workflow` Blueprint 走 RFC 化流程，把当前"Plan"段提升为 RFC，最终冻结为 `docs/rfc/zh-cn/RFC-00XX-asset-migration-v0.7.md`。

但 14 个文件改动属于**批量迁移**，可能更适合走 `asset-migration` 自定义 Work（lock Asset → 跑迁移 → submit Proof → finalize）。

---

## 附录 A: doc-author.md observe 迁移矩阵（Step 4 → Step 8 衔接）

`doc-author.md` 重构前 Boundary observe → 迁移到引用 Blueprint：

| doc-author Boundary | observe | → doc-rfc-workflow | → doc-dev-workflow | → doc-prod-workflow |
|---|---|---|---|---|
| pick-domain | fs-exists | gather 已有 fs-exists | pick-domain 已有 fs-exists | pick-domain 已有 fs-exists |
| aggregate-terms | lint-check | gather/author 已有 | aggregate-terms 已有 | aggregate-terms 已有 |
| outline | docs-heading-check | author 已有 lint-check（**缺**）| outline 已有 docs-heading-check | outline 已有 docs-heading-check |
| author | lint-check | author 已有 | author 已有 | author 已有 |
| validate | docs-heading-check, lint-check, docs-build, doc-boundary | validate **缺 docs-build + doc-boundary** | validate **缺 docs-build + doc-boundary** | validate **缺 doc-boundary**（已有 docs-build）|
| publish | fs-exists | promote 已有 fs-exists | publish 已有 fs-exists | publish 已有 fs-exists |

---

## 附录 B: 关键文件位置参考

### ADR / RFC 设计依据
- `docs/adrs/0054-three-boundary-framework.md` — Adopted, 2026-07-10
- `docs/adrs/0055-blueprint-as-composition-template.md` — Adopted, 2026-07-10
- `docs/adrs/0061-data-flow-contract.md` D3 — lock 期 hard-check
- `.openxenon/drafts/rfc/three-boundary-blueprint-elevation-rfc.md`
- `.openxenon/drafts/rfc/v0.7.3-ideal-data-flow-rfc.md`

### 实际编译器代码
- `packages/engine/src/oxl/md-bridge/compilers/workflow-compiler.ts` — v0.7 编译器
- `packages/engine/src/kernel/verdicts/catalog.ts` — probe catalog

### 新模板参考
- `packages/cli/src/skills/locales/zh-CN/oxn-asset/assets/blueprint.md`
- `packages/cli/src/skills/locales/zh-CN/oxn-asset/assets/workflow.md`
- `packages/cli/src/skills/locales/zh-CN/oxn-asset/assets/domain.md`
- `packages/cli/src/skills/locales/zh-CN/oxn-asset/assets/stack.md`

### Boundary 脚本
- `scripts/check-doc-boundary.ts` — 6 条规则（修复后扩展为 9 条）
