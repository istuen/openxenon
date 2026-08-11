---
entity: domain
name: OxnProjectDomain
abstract: |
  OpenXenon 项目工程领域（Asset 结构 v2：Group → Axiom → Theorem）；定义 OXN 自身工程语汇——文档架构情态、Asset/RFC/Doc/Meta 四层 SSOT、
  内置 Asset 两层机制、自举种子豁免、版本号政策（Alpha / Version Fragment / Roadmap / Fix Record / AssetMap）。
  v1.0.0 (2026-08-08): 收编为 Asset 结构 v2 三层模型。语义锁定；13 个 invariant 全部保留。
  v1.0.1 (2026-08-09): 术语同步 — AssetKind=roadmap 回收为 assetmap（v0.6.4 break-change）。
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-asset-domain
citations: 0
synced-at: 2026-08-08
---

# Domain: OxnProjectDomain

> OpenXenon 项目工程领域——元层词汇（meta-vocabulary），定义 OXN 自身工程的术语边界。
> 不描述用户业务，描述 OXN 项目的工程结构与文档架构。

## DocModality

### DefinitionalModality
- 定义性情态——回答"X 是什么"的文档；住 `.openxenon/assets/{kind}/*.md`（E1 Asset）；自举种子允许手动创建（见 Bootstrap Seed Exemption）。

### PrescriptiveModality
- 规定性情态——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`（RFC 规范）；frozen + errata 演进；只引用 `docs/glossary/`（D5）；中文 only（D10）。

### DescriptiveModality
- 描述性情态——回答"怎么用 X"的文档；住 `docs/{product,dev}/{zh-cn,en}/*.md`；产品手册与开发手册。

### MetaModality
- 项目工程元情态——回答"OXN 自己怎么组织"的文档；住仓库根 + `dev/` + `.changes/`。包含 4 类项目工程文档（README.md / AGENTS.md / .changes/ / dev/）。**特例**：可与 Descriptive Modality 组合（README.md = marketing + 入口）。v0.7+ RFC-0028 §D1 撤销 CONTEXT-MAP.md Meta 层归属，Meta 层入口由 AGENTS.md §AI Agent 唯一入口段统一承担。

## DocArch

### RFC
- OpenXenon 规范（规定性文档）；住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`；frozen + errata 演进策略；顺序编号 + theme 字段；中文 only；只引用 `docs/glossary/`。替代旧 ADR + OXP 双层（v0.7 废除 OXP）。

### Asset
- 见 [`oxn-asset-domain`](./oxn-asset-domain.md#asset)。本文域内特指"Project 资产"——住 `.openxenon/assets/`。

### BuiltinAsset
- 随 OXN 版本发布的内置 Asset；住 `src/builtin/`；通过 `@oxn/` scope 解析；项目可用 `@prj/` override。自举种子——手动创建不经 Work，后续变更走 asset-evolve Work。
- v0.6 Registry mock 与 `.md` 文件 SSOT 不一致（F1）；D18 收窄 Phase 4 范围（仅 probes+blueprints）。
- **别名（已合并）**：Builtin / BuiltinAsset（glossary 不再单独列出）

### StarterAsset
- `oxn init --starter` 拷贝到 `.openxenon/assets/` 的 Built-in Asset 副本；用户拥有可改。与 `@oxn/` fallback 两层覆盖（D8）。

## Bootstrap

- 存在后后续变更走 asset-evolve Work。RFC-0012 锁定（meta-RFC）。

## EvolutionStrategy

- Supersede 走新 RFC 标 superseded-by / supersedes。RFC-0010 锁定（meta-RFC）。RFC-0013 D6 移除 version 字段（对齐业界标准）。

## Versioning

- 格式 `0.6.2-alpha.0` < `0.6.2`。允许多次迭代。patch 不走 alpha。
- 开启条件：minor 由工程师人工确认；major 必经。一旦开启必须走完到 stable（不能跳过该版本）。
- 转正条件：工程师人工 sign-off（无自动条件）。RFC-0013 锁定（meta-RFC）。

### Version
- 回顾性发布记录——cut 时诞生，**frozen-at-cut**；住 `.changes/0-X-Y-<theme>.md`；`status: released`。
- frontmatter 必填：`version` / `date` / `type` / `status` / `theme` / `goals[]` / `works[]` / `tag` / `branch`。
- `goals[]`：本 Version 收录的 Goal entry 路径列表（`dev/pool/<slug>.md`）。
- `works[]`：交付证据——对应 Goal 的 Work 路径列表（`.openxenon/works/<id>/work.md`）。
- `tag`：git tag 名（`v<version>`）。
- `branch`：cut 来源分支（默认 `dev`）。
- cut 触发由 forcing function（a+b+c）驱动：(b) 最小 Goal 完成 / (c) Goal 变更 / (a) 时间节奏（默认 1 周）。
- 不引用 `.openxenon/` 内部路径除 `goals[]` / `works[]`（boundary 规则）。
- package.json 为版本号 SSOT，8 文件一致性由 version-check 强制。
- 历史别名：Version Fragment（v0.4.0 / D5+ 2026-08-07 起合并入 Version 单一术语；设计稿 `.openxenon/drafts/design-version-iteration-redesign.md` §2.2）。
- 配套 CLI：`oxn version {cut,list,show,status}` 4 子命令。

### Goal
- 承诺层规划单元——1:1 锁定一个 IAP 准备分支（`feat/goal-<slug>`）+ 一份 Work + 一个清晰边界。
- 住 `dev/pool/<slug>.md`；`status: planned`；**frontmatter 不含 `version` 字段**（晚绑，cut 时才落 Version）。
- frontmatter 必填：
- `id` (slug)：kebab-case，与文件名同
- `theme`：人类可读主题
- `priority`：low | medium | high | critical
- `status`：planned | in-progress | done | archived
- `created-at`：YYYY-MM-DD
- `scheduled-version`：`~`（Goal 天然晚绑）
- `synced-at`：YYYY-MM-DD
- `branch`：`feat/goal-<slug>`（强一致；CLI 校验）
- `source`：direct | draft（来源标记）
- `source-ref`：`<draft-path>`（若 `source=draft` 必填）
- 可选：`note` / `rfc[]` / `adr[]` / `baseline[]` / `promoted-from`。
- 入池条件：(a) 一个清晰边界（一个 Goal = 一个"OpenXenon 是什么"的子问题），(b) 最小 RFC/ADR 引用或 source Draft，(c) 工程师 mental commit 会做。
- 来源 3 路：(1) 工程师直接建（`oxn goal create`）；(2) `oxn draft promote --target goal --goal-slug=<slug>` 从 Draft 升华；(3) 历史 PlanningPool entry 一次性迁移（frontmatter 加 branch/source 字段）。
- 历史别名：PlanningPool（v0.4.0 / D5+ 2026-08-07 起正名为 Goal；路径 `dev/pool/` 保留复用）。
- 配套 CLI：`oxn goal {create,list,show,work,archive}` 5 子命令。

### RoadmapDeprecated
- Roadmap 概念已退役（v0.4.0 / D5+ 2026-08-07）—— 设计稿 `.openxenon/drafts/design-version-iteration-redesign.md` §2.2 决策。
- 历史：`dev/versions/<slug>.md` 前瞻性版本计划文档；frontmatter 必填 `version`；scheduling 时由 `git mv` 从 PlanningPool 来。
- 当前：D5+ 起前瞻 intent 移到 Goal 层（`dev/pool/`）；回顾记录移回 Version（`.changes/`）；`dev/versions/` 目录整体退役（含 README + Blueprint-2.md 模板归档到 `.openxenon/.archived/dev/versions/`）。
- 注意：与 AssetKind=assetmap（AssetMap）是不同概念（不同情态、不同位置），历来分清（RFC-0013 D4）。🆕 v0.6.4 起 AssetKind 枚举值已改为 `assetmap`。
- 退役扫描：`scripts/check-versioned-docs.ts` 已豁免（`dev/versions/` 在 ALLOW_PATTERNS，但目录已删，规则失效无害）。

### FixRecord
- 开发者面向的 bug 修复记录；住 `dev/fix/`；比 Version Fragment 更详细（含根因分析、调试过程）。
- 不对外公开（dev/ 是开发者手册，不是产品文档）。
- 与 Version Fragment 互补——fix record 给开发者，fragment 给用户（RFC-0013 D3）。

### IntentPoolDeprecated
- Intent Pool v3 已退役（v0.4.0 / D1 2026-08-07）—— 设计稿 .openxenon/drafts/design-version-iteration-redesign.md D1 决策。
- 历史：5 池模型（research / design / issue / audit / journal）由 Insight 写入 `.openxenon/pools/<pool>/<slug>/frozen.json`；
- 当前：D1 后 Insight 经 Draft 通路写入（origin=insight），详见 oxn-proof-domain.md §InsightDraftMapping（🆕 v0.6.4 PR-B：合并自 `oxn-insight-domain`）+ oxn-draft-domain.md §DraftOrigin。
- CLI 退役：`oxn pool {create,list,review,approve,reject}` 全部抛 `OXN_POOL_DEPRECATED`（兼容期 1 版本）。
- 与 PlanningPool（dev/pool/）不同：PlanningPool = Goal 概念正名候选（D4 待后续 Wave），与 Intent Pool 是不同层次。
- 配套：CLI 退役 1 版本后彻底移除 pool 命令代码 + 引擎层 `writePoolEntry` 等 util。

### VersionHygiene
- 版本号卫生规则——Dev Version 版本号恒严格大于已发布 Release Version 版本号；OXN CLI 不注入 build metadata（git SHA / build timestamp / "dev" 标记），版本号字符串本身是 Dev/Release 在运行时的唯一区分器。流程保障：`release-cut` workflow 的 `post-publish-bump` slot 在 publish 后**立即** bump dev 到下一个 `-alpha.0`，关闭共享版本号过渡窗口。权威定义：[ADR-0083](../../docs/adrs/0083-version-hygiene-over-build-metadata.md)。

## AssetDisambiguation

### AssetMap
- 🆕 v0.7.0 RFC-0027 PR-F（D3）：canonical 归 `oxn-asset-domain.md §AssetMap`；本域仅保留指向。
- AssetKind=assetmap 的语义别名（首选术语）——meta 索引层，AI 路由入口（6 scene 路由表 + Domain/Blueprint 索引）；不参与 references DAG。
- 与 Roadmap（版本计划文档）不同情态、不同位置。原别名 "Roadmap" 已废弃，避免与版本计划文档混淆（RFC-0013 D4）。🆕 v0.6.4 起 AssetKind 枚举值已同步改为 `assetmap`。

## Forbidden

### ForbiddenCrossLayerImports
- docs-to-openxenon
- assets-to-docs
- rfc-to-product-doc
- rfc-to-dev-doc
- drafts-rfc-to-assets
- dev-to-drafts
- rfc-to-meta
- docs-product-to-meta
- docs-dev-to-meta
- assets-to-meta
- desc: |
  文档三层严格隔离 + Meta 层隔离（v0.3.0 起）：
- `docs/` → `.openxenon/` 跨层引用禁止（inv-10）；
- `.openxenon/assets/` → `docs/` 引用禁止（边界不依赖手册）；
- RFC（规定性）→ product/dev（描述性）禁止（规定性应独立可读）；
- `.openxenon/drafts/` 项目草稿 → ADR/RFC 暂存禁止（草稿不应引用自身）；
- `.openxenon/drafts/rfc/` ADR/RFC 暂存 → 项目 Asset 禁止（应通过 docs/ 概念页）；
- `docs/dev/` → `.openxenon/drafts/` 禁止（开发手册不可引用 ADR 暂存内部）；
- **RFC → 项目工程元层禁止**（v0.3.0 新增，规定性不应依赖元入口）；
- **产品手册 → 项目工程元层禁止**（v0.3.0 新增，README.md/AGENTS.md/.changes/dev 例外豁免通过 AGENTS.md 入口）；
- **开发手册 → 项目工程元层禁止**（v0.3.0 新增）；
- **Asset → 项目工程元层禁止**（v0.3.0 新增；v0.7.0 RFC-0028 §D3 撤销 CONTEXT-MAP.md 索引场景豁免）。

### ForbiddenMetaInternalCoupling
- readme-to-rfc
- changes-to-product-doc
- dev-to-assets-direct
- readme-to-drafts
- desc: |
  项目工程元层内部互引限制（v0.3.0 起）：
- README.md → RFC 禁止（README 是营销 + 5min 上手，不引用 RFC；GitHub 渲染用户不需要看规范）；
- .changes/ → product/doc 禁止（changelog 不引用产品手册）；
- dev/ → .openxenon/assets/ 直引禁止（应通过 glossary 入口）；
- README.md → .openxenon/drafts/ 禁止（README 不挂探索稿）。

### DeprecatedConstructsV040
- intent-pool
- oxn-pool-cli
- IntentPool
- writePoolEntry
- pool-writer
- .openxenon/pools
- desc: |
  v0.4.0（D1 2026-08-07）起禁止新建/引用——Intent Pool v3 退役并吸收进 Draft：
- 新设计稿不得再创 Intent Pool 概念（应改用 Draft origin=insight）；
- 新 CLI 命令不得再叫 `oxn pool *`（5 子命令抛 OXN_POOL_DEPRECATED 兼容 1 版本）；
- 新代码不得 import `writePoolEntry` / `pool-writer`（无调用方后 1 版本随 CLI 移除）；
- 新文档不得引入 `.openxenon/pools/` 路径（含 archive 路径）。
- 历史 dev/pool/ 路径仍可用（PlanningPool = Goal 概念正名待 D4 Wave）。

## Boundary

### Inv1Doc3Modalities
- 文档三情态严格分离——Asset（定义性，回答"是什么"）+ RFC（规定性，回答"为什么决定"）+ Doc（描述性，回答"怎么用"），三者各居其位，互不依赖。三情态全集中的任意两情态组合是设计错误信号。

### Inv2RfcSotDecisionLayer
- 🆕 v0.7.0 RFC-0029 D1 修订：原 "RFC 是 SSOT" 措辞改为 "RFC/ADR = 规定性决策记录层"；与 AGENTS.md 裁决规则对齐。
- **RFC/ADR = 规定性决策记录层（why）**——回答"为什么决定 X"的文档；住 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`；frozen + errata 演进策略；中文 only。
- **现行约束语义 SSOT = `.openxenon/assets/domains/*.md`**（Asset 结构 v2：## Group → ### Axiom → - Theorem）——AI Agent 在 Blueprint 闭包时实际消费的"约束定义层"。
- **工程术语外部 SSOT = `docs/product/zh-cn/concepts/glossary.md`**（单页；由 `scripts/sync-domain-glossary.ts` 单向生成，Domain → glossary）。
- **ADR 不再作为独立机制**——v0.7 起所有 ADR 已迁移为 RFC + Domain 落点（48 Adopted → 8 主题 RFC + 4 meta-RFC；6 Superseded → `.openxenon/.archived/docs/adrs/`）。后续决策走 RFC + Domain 路径。
- **引用方向**：RFC/ADR 正文/related 引用 Domain 锚点作为约束解释（RFC → Domain 方向，RFC-0028 已开先例）；Domain 不反向引用 RFC/ADR（assets-no-docs 规则）。
- v0.3.0 增补（保留）：CONTEXT-MAP.md 中的 R&N 32 术语对照迁至 RFC-0018 附录 A（已由 RFC-0028 整体回收）。
- 本 Invariant 修订须由 RFC 授权（RFC-0029）；未来变更走 Draft → RFC promote 路径。

### Inv3BuiltinAssetTwoLayer
- Built-in Asset 两层覆盖——`@oxn/` scope fallback（编译时内置）+ `@prj/` scope override（项目资产），后者优先。Phase 4 收窄为 probes + blueprints（D18）。

### Inv4BootstrapSeedExemption
- 自举种子豁免仅限 src/builtin/——项目 `.openxenon/assets/` 资产变更必须经 Work 流转；src/builtin/ 内置资产可手动创建（bootstrap）。两者边界清晰。

### Inv5ProjectDomainUnidirectional
- 本域单向引用父域 oxn-domain——本域补父域未说的部分（项目工程元词汇）；不向下引用其他子域（oxn-engine-domain/oxn-asset-domain 等只作为术语引用，不作为 references 字段直接依赖）。

### Inv6Meta4Layer
- 项目工程元层 4 类文档各居其位（v0.3.0 起；v0.4.0 D5+ 调整；v0.7.0 RFC-0028 §D1 撤销 CONTEXT-MAP.md）——README.md / AGENTS.md / .changes/ / dev/{fix,pool}/ 各自有 RFC-0018 锁定引用规则，互不混用。
- 调整说明（v0.4.0 D5+）：`dev/versions/` 整体退役（RoadmapDeprecated）；`dev/pool/` 概念正名为 Goal；Version 回顾记录统一住 `.changes/`。
- 调整说明（v0.7.0 RFC-0028）：CONTEXT-MAP.md 整体删除；Meta 层入口由 AGENTS.md §AI Agent 唯一入口段统一承担。
- 例外：README.md 与 docs/product/zh-cn/introduction.md slogan 双向同步（v0.6.2-alpha.2 锁定）。

### Inv7ContextMapAssetIndexExempted
- 🆕 v0.7.0 RFC-0028 D3 撤销：CONTEXT-MAP.md 已整体删除（2026-08-10），`context-map-asset-index-allowed` 守门规则同步删除。原 Inv7 失效——CONTEXT-MAP.md 不再是 Meta 层入口；Meta 层入口改由 `AGENTS.md` §AI Agent 唯一入口段承担（详见 RFC-0028 §D4）。本 Axiom 保留作为历史记录（git blame 可追溯）。

### Inv8ReadmeIntroductionSloganSync
- README.md 与 docs/product/zh-cn/introduction.md slogan 双向同步（v0.6.2-alpha.2 锁定）—— README.md 是仓库根入口（含 GitHub 渲染），introduction.md 是 VitePress 产品入口。两者 slogan 一致；v0.6.2-alpha.2 同时替换 13 个文件（CONTEXT-MAP + README + docs/ + glossary/）。

### Inv9ChangesCanRefRfcAdr
- .changes/ 可引用 RFC + ADR 追溯当前版本包含内容（v0.3.0 起）—— Version Fragment 在版本转正时落盘，可引用 docs/adrs/ 与 docs/rfc/zh-cn/ 标记交付。check-doc-boundary.ts `changes-allow-rfc-ref` 规则允许此引用模式。

### Inv10DevCanRefRfcDrafts
- dev/ 可引用 RFC + sprint 设计稿（v0.3.0 起）——Roadmap（dev/versions/）与 PlanningPool（dev/pool/）作为前瞻性规划，可引用 .openxenon/drafts/rfc/ + .openxenon/drafts/sprint/ 作为探索稿溯源。check-doc-boundary.ts `dev-allow-rfc-ref` 规则允许此引用模式。

### Inv11IntentPoolV3Retired
- Intent Pool v3 退役（v0.4.0 / D1 2026-08-07）——5 池机制（research/design/issue/audit/journal）吸收进 Draft（origin=insight，type-mapping 见 oxn-proof-domain.md §InsightDraftMapping；🆕 v0.6.4 PR-B：合并自 `oxn-insight-domain`）。
- CLI `oxn pool *` 5 子命令兼容 1 版本后彻底移除；`.openxenon/pools/` 路径自始未创建；`writePoolEntry` 引擎 util 同步退役。
- 配套 §Bans: deprecated-constructs-v0.4.0（禁新引用）；§Terms: IntentPoolDeprecated term（历史溯源）。
- RFC-NNNN-version-iteration-redesign.md 待 D2/D3/D4 + RFC promote 后续 Wave 落地，详见 `.openxenon/drafts/design-version-iteration-redesign.md` §Promote。

### Inv12GoalVersionRename
- v0.6.0（D5+ 2026-08-07）起：Goal / Version 概念正名——
- PlanningPool = Goal：`dev/pool/<slug>.md` 即 Goal entry；frontmatter 必含 `branch: feat/goal-<slug>` + `source: {direct|draft}`；
- `dev/versions/` 整体退役（§4.4）：README.md 移到 `.openxenon/.archived/dev/versions/`；目录在 v0.7.0 切正式删；
- `oxn goal {create,list,show,work,archive}` 5 CLI 接管 Goal 生命周期；
- `oxn version {cut,list,show,status}` 4 CLI 接 release-cut workflow（§4.5；apply 由 §4.5 release-cut workflow 接管）。
- 兜底：`oxn goal work <slug>` 当前 stub：返回建议 Work 配置，真正的 Work IAP 创建留 D5+ followup。
- 落地 Work ID：`d-cli-rollout`（CLI/Goal/Version/9 命令）；后续 `d-meta-rollout`（§4.5 release-cut + dev 分支）。
- 详见 design-version-iteration-redesign.md §4.3/§4.4/§4.5。

### Inv13BranchModelMainDevFeatGoal
- v0.6.0（§4.7 2026-08-07）起：分支模型三层——
- `main`（长期 base）：稳定 release tag 处；所有 release tag 起点。
- `dev`（长期 integration）：v0.6.0 前已存在（v0.4 sync 起点 `0444c7c merge: feat/v0.4-unify-md → dev`）；未来所有 Goal 分支基于 `dev` 拉。
- `feat/goal-<slug>`（Goal-specific 短期分支）：每个 Goal cut 时由 `oxn draft promote --target goal --goal-slug=<slug>` 自动创建（auto `git checkout -b feat/goal-<slug> dev`，已在 v0.5.0 D2 落地）；Goal 转正后归档到 `.openxenon/.archived/` 分支。
- 历史归档分支（不再接受新 commit）：
- `feat/v0.6.1` / `feat/v0.6.1-alpha.1` / `feat/v0.5-*` / `feat/v0.4-*`
- `feat/v0.6-iap-refactor` / `feat/v0.5-proof-insight-loop`
- 创建 `feat/gooal-<slug>` 强制约定：slug 必匹配 `<dev-pool-slug>`；D4 后 dev/pool/<slug>.md 即 Goal entry，branch 与 Goal 1:1 锁定（§2.4）。

### Inv14AdrAcceptedLandingRequired
- ADR Accepted 必须配套 filesystem 落地清单 + pre-commit 强制校验——ADR 接受（`Status: Accepted`）时**必须**在 frontmatter 结构化声明 filesystem 落地清单（`landing-files:`），并经 pre-commit 强制校验。落地不全 → 阻止 ADR Accepted。
- **`landing-files` 语义**——Accepted ADR `landing-files` 不可为空（除非 `landing-reason: declarative`）；Draft/Superseded/Withdrawn ADR `landing-files` 可选；路径格式相对仓库根（与 git diff 一致）；多入口允许（ADR 可能影响多个文件）。
- **`landing-reason` 豁免**——`declarative`（纯宣言无文件落地，如策略类 ADR）/ `external`（指向仓库外，如外部依赖升级不在本仓改）/ `postponed`（接受时未落地但有明确日期；超期需重新评估）。
- **Decision 内容必须落 Domain**——`landing-files` 中至少一条路径为 `.openxenon/assets/domains/*.md`（决策落 Domain Axiom/Theorem 证明）；否则落地仅 filesystem 而非 SSOT，违反定义性 SSOT 原则。
- **守门机制**——`scripts/check-adr-landing.ts`（pre-commit）扫描：Accepted + landing-files=[] + 无 landing-reason → 报错；对每条 landing-files 路径在 git diff（staged + unstaged）中匹配，无 diff → 报错。
- **declarative 豁免门槛**——`landing-reason: declarative` 必须明确写（避免漏填）；纯术语正名类 ADR 可用此豁免（如 ADR-0066 同期 Domain 内容回迁已被 RFC-0027/0028 覆盖）。
- **历史 ADR 不补**——存量 0066~0098 已 Accepted 不补 landing-files（ADR-0099 生效后未来 ADR 必须遵守）；回溯 audit 由 advisory 脚本处理。