---
entity: rfc
id: RFC-0017
theme: terminology-two-tier-ssot
status: Draft
date: 2026-08-01
supersedes: []
superseded-by: ~
related:
  - RFC-0009: docs/rfc/zh-cn/RFC-0009-doc-three-modalities.md
  - RFC-0014: docs/rfc/zh-cn/RFC-0014-asset-injection-mechanism.md
  - RFC-0018: docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md
  - ADR-0087: docs/adrs/0087-md-single-orthogonal-point.md
synced-at: 2026-08-01
---

# RFC-0017: 术语双层 SSOT 架构——Domain 内部 + glossary 外部

> **类型**：RFC（OpenXenon 规范）
> **主题**：terminology-two-tier-ssot
> **状态**：📝 Draft（评审中，未执行）
> **来源**：2026-08-01 `/grilling` session（grill-with-docs + domain-modeling skill）
> **批次**：2026-08-01 v0.7 RFC 批次（接 RFC-0016 之后；RFC-0018 同期）

## 摘要

OXN 术语体系重构为**双层 SSOT**：`.openxenon/assets/domains/*.md`（9 文件，1429 行）作**内部 SSOT**（OXN Runtime / Engine / AI Agent 视角），`docs/product/zh-cn/concepts/glossary.md`（单文件，~600-800 行）作**外部 SSOT**（用户 / 文档读者视角）。单向同步（Domain → glossary）+ 唯一入口（Domain）+ `scripts/sync-domain-glossary.ts` 覆盖式生成 + `check-doc-boundary.ts` 三条新规则守门。8 个 `docs/product/zh-cn/concepts/*.md` 概念页去除 term 定义段，改 narrative + glossary 链接。

## 决策要点

### D1：术语双层 SSOT 角色定义

| 层 | 角色 | 物理位置 | 受众 | 含什么 |
|---|---|---|---|---|
| **Domain（内部 SSOT）** | 术语权威定义源（含 inv/ban） | `.openxenon/assets/domains/*.md` | OXN Runtime / Engine / AI Agent | desc + inv + ban + 来源标注 |
| **glossary（外部 SSOT）** | 面向用户的术语词典 | `docs/product/zh-cn/concepts/glossary.md` | 外部用户 / 产品手册读者 / 新工程师 | desc + glossary-ref + 视角标注 |

### D2：单向同步 + 唯一入口

- 新增/编辑/删除术语的唯一入口是 **Domain 文件**
- glossary 是**生成产物**（通过 `scripts/sync-domain-glossary.ts` 覆盖式生成）
- glossary 中允许 SYNC:START/END sentinel 之外的手工导读与索引，但术语本体不允许手工编辑
- 方向：**Domain → glossary**，**绝不允许反向**（防止 glossary 篡改 SSOT）
- 与 RFC-0009 D3.2 兼容：`Asset → docs/` ❌（直接引用禁止）；本 RFC 通过 sync 脚本建立合规通道 ✅

### D3：Domain 承载所有 inv/ban

- Domain 现有 22 条 inv + 1 条 ban 不动（以 oxn-asset-domain 为代表）
- glossary 不复制 inv/ban——避免 22 条约束在两处维护（DRY）
- Domain term 头部加 `glossary-ref: ./docs/product/zh-cn/concepts/glossary.md#<slug>` 字段（在 sync 脚本生成时反向填入，作为术语注册到 glossary 的登记）

### D4：glossary 单页 + 字母序

- 物理形态：`docs/product/zh-cn/concepts/glossary.md` 单文件（不是 `docs/glossary/zh-cn/*.md` 多文件）
- 按字母升序排序，分 A-E / F-L / M-R / S-Z 三段
- 当前规模：~140 个 term（实测 9 个 Domain 文件 `## Terms:` 段下 157 个 H3 去重 16 个跨域重名后约 141 个），~600-800 行
- 顶部 1 段说明 + 字母速查目录链接（jump anchors）
- 文件结构：

  ```markdown
  ---
  entity: glossary
  generated-by: scripts/sync-domain-glossary.ts
  synced-at: 2026-XX-XX
  ---

  # 术语表

  > 本页是 OpenXenon 项目的对外术语词典，**单一权威源**。
  > 内部定义来自 `.openxenon/assets/domains/`（Asset 视角），本页是面向用户的精简字典。
  > 修改术语请编辑 Asset Domain 文件，本页通过 sync 脚本自动重建。

  ## 字母速查
  - [A-E](#a-e)
  - [F-L](#f-l)
  - [M-R](#m-r)
  - [S-Z](#s-z)

  <!-- SYNC:START -->
  ## A-E
  ### Asset
  - desc: 工程师为 AI Agent 协作定义的环境约束。详细定义见 [AssetKind](#assetkind) 与 [AssetDomain](#assetdomain)。

  ...（~141 term）
  <!-- SYNC:END -->
  ```

### D5：8 个 concepts/*.md 不再重定义术语

| 概念页 | 当前状态 | 调整后 |
|---|---|---|
| `asset.md` | 含 term 定义段 | 改为纯 narrative + `[Asset](./glossary.md#asset)` 引用 |
| `iap-paradigm.md` | 含 Intent/Align/Proof 定义 | 同上 |
| `work.md` | 含 term 定义 | 同上 |
| `proof.md` | 含 term 定义 | 同上 |
| `insight.md` | 含 term 定义 | 同上 |
| `lifecycle.md` | 含 term 定义 | 同上 |
| `asset-paper.md` | 含 term 定义 | 同上 |
| `_index.md` | 概念索引 | 顶部加 "所有术语请查 [glossary.md](./glossary.md)" |

具体规则：

- `### Asset` 这类 heading 段禁止作为"定义"出现
- 出现术语必须以 `[X](./glossary.md#x)` 形式引用
- `###` 可作为章节标题（narrative），但内容不得重复 glossary 的 desc

### D6：边界规则（check-doc-boundary.ts 新增 3 条）

| 规则名 | sourcePattern | targetPattern | 含义 |
|---|---|---|---|
| `glossary-is-generated` | `^docs/product/zh-cn/concepts/glossary\.md$` | 禁止 `source: oxn-*-domain.md` 之外的 frontmatter 字段混在 SYNC:START/END 内 | 防止手工混入未在 Domain 注册的 term |
| `concepts-no-term-redef` | `^docs/product/zh-cn/concepts/[a-z-]+\.md$` | 禁止 `### ` 标题的 slug（kebab-case 归一化后）与 `glossary.md` 中任一 term slug 碰撞 | 防止概念页以 `### Term` 形式重定义术语（机械可判定） |
| `domain-terms-have-glossary-ref` | `^\.openxenon/assets/domains/.*\.md$` | 每个 `## Terms:` 段下的 `### term` 必须含 `glossary-ref:` 字段（sync 后由脚本填入） | 保证 Domain 反向链接到 glossary（**仅作用于 `## Terms:` 段，invariants/bans 不适用**） |

错误码（D7 sync 脚本 + check-doc-boundary.ts 共用）：

- `E_GLOSSARY_DUPLICATE_TERM`：同名 term 在多个 Domain 出现且 desc 首句不一致
- `E_GLOSSARY_TERM_NOT_IN_DOMAIN`：glossary 含 Domain 未列的 term
- `E_GLOSSARY_REDEF_IN_CONCEPT`：`concepts/*.md` 中 `### ` 标题 slug 与 glossary term slug 碰撞

### D7：sync 脚本行为契约（spec，待实现）

```
name: scripts/sync-domain-glossary.ts
输入：.openxenon/assets/domains/oxn-{x}-domain.md (9 files)
输出：docs/product/zh-cn/concepts/glossary.md (1 file)
副作用：.openxenon/assets/domains/*.md（每个 term 头部插入 glossary-ref）

操作：
  1. 读取 9 个 Domain 文件，**仅**提取 `## Terms:` 段下的 `### term` H3（排除 `## Invariants` / `## Bans` 段）
  2. 合并去重（规则见下方"合并去重规则"段）
  3. 按字母排序，输出全部 ~141 个去重 term（实际数量以 domain 文件为准）
  4. 渲染到 glossary.md（SYNC:START/END 外覆盖，sentinel 内保留）
  5. 更新 Domain 文件：`## Terms:` 段下每个 term 头部加 `glossary-ref:`（slug 自动生成）
  6. 更新 Domain 与 glossary 的 synced-at 字段

合并去重规则：
  a. root 解析：按 Domain 的 references DAG 找根——被 0 个 Domain reference 的是 root（oxn-domain 是绝对 root，无 references）
  b. 同名 term 归属：root Domain 的 desc 为主项；sub-Domain 的 desc 追加为 "- <DomainName> 视角：<desc>" 子项
  c. 冲突检测：同名 term 的 desc 首句（第一个句号前）不一致时，报 E_GLOSSARY_DUPLICATE_TERM，列出冲突的 Domain 与首句
  d. 已知 16 个碰撞 term 需逐个验证 root 归属（详见执行计划 .openxenon/drafts/terminology-ssot-execution-plan.md §6）：
     Asset / AssetMap / Daemon / Infra / Insight / Kernel / OXL /
     OXN CLI / OXN Engine / Part / PlanLock / Probe / Proof /
     Roadmap / Version Hygiene / Work

边界：
  - glossary 中 SYNC:START/END 之外严禁手工术语内容（允许导读、目录、SEO）
  - Domain `## Terms:` 段下 term 的 `glossary-ref:` 字段由脚本维护，不允许手工修改
  - **不修改 `## Invariants` / `## Bans` 段**（既不同步进 glossary，也不插入 glossary-ref）

错误码：
  - E_GLOSSARY_DUPLICATE_TERM（同名 term 多 Domain 且 desc 首句不一致）
  - E_GLOSSARY_TERM_NOT_IN_DOMAIN（glossary 含未注册的 term）
  - E_GLOSSARY_REDEF_IN_CONCEPT（concepts/*.md 中 `### ` 标题 slug 与 glossary term slug 碰撞）
```

## 影响范围

### 正面

- 术语双层 SSOT 角色清晰（内部 vs 外部），不再混淆
- glossary 漂移问题彻底解决（脚本 + 边界检查）
- 8 个概念页不再重复定义术语，文档真正收敛
- 与 RFC-0009 D3（Asset → Doc ✅ via sync）兼容
- 与 ADR-0059 D2 sub→root 引用机制一致（sub-Domain term 通过 glossary-ref 引用全局 desc）
- 与 ADR-0087 MD 唯一正交点一致（无平行 yaml，glossary 由 MD 同步脚本生成）
- **Stack 语义不变**（ADR-0054 三边界框架保持）：本 RFC 只改术语承载位置，不改 AssetKind 语义

### 负面 / 风险

- 8 个概念页需要重写（去除 term 定义段，改 narrative + 链接）
- glossary.md 单页面可能膨胀（~141 term × 4-6 行 ≈ 600-800 行，仍可控）
- en/ 翻译工作未启动，Phase 4 删 `docs/glossary/en/_index.md` 后 en 翻译另行立项
- sync 脚本首次落地时需清理 glossary 的 `source:` frontmatter（从 9 文件迁移到 1 文件时丢弃）
- 代码层 `roadmap` → `assetmap` 命名同步（CLI 命令、目录、Engine 模块）超出本 RFC 范围，列入 v0.7+ 独立 RFC

### 衍生

- **ADR-0059 errata**：sub-Domain term desc 引用 glossary 时不只是"不重定义"，而是"`glossary-ref` 字段强制存在"（在 D7 sync 脚本自动维护下生效）
- **ADR-0087 MD 唯一正交点**：本 RFC 是该 ADR 在术语维度的实例化（生成产物取代平行镜像）
- **oxn-init skill 更新**：SSOT 列表补 `glossary.md`
- **未来 Skill / Insight 模块**：可复用本 RFC 的双层 SSOT 模式（"内部权威定义 + 外部读者字典"）

## Alternatives Considered

| 方案 | 否决理由 |
|---|---|
| **glossary 升为 AssetKind 第 6 类（kind=glossary）** | v0.6.1-alpha.4 刚收敛为 5 类（删 library/external），glossary 不属于"业务边界"，添加会破坏三边界框架 |
| **glossary 物理在仓库根（GLOSSARY.md）** | 仓库根只承载 Meta 层（RFC-0018），glossary 是外部用户可见的 Doc 范畴 |
| **Domain 引用 glossary 反向链（双向 sync）** | SSOT 流向必须单向；双向会导致"哪个版本对"的循环问题，违反 D2 |
| **保留 glossary/zh-cn/*.md 多文件 + 加 sync** | 用户在 2026-08-01 grilling 第 2 轮明确选择"换成手册内联定义列表"，多文件形态废弃 |
| **8 个概念页保留 term 定义** | 违反 DRY；与 glossary 形成重复定义，AI 检索时易误读 |
| **建 `.openxenon/context-map/*.yaml` 作为机器真理** | 违反 ADR-0087 MD 唯一正交点；与 MD frontmatter 制造第二 SSOT |

## 实施步骤

> D7 root 解析基于 v0.6 扁平 9-Domain 结构；[v0.7 层级 RFC](../../openxenon/drafts/rfc/v0.7-domain-hierarchy-restructure-rfc.md) 落地后需重定向 root 解析逻辑（按新的 Layer 0/1/2 层级判定 root）。

### Phase 0：CONTEXT-MAP.md 计数修正

1. `CONTEXT-MAP.md:3` "8 个 Domain" → "9 个 Domain"
2. `CONTEXT-MAP.md:126` "7 个文件" → "9 个文件"
3. Contexts 表补 `OxnDraftDomain` 行（`oxn-draft-domain.md`，Draft 业务领域）
4. Relationships 图补 `OxnDraftDomain` 节点

### Phase 1：RFC promote（本批次）

1. 本 RFC 拍板（Draft → Accepted）
2. 编号分配：**RFC-0017**，接 RFC-0016 之后；RFC-0018 已占
3. 路径：`docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md`
4. frontmatter `synced-at` 更新

### Phase 2：sync 脚本实施

1. 新建 `scripts/sync-domain-glossary.ts`
2. 9 个 Domain 文件 → 1 个 glossary.md 单页生成
3. 边界检查 3 条规则接入 `scripts/check-doc-boundary.ts`
4. 错误码 `E_GLOSSARY_*` 注册到 OXN 统一错误框架（ADR-0081）

### Phase 3：8 个概念页去重

1. 逐页移除 term 定义段，改 narrative + `[X](./glossary.md#x)` 引用
2. 每个概念页顶部加 "术语见 [glossary.md](./glossary.md)" 指针
3. `concepts/_index.md` 重排：8 个概念页 + glossary 字典页

### Phase 4：删除 `docs/glossary/zh-cn/` 多文件

1. 删 9 个 glossary/zh-cn/*.md（验证 sync 脚本已能稳定生成后）
2. 删 `docs/glossary/en/_index.md`
3. 删 `docs/glossary/` 目录（如已空）
4. en/ 翻译未启动，en 翻译工作另行立项

### Phase 5：清理 N1-N5 噪音（独立 RFC）

噪音清单已在 2026-08-01 grilling session 第 1 轮交付，本 RFC 不实施：

| # | 噪音源 | 状态 | 处理建议 |
|---|---|---|---|
| N1 | `docs/adrs/` 76 ADR | 不动 | 仍被 RFC `related:` 与 changelog 引用；保留 |
| N2 | Double archive（`docs/_archive/` + `.openxenon/.archived/docs/`） | 不动 | 单一 SSOT 需 RFC supersede RFC-0009 D5 才能合并；不在本轮 |
| N3 | `drafts/rfc/` 中 7 份 Superseded | 不动 | 待下次 RFC promote 阶段一起清理 |
| N4 | `drafts/` 15 份根目录 | 不动 | 同上 |
| N5 | Domain ↔ glossary 漂移 | **本 RFC 解决** | 通过 D7 sync 脚本自动化 |

## 相关术语

> 待 glossary.md 生成后由 sync 脚本自动填充。当前为占位段。

- Asset — 工程师为 AI Agent 协作定义的环境约束
- Domain — AssetKind 之一，业务边界（terms/bans/invariants）
- glossary — 面向用户的术语词典（外部 SSOT 镜像）
- SSOT — 单一权威源（Single Source of Truth）

## 相关决策

- [RFC-0009 文档三情态分离](./RFC-0009-doc-three-modalities.md) — Asset/RFC/Doc 三情态基线；D3 边界规则是本 RFC 合规依据
- [RFC-0014 Asset 注入机制](./RFC-0014-asset-injection-mechanism.md) — Domain 解析
- [RFC-0018 项目工程元层与 SSOT 全景](./RFC-0018-project-engineering-meta.md) — Meta 层 5 类 + 跨层引用规则
- [ADR-0087 MD 唯一正交点](../adrs/0087-md-single-orthogonal-point.md) — MD frontmatter 唯一机器可读元数据源，禁止平行 yaml
- [ADR-0059 Domain reference model v2](../adrs/0059-domain-reference-model-v2.md) — sub→root 引用机制（D2）；本 RFC 需补一个 errata 强化

## Errata

### v0.1 (2026-08-01)

- 初稿：来自 2026-08-01 `/grilling` session 第 3 轮（domain-modeling skill）输出
- 评审中项（待 Draft → Accepted 拍板前确认）：
  - D7 sync 脚本 spec 的 `E_GLOSSARY_*` 错误码是否需补到 OXN 统一错误框架（ADR-0081）
  - ADR-0059 errata 是否单独发或并入本 RFC

> 本段用于后续追加修正说明。核心决策自 RFC Accepted 起冻结。