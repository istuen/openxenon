---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-08-04
accepted: 2026-08-04
supersedes: null
superseded-by: null
related:
  - .openxenon/CONTEXT-MAP.md
  - .openxenon/assets/domains/oxn-asset-domain.md
  - .openxenon/assets/domains/oxn-project-domain.md
  - .openxenon/assets/assetmaps/oxn-system.md
  - docs/adrs/0069-asset-bootstrap-completeness.md
  - docs/adrs/0050-onboarding-via-starter-work.md
  - docs/rfcs/RFC-0011-builtin-asset-two-layer.md
  - docs/rfcs/RFC-0012-bootstrap-exemption.md
  - docs/rfcs/RFC-0013-versioning-policy.md
  - docs/rfcs/RFC-0014-asset-injection-mechanism.md
---

# ADR-0089: 项目消费者 Onboarding 统一入口（5 内置起手 Asset）

> **状态**：✅ Accepted（2026-08-04 — Stage B 落地 5 起手 Asset 模板 + Domain 术语同步完成）
> **日期**：2026-08-04
> **来源**：2026-08-04 `/grilling` session（domain-modeling skill）
> **影响层**：L3-CLI（`oxn onboard`）+ L0-Asset（5 起手 Asset）+ RFC-0011 `@oxn/` 层

## 实施状态（2026-08-04 → 2026-08-05）

- ✅ **Stage B**：5 起手 Asset 模板落盘（ADR-0090 路径迁移后）
  - `packages/engine/src/builtin/domains/doc-md-domain.md`（82 行）
  - `packages/engine/src/builtin/workflows/md-author-workflow.md`（62 行）
  - `packages/engine/src/builtin/stacks/md-stack.md`（39 行）
  - `packages/engine/src/builtin/blueprints/md-author-blueprint.md`（74 行）
  - `packages/engine/src/builtin/assetmaps/md-system.md`（93 行）
<!-- allow-version -->
- ✅ **Domain 术语同步**：`oxn-asset-domain.md` v0.5.0
<!-- /allow-version -->
  - 新增 4 术语：Onboarding Starter / Project Bootstrap / Onboarding Path / Asset Check
  - 新增 2 Invariant：inv-23 project-bootstrap-5-assets / inv-24 starter-asset-readonly
- ✅ **Stage A**：`oxn onboard --detect` 完整实现
  - 11 个探测信号（语言 manifest × 8 + .openxenon/ 状态 × 3）
  - 4 种 projectType 判定（new / existing-empty / existing-initialized / existing-completed）
  - JSON + 人类可读双格式输出
- ✅ **Stage C**：`oxn onboard --new` 完整实现
  - 复制 5 起手 Asset 到 `<project>/.openxenon/assets/`
  - 逐个跑 `oxn asset validate`（Engine 层 API）
  - 创建 `.openxenon/.bootstrap-done` 标记
  - 幂等（重复运行 skip 不覆盖）
- ✅ **Stage D Path B1**：`oxn onboard --existing --proof-first`
  - 输出 5 分钟 quickstart 命令清单（不执行）
  - 引导升级到 Path B2
- ✅ **Stage D Path B2**：`oxn onboard --existing --bootstrap`
  - 输出项目专属 Asset 探索清单（基于探测到的语言）
  - 生成 `oxn asset create` 命令（按检测到的语言前缀：node-app-* / py-app-* / rust-app-*）
  - 提供验证步骤
- ✅ **Skill 入口（D6）**：`/oxn-work` Skill 改造
  - zh-CN/en 双 locale instruction.md 增加 Onboarding 触发规则
  - AI 决策流程：detect → 3 选项卡片 → 等工程师确认 → 执行子命令
  - 通过 `oxn init -f` 重建 Skill 验证
- ✅ **代码守卫**：`bun run typecheck` + `bun run lint` 双通过

**ADR-0089 全量落地完成**。

## Context

### 现状盘点

<!-- allow-version -->
v0.6.x 起 OpenXenon 是相对完整的产品，但**项目消费者 onboarding 路径不清晰**：
<!-- /allow-version -->

- **README.md 5 分钟上手**（README.md:22-44）只覆盖 `git clone`（自身贡献者）+ `oxn init --ai <agent>`（项目消费者），**后续怎么走没说**。
- **Quickstart**（`docs/product/zh-cn/quickstart.md`）解决 Proof-First 冷启动（5 分钟闭环），但**升格到完整 IAP 的过渡断裂**——末尾仅一句"→ 用 Domain 和 Blueprint 把验收标准固化为可复用 Asset"，无具体命令。
- **Introduction**（`docs/product/zh-cn/introduction.md`）是 IAP 范式完整叙事（60+ 行），对新手过重。
- **onboard scene**（`oxn-system.md:89-97`）面向 **OXN 自身贡献者**，不是项目消费者。

### 既有 ADR 不充分

- **ADR-0069**（2026-07-22 Accepted）规定项目消费者必须 bootstrap 6 个 Asset（1 Domain + 2 Workflow + 1 Stack + 1 Blueprint + 1 Roadmap）。但 Roadmap 已收为 **AssetMap**（RFC-0013 D4），且 6 数字 + 术语双双过时。**D1 已被现实超越**。
- **ADR-0050**（Proposed）提议 Starter Work 让 AI 跑 IAP 自动建 Asset，但**未规定**：(1) 内置哪 5 Asset；(2) 入口在哪；(3) 成功判据。
- **RFC-0011** 预留了 `@oxn/` 公共层 + `@prj/` 项目层，但 `@oxn/` 实物目前只有 19 个 Probe + 3 个 Blueprint（`src/builtin/probes/`、`src/builtin/blueprints/`），**无 Domain/Workflow/Stack/AssetMap**。
- **RFC-0012** 自举豁免仅适用于 OXN 自身（`src/builtin/` 是 OXN 仓库专属），**不延伸到项目消费者**。

### 核心问题

1. **缺统一入口**——工程师和 AI 都不知道 `oxn init` 之后该跑什么。
2. **缺通用 Asset 模板**——用户必须从 0 设计 5+ 个 Asset，摩擦大。
3. **存量项目无引导**——已有代码项目（`package.json` 存在）如何接入 OXN，路径不明。
4. **ADR-0069 G3 守卫**（Root Workflow 双轨 dev + doc）矛盾——5 Asset 简化版本无法满足原 G3。

### 决策来源

2026-08-04 `/grilling` session（domain-modeling skill）三轮问题锐化：

- 用户 #1：Q4-A 选定"显式子命令 + AI 检测选项"（非自动推断）
- 用户 #2：Q2-B 限定"通用 ≠ 指向 OXN 自身"（避免污染）
- 用户 #3：Q3 修正"Roadmap → Assetmap"（与命名收敛对齐，RFC-0013 D4）
- 用户 #4：Q4 入口分流"新项目 vs 存量项目"
- 用户 #5：Q5 锁定 1 Domain（`doc-md-domain.md` 而非 `generic-dev-domain.md`）
- 用户 #6：Q6 锁定"MD Stack 而非通用技术 Stack"
- 用户 #7：Q11 选 `/oxn-work` 复用 + Blueprint 区分场景
- 用户 #8：Q10 锁定 Domain 命名"实物优先 kebab-case"
- 用户 #9：C-1 组合（md- 前缀对称）

## Decision

### D1: 5 起手 Asset 内置（替代 ADR-0069 D1）

物理位置：`packages/engine/src/builtin/{domains,workflows,stacks,blueprints,assetmaps}/`（RFC-0011 `@oxn/` 公共层 + ADR-0090 builtin 物理位置迁移 + 标记为 `starter` 用途）。

5 Asset 命名（**C-1 组合**，md- 前缀对称）：

| AssetKind | 路径 | 内容边界 |
|---|---|---|
| **Domain** | `domains/doc-md-domain.md` | MD 文档编写通用术语（章节/插图/代码块/链接/引用）+ ban 硬编码路径、TODO 标记 |
| **Workflow** | `workflows/md-author-workflow.md` | 6 slot：retrieve → design → develop → test → verify → review（与 OXN 自身 `dev-workflow.md` 兼容）|
| **Stack** | `stacks/md-stack.md` | MD 工具链（md-pipeline + markdownlint + link-check）；约束：所有项目文档必走 md-pipeline 编译 |
| **Blueprint** | `blueprints/md-author-blueprint.md` | 引用前 3 个 + 4 part：write-doc / edit-doc / validate-doc / publish-doc |
| **AssetMap** | `assetmaps/md-system.md` | 4 scene：integrate（OXN 接入）/ extend（Asset 扩展）/ collaborate（AI 协作）/ upgrade（版本升级）|

**AssetKind 枚举约定**：

- frontmatter `entity: roadmap`（保留 RFC-0013 D4 代码枚举不变）
- 文件目录 `assetmaps/`
- CLI 命令 `oxn assetmap`
- glossary 主术语 `AssetMap`

### D2: 引入 `oxn onboard` 统一入口

新增 CLI 命令 `packages/cli/src/commands/onboard.ts`，子命令：

| 子命令 | 用途 | 触发场景 |
|---|---|---|
| `oxn onboard --new` | 新项目入口：复制 5 Asset + 提示填写 + 跑 `oxn asset check` | 空目录 / 缺依赖管理文件 |
| `oxn onboard --existing` | 存量项目入口：并行 2 路径 | 有 `package.json` / `compose.yaml` 等 |
| `oxn onboard --detect` | 探测项目状态 + 输出建议路径（不执行） | AI 在 Skill 中调用 |
| `oxn onboard --bootstrap` | 存量项目路径 B2：AI 探索建 Asset | 复用 ADR-0050 Starter Work 机制 |

**路径分流**（`--existing` 内部）：

- **Path B1（先 Proof-First）**：复用现有 5 分钟 quickstart 命令
- **Path B2（探索建 Asset）**：AI 扫 README + `package.json` + `src/` 顶层结构 → 提案项目专属 Asset → 工程师审稿 → 落盘 → 跑 `oxn asset check`

### D3: 上下限缩减

| 模式 | Asset 要求 |
|---|---|
| **Proof-First**（仅 Proof 轴）| 不要求 Asset |
| **完整 IAP**（Intent + Align + Proof）| 5 Asset 必含（Domain + Workflow + Stack + Blueprint + AssetMap） |
| **Full E1-E4**（含 Insight）| 5 Asset + 业务上下文 |

### D4: 与既有 ADR 关系

- **ADR-0069 D1**（6 Asset 下限）：**被 D1 替换**（6 → 5，新 5 Asset 集合见上表）
- **ADR-0069 G3**（Root Workflow 双轨 dev + doc）：**保留**（`oxn-workflow` 双轨 = `dev-workflow` + `doc-author` ≈ `md-author-workflow` 内部双轨）
- **ADR-0069 G1/G2**（Asset 数量下限 + Blueprint 依赖完整性）：**保留**（5 Asset 仍需全部满足）
- **ADR-0050**（Starter Work）：**保留作为 `--bootstrap` 内部机制**，不作为用户入口

### D5: 命名规则（Q10 副产品）

| 维度 | 规则 | 备注 |
|---|---|---|
| **Domain 命名** | **实物优先 kebab-case**（`doc-md-domain.md`、`oxn-asset-domain.md`） | 修订 ADR-0069 "domain PascalCase" 旧规 |
| **OXN 自身 Asset 命名** | 保留 PascalCase 历史命名（`oxn-domain` 系列） | 向下兼容，不强制重命名 |
| **新加 Asset 命名** | kebab-case，前缀对齐内容主题（md- / oxn- / generic-） | 与 RFC-0017 术语双层 SSOT 对齐 |

### D6: Skill 入口（Q11-B）

**复用 `/oxn-work` Skill**，不新建 `/oxn-onboard` Skill。场景识别通过 **Blueprint 区分**：

- `md-author-blueprint.md` 标识**文档编写场景**（`onboard` 子场景）
- `oxn-blueprint.md` 标识**通用开发场景**（`develop` 子场景）
- 其他 Blueprint 标识各自子场景

**AI 决策路径**：

```
AI 收到 "用 OXN 引导" 指令
↓
调 oxn onboard --detect --json
↓
解析输出 → 列出 3 选项卡片（新项目 / 存量-Proof-First / 存量-探索建 Asset）
↓
工程师确认 → 进入对应子命令
```

修改文件：`packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md`

## Consequences

### 正面

- **项目消费者 onboarding 路径清晰**：`oxn init --ai <agent>` → `oxn onboard --new|existing` → 跑 `oxn asset check` → 进 Full IAP
- **5 起手 Asset 复用 RFC-0011 `@oxn/` 层**：新增项目无需重新设计 5 Asset
- **命名收敛**：与 RFC-0013 D4 AssetMap 命名一致
- **Skill 入口统一**：复用 `/oxn-work`，不新增 Skill 减少认知负担
- **AI 友好**：探测 JSON 输出供 AI 解析，3 选项卡片模式降低工程师决策成本

### 负面

- **5 Asset 内容维护负担**：每次 MD 工具链升级（md-pipeline / markdownlint / link-check）需同步更新 `md-stack.md`
- **存量项目 Path B2 复杂度高**：AI 推断项目类型准确率依赖 README + `package.json` 质量
- **模板复制 vs 引用语义混淆**：必须强制 `@prj/` 层（RFC-0011）避免污染 `@oxn/` 公共区域

### 风险与缓解

| 风险 | 缓解 |
|---|---|
| 5 Asset 模板被误改 | 类似 `src/builtin/` 路径，标记为只读（chmod 0o444） |
| 存量项目 AI 推断错误 | 工程师审稿环节必走（AI 提案 → 工程师确认 → 落盘） |
| Skill 入口场景辨识冲突 | Blueprint 命名约定（`md-author-*` / `oxn-*` / `generic-*` 前缀对称） |
| ADR-0069 老用户感知断裂 | ADR-0069 D1 改为 `[superseded by ADR-0089 D1]`，文档加迁移提示 |

### 与 OXN 自身的关系

- **OXN 仓库自身 bootstrap**：仍走 RFC-0012 自举豁免（`src/builtin/` 给 OXN 自身用），**不受本 ADR 影响**
- **OXN 仓库根 Asset**（`.openxenon/assets/`）：保持现状，**不复制** starter 5 Asset（防污染）
- **项目消费者 Asset**：通过 `oxn onboard` 复制 starter 5 Asset 到 `<project>/.openxenon/assets/`（RFC-0011 `@prj/` 层）

## Alternatives

### A1: 不做统一入口（保留 5min Quickstart）

**否决**：Q4 入口分流已确认新项目 vs 存量项目走不同路径，统一入口必需。

### A2: 完全复用 OXN 自身 Asset

**否决**：Q2-B 明确"通用 ≠ 指向 OXN 自身"。直接复制 OXN 仓库根 Asset 会污染项目（项目术语与 OXN 术语混淆）。

### A3: 让用户从 0 写 5 Asset（不内置）

**否决**：Q2-B 锁定"OXN 内置一套通用 Asset"。摩擦过大，新项目冷启动阻碍。

### A4: 新建 `/oxn-onboard` Skill（不复用 `/oxn-work`）

**否决**：Q11 锁定 B 方案（复用 + Blueprint 区分）。新增 Skill 增加认知负担。

### A5: 沿用 ADR-0069 6 Asset 下限

**否决**：Roadmap 已收 AssetMap，6 数字 + 术语双双过时。`oxn-onboard` 入口 Read OXN 6 Asset 模板成本高。

### A6: 探测自动推断（无显式子命令）

**否决**：Q4-A 锁定"显式子命令 + AI 检测选项"。探测信号受项目复杂度影响，自动推断可靠性不足。

## References

- [RFC-0011 builtin-asset-two-layer](../rfcs/zh-cn/RFC-0011-builtin-asset-two-layer.md) — `@oxn/` vs `@prj/` 两层机制
- [RFC-0012 bootstrap-exemption](../rfcs/zh-cn/RFC-0012-bootstrap-exemption.md) — OXN 自身自举豁免
- [RFC-0013-versioning-policy D4](../rfcs/zh-cn/RFC-0013-versioning-policy.md) — AssetMap ≠ Roadmap 命名消歧
- [RFC-0014-asset-injection-mechanism](../rfcs/zh-cn/RFC-0014-asset-injection-mechanism.md) — Asset 注入机制（指针 vs 内容）
- [RFC-0017 terminology-two-tier-ssot](../rfcs/zh-cn/RFC-0017-terminology-two-tier-ssot.md) — Domain ↔ glossary 双层 SSOT
- [ADR-0069 asset-bootstrap-completeness](./0069-asset-bootstrap-completeness.md) — 部分 superseded（D1 → D1）
- [ADR-0050-onboarding-via-starter-work](./0050-onboarding-via-starter-work.md) — 部分 superseded（机制保留为 internals）
- [ADR-0067](../rfc/adrs/) — 不评判"P 故意外包"原则（apply to D3 上限）
- [CONTEXT-MAP.md](../../CONTEXT-MAP.md) — 9 Domain 上下文索引
- [oxn-asset-domain.md](../../.openxenon/assets/domains/oxn-asset-domain.md) — Asset 业务领域（待补 Onboarding Starter 术语）
- [oxn-project-domain.md](../../.openxenon/assets/domains/oxn-project-domain.md) — 项目工程领域（待补 Project Bootstrap 术语）

## 实施路径（Stage B → A → C → D）

### Stage B（前置基础）：5 起手 Asset 模板落地

- 新建 `src/builtin/projects/starter/{domains,workflows,stacks,blueprints,assetmaps}/` 5 个 `.md` 文件
- 内容骨架见 D1 表格
- 验证：`oxn asset validate` 5 个全部通过

### Stage A：探测能力

- 新建 `packages/cli/src/commands/onboard.ts`
- 实现 `oxn onboard --detect` 子命令
- 信号探测：检查 `package.json` / `compose.yaml` / `Cargo.toml` / `pyproject.toml` 4 类
- 输出 JSON + 人类可读

### Stage C：新项目入口

- 实现 `oxn onboard --new`：复制 5 Asset + 提示填写
- 复用 `oxn builtin copy`（Stage B 暴露）
- 跑 `oxn asset check` 收尾

### Stage D：存量项目入口

- Path B1：复用现有 5 分钟 quickstart 命令
- Path B2：AI 扫 README + `package.json` + `src/`，生成项目专属 Asset 建议
- 工程师审稿 → 落盘 → 跑 `oxn asset check`

### Skill 入口（Q11-B）

- 修改 `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md`
- 增加：根据 `oxn onboard --detect` 输出推荐 `--new` / `--existing` / `--bootstrap`
- AI 决策路径：先 `detect` → 返回 3 选项 → 工程师确认 → 进对应子命令

### 域名 / 词汇同步

- `oxn-asset-domain.md` 新增 `Onboarding Starter` / `Project Bootstrap` / `Onboarding Path` / `Asset Check` 术语
- `docs/product/zh-cn/concepts/glossary.md` 同步（RFC-0017 单向同步）
- `docs/product/zh-cn/quickstart.md` 加 5 → 30 分钟引导段落（指向 `oxn onboard`）
- `docs/product/zh-cn/introduction.md` 末尾"下一步"加入 `oxn onboard` 链接

## Status 字段含义

| 状态 | 含义 |
|---|---|
| `Proposed` | 已起草，待 review |
| `Accepted` | 已批准，等待落地 |
| `Superseded` | 已被新 ADR 替代（注明 supersede-by） |
| `Deprecated` | 已撤销，不应再使用 |
