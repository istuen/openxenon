---
version: 0.6.2-alpha.2
prerelease: alpha
date: 2026-07-31
type: feature
scope: meta-layer
status: pending
---

# 0.6.2-alpha.2: 项目工程元层（Meta Modality）落地

## 主题

OXN 文档架构从 RFC-0009 的三情态（Asset / RFC / Doc）扩展为**四层 SSOT 全景**（Asset / RFC / Doc / Meta），补全 5 类项目工程文档的 SSOT 归属。CONTEXT-MAP.md 从 283 行降级至 138 行的索引页；R&N 32 术语对照迁入新 RFC-0018 附录 A。

## 交付

### D1：RFC-0018 项目工程元层与 SSOT 全景（Draft 2026-07-31）

- **路径**：`docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md`
- **主题**：`project-engineering-meta`（meta-RFC 第 5 个）
- **状态**：📝 Draft（待 review）
- **决策要点**：
  - D1：四层 SSOT 全景表（Asset / RFC / Doc / Meta）
  - D2：项目工程元层 5 类文档定义
  - D3：CONTEXT-MAP.md 重构（283 → 138 行；R&N 32 术语迁入本 RFC 附录 A）
  - D4：项目工程元层跨层引用规则（README / AGENTS / CONTEXT-MAP / .changes / dev 各自引用规则）
  - D5：Meta 层与三情态组合检查表
  - D6：check-doc-boundary.ts 新增 5 条规则
  - D7：实施步骤
- **附录 A**：R&N 32 术语对照表（完整版，从 CONTEXT-MAP.md 迁入）
- **附录 B**：项目工程元层 5 类文档快速对照表

### D2：CONTEXT-MAP.md 重构

- **路径**：`/Users/issac/pro/openxenon/CONTEXT-MAP.md`
- **改动**：
  - 283 行 → **138 行**（删 145 行 / 51% 减重）
  - 删除段：R&N 32 术语对照（36 行）+ OXN 实现边界四判据（9 行）+ 分布式学习闭环（25 行）+ 术语精简/新增历史（72 行）
  - 保留段：Contexts（8 Domain 索引）+ Relationships + 9 核心术语锐化（Referent / OpenXenon / Asset / Work / Proof / P / Report / ProbeOutcome / outcome）
  - 新增段：跨层引用（指 RFC-0018 / RFC-0007 / RFC-0003 / ADR-0084 / ADR-0085）+ 文档维护约定 + 历史快照已迁出说明

### D3：oxn-project-domain.md 升版 v0.2.0 → v0.3.0

- **路径**：`.openxenon/assets/domains/oxn-project-domain.md`
- **新增 3 个 term**：
  - `Meta Modality`（项目工程元情态，第四层 SSOT）
  - `Project Engineering Meta Layer`（与 Asset / RFC / Doc 三情态并列）
  - `ProjectEngineeringDocument`（5 类项目工程文档统称）
- **新增 inv-6~10**（5 条）：
  - inv-6：项目工程元层 5 类文档各居其位
  - inv-7：CONTEXT-MAP.md 引用 Asset 特例豁免（RFC-0018 D4.3）
  - inv-8：README.md 与 docs/product/zh-cn/introduction.md slogan 双向同步（v0.6.2-alpha.2 锁定）
  - inv-9：.changes/ 可引用 RFC + ADR 追溯当前版本
  - inv-10：dev/ 可引用 RFC + sprint 设计稿（RFC-0013 D4）
- **新增 ban 7 条**：
  - forbidden-cross-layer-imports 续：`rfc-to-meta` / `docs-product-to-meta` / `docs-dev-to-meta` / `assets-to-meta`
  - 新增 `forbidden-meta-internal-coupling` ban 集合：`readme-to-rfc` / `changes-to-product-doc` / `dev-to-assets-direct` / `readme-to-drafts`

### D4：AGENTS.md §文档三层架构段升级

- **路径**：`/Users/issac/pro/openxenon/AGENTS.md`
- **改动**：
  - 标题改"文档三层架构（0.6.x 三情态分离重构）"→ "文档四层 SSOT 架构（0.6.2-alpha.2 起四情态分离）"
  - 三情态描述增补为四情态（+ Meta）
  - 增 §6 "项目工程元层（v0.6.2-alpha.2 起 · Meta Modality）"段
  - 增 Meta 层内部豁免表（Asset + Meta / RFC + Meta / Doc + Meta / 全四情态组合）
  - 增 5 条 check-doc-boundary 规则名称引用
  - 引用规则段标题改"四情态隔离"

### D5：check-doc-boundary.ts 扩 5 条规则

- **路径**：`scripts/check-doc-boundary.ts`
- **新增规则**：

| 规则名 | 描述 | 例外 |
|---|---|---|
| `rfc-no-meta` | docs/rfc/ 不可引用 README/AGENTS/CONTEXT-MAP/.changes/dev | 无 |
| `docs-product-no-meta` | docs/product/ 不可引用 README/AGENTS/.changes/dev | CONTEXT-MAP.md 例外 |
| `docs-dev-no-meta` | docs/dev/ 不可引用 README/.changes/dev | CONTEXT-MAP.md + AGENTS.md 例外 |
| `assets-no-meta` | .openxenon/assets/ 不可引用 README/AGENTS/.changes/dev | CONTEXT-MAP.md 索引场景例外 |
| `context-map-asset-index-allowed` | CONTEXT-MAP.md → Asset 特例豁免（isExemption: true） | n/a |

- **新增 `collectProjectEngineeringMetaFiles()` 辅助函数**：扫描项目工程元层 5 类文档路径
- **新增主流程 meta layer 扫描**：将 5 类项目工程文档纳入边界检查
- **新增 `isExemption` 字段**：豁免规则不作为 violation 检查
- **规则总数**：9 → 14

### D6：Changelog 自身（本文件）

## 验证（CI 等价 6 条）

```bash
bun run typecheck                                          # tsc --noEmit
bun run lint                                               # eslint 架构守卫
bun run check                                              # biome
bun scripts/validate-dependencies.ts                       # L0-L3 依赖图
bun scripts/check-doc-boundary.ts                          # 跨层守门（9+5=14 条规则）
bun test                                                   # 测试套件
```

附加手测：

```bash
wc -l CONTEXT-MAP.md                                       # 138 行（vs 原 283 行）
ls docs/rfc/zh-cn/ | grep -E "RFC-0018"                    # 1 个新 RFC
ls .openxenon/assets/domains/oxn-project-domain.md         # v0.3.0 已升版
grep -c "Meta Modality\|四层 SSOT" AGENTS.md               # 4 情态已写入 AGENTS.md
```

## 不动范围

- RFC-0009（文档三情态分离）—— 本 RFC 是 RFC-0009 的扩展（增加第 4 层），不 supersede 它
- 旧 ADR 镜像（48 条 → `archived/docs/adrs/`）—— 不动
- `dev/` 目录结构与现有内容 —— 不动
- `.changes/` 既有 changelog 文件 —— 不动
- 14 个 RFC（已 frozen + errata）—— 不动
- 8 个 Domain SSOT（oxn-domain / oxn-engine-domain / oxn-asset-domain / oxn-work-domain / oxn-proof-domain / oxn-insight-domain / oxn-cli-domain / oxn-cli-domain / oxn-project-domain 仅 v0.3.0 升版）—— 内容不变，仅本 Domain 升版

## 与 v0.6.2-alpha.2 collab-boundary 的关系

本 changelog 与 `.changes/0-6-2-alpha-2-collab-boundary.md` 同属 0.6.2-alpha.2 发版批次：

- **collab-boundary**：协作边界分层 + Slogan 重写（ADR-0084/0085 + 13 个产品文档 slogan 替换 + ADR-0072 errata）
- **meta-layer**（本 changelog）：项目工程元层落地（RFC-0018 + CONTEXT-MAP 重构 + oxn-project-domain v0.3.0 + AGENTS.md 升级 + check-doc-boundary 5 条规则）

两个 changelog 共享同一发版批次 0.6.2-alpha.2，但落地不同主题。

## 参考

- [docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md](../../docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md)
- [CONTEXT-MAP.md](../../CONTEXT-MAP.md)（重构后）
- [.openxenon/assets/domains/oxn-project-domain.md](../../.openxenon/assets/domains/oxn-project-domain.md)（v0.3.0）
- [AGENTS.md](../../AGENTS.md)（§6 新增）
- [scripts/check-doc-boundary.ts](../../scripts/check-doc-boundary.ts)（9+5=14 条规则）
- [RFC-0009 文档三情态分离](../../docs/rfc/zh-cn/RFC-0009-doc-three-modalities.md)（三情态基线）
- [.changes/0-6-2-alpha-2-collab-boundary.md](./0-6-2-alpha-2-collab-boundary.md)（同批次）