---
entity: rfc
id: RFC-0030
theme: rfc-adr-historical-convergence
status: Accepted
date: 2026-08-11
accepted: 2026-08-11
accepted-at: 2026-08-11
supersedes: []
superseded-by: ~
landing-files:
  - .openxenon/assets/domains/oxn-project-domain.md
  - scripts/check-asset-structure.ts
  - docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md
  - docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md
  - docs/rfc/zh-cn/README.md
landing-reason: declarative
related:
  - RFC-0027
  - RFC-0028
  - RFC-0029
  - .openxenon/drafts/report-rfc-adr-to-domain-mapping.md
  - .openxenon/drafts/design-asset-no-rfc-adr-citation.md
  - .openxenon/assets/domains/oxn-project-domain.md
  - AGENTS.md
synced-at: 2026-08-11
---

# RFC-0030: RFC/ADR 历史溯源收敛

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：rfc-adr-historical-convergence
<!-- allow-version -->
> **状态**：✅ Accepted（2026-08-11 — Phase 3 收尾配套 RFC，根治 ADR 物理归档 + Asset 反向引用 + RFC Errata + check-adr-landing 强制切换 4 项长期未决）
> **来源**：2026-08-11 `/grilling` session 4 项决策拍板
> **批次**：v0.7.0 配套新增（RFC-0029 后续 Wave）
> **关系**：本 RFC 撤销 v0.7『ADR 不再独立』承诺的 17 活跃 ADR 残留；落实 RFC-0029 D1/D3 后续工程动作
<!-- /allow-version -->

## 摘要

v0.7.0 文档架构在 RFC-0027（Asset 收敛）+ RFC-0028（CONTEXT-MAP 退役）+ RFC-0029（Inv2 语义修订）三轮落地后，仍有 4 项长期未决：

1. **17 活跃 ADR 残留**（与『ADR 不再独立』承诺张力）
2. **Asset 文件 121 处 RFC/ADR 编号引用**（违反 Inv2RfcSotDecisionLayer 字面）
3. **RFC-0017/0018 措辞残留**（与 Inv2 修订口径不一致）
4. **`check-adr-landing.ts` 默认 advisory**（未启用强制）

本 RFC 集中决策 4 项配套落地动作；与 RFC-0029 一并构成 v0.7.0 文档架构完整闭环。

## 决策

### D1 · 17 活跃 ADR 物理归档

**理由**：

1. **承诺一致性**：v0.7 RFC-0027 + RFC-0029 已明示"ADR 不再作为独立机制"——但 `docs/adrs/` 仍存 17 活跃 ADR（0066~0099 除 0099 + 012 + 013），承诺与现状脱节
2. **方向一致性**：Inv2RfcSotDecisionLayer 修订后，ADR 编号引用方向是 RFC → ADR 端被阻断（RFC 是 why 记录层，ADR 历史归档是考古链路）；活跃 ADR 鼓励新 ADR 创作违反此原则
3. **机制定义保留**：ADR-0099（landing-files 机制定义根）必须保留——它是 check-adr-landing.ts 的机制源；保留 1 机制根表明"ADR 治理机制"自身仍由 ADR 承载

**结果**：

- 35 文件 `git mv`：`docs/adrs/` 17 活跃 ADR + 012/013 + 0066~0098（除 0099） → `.openxenon/.archived/docs/adrs/`
- 88 归档 ADR frontmatter 加 `status: Archived` + `archived-at: 2026-08-11` + `archived-by: RFC-0030-D1`
- ADR-0099 frontmatter 改 `status: Active-Mechanism` + 标注"机制定义根"
- `docs/rfc/zh-cn/README.md` §ADR 归档查询段更新：从"72 归档 + 17 活跃" → "1 机制根（ADR-0099）+ 88 归档"

### D2 · 全清 121 处 Asset RFC/ADR 编号引用

**理由**：

1. **Inv2 字面落实**：`oxn-project-domain.md:189` Inv2RfcSotDecisionLayer 字面规定"Domain 不反向引用 RFC/ADR（assets-no-docs 规则）"——121 处引用全是存量违规
2. **死代码激活**：基于 `scripts/check-asset-structure.ts` 新增 `E_ASSET_RFC_ADR_CITATION` 规则（而非启用 `check-doc-boundary.ts` 的死代码 `assets-no-docs`）——避免误伤合法 Domain → glossary 路径引用（oxn-asset-domain:73/76/82）

**处理方案**（基于 `.openxenon/drafts/design-asset-no-rfc-adr-citation.md §2` 8 类）：

| # | 类别 | 数量 | 处理 |
|---|---|---:|---|
| A | 纯行尾引用 | 47 | 删引用 |
| B | 锁定/机制声明 | 17 | 去编号保留语义 |
| C | 替代/废弃历史 | 10 | 去编号保语义 |
| D | 🆕 变更标注 mid-section | 16 | 整段删除 |
| E | 显式 docs/ 链接 | 6 | 删链接保文字 |
| F | L3 回源导航声明 | 2 | 整段删除 |
| G | 概念定义 + RFC-XXXX 占位 + 路径模板 | ~8 | 保留 |
| H | frontmatter version-changelog 编号引用 | 7 | 删 RFC 编号保日期 |

**结果**：

- 18 文件改动（13 `.openxenon/assets/` + 5 `packages/engine/src/builtin/`），~100 行
- `scripts/check-asset-structure.ts` 新增 `E_ASSET_RFC_ADR_CITATION` 规则接 pre-commit
- 正则：`\b(?:RFC|ADR)-[0-9]{3,4}\b`；豁免：`RFC-XXXX` 占位、`docs/rfc/zh-cn/RFC-XXXX-<theme>.md` 路径模板、`### RFC` 概念定义

### D3 · RFC-0017/0018 Errata 收尾

**理由**：

1. **RFC frozen+errata 演进规则**（RFC-0010）：accepted 后正文不可改，仅可追加 Errata 段
2. **表述一致性**：RFC-0029 D1 修订 Inv2RfcSotDecisionLayer 后，RFC-0017 §D1/D2（双层 SSOT 表格 + 单向同步段）与 RFC-0018 附录 A（R&N 32 术语对照）残留"RFC 是 SSOT"措辞需收尾

**结果**：

- RFC-0017 §D1/D2 后追加 Errata v0.x 段："🆕 v0.7.0 RFC-0029 + RFC-0030 修订：术语三层 SSOT 架构（why/what/用户视图）由 RFC-0029 D3 扩展落实"
- RFC-0018 附录 A 末追加 Errata 段："🆕 v0.7.0 RFC-0028 + RFC-0029 + RFC-0030 修订：Meta 层由 5 类降为 4 类（CONTEXT-MAP 退役）；R&N 32 术语对照历史溯源保留"

### D4 · `check-adr-landing.ts --enforce` 切换

**理由**：

1. **强制机制可用**：`scripts/check-adr-landing.ts` v0.8.0 已有规则 3（landing-files/related 必含至少一条 `assets/domains/*.md` 路径）
2. **历史负担清理完毕**：D1 物理归档后 88 归档 ADR 已加 `landing-reason: declarative` 豁免；D2 Asset 清理后未来新增 ADR 必满足规则 3

**切换时点**：Stage 2 全批（Batch A/C/D/E）落地完成 + D1 归档完毕 + D2 守门激活 + D3 Errata 追加 + D5 README 更新全部完成

**结果**：

- `.husky/pre-commit` 或 `.github/workflows/ci.yml` 默认参数从 `--advisory` 改 `--enforce`
- 退出码：0 通过 / 1 违规

### D5 · RFC README §ADR 归档查询段更新

**理由**：D1 物理归档 17 活跃 ADR 后，README §ADR 归档查询段需同步更新统计口径

**结果**：

- §ADR 归档查询段：从"72 归档 + 17 活跃" → "1 机制根（ADR-0099）+ 88 归档"
- §ADR → RFC 迁移说明段：补充"v0.7.0 RFC-0030 D1 物理归档 17 活跃 ADR（仅 ADR-0099 留作机制定义根）"
- §统计表更新：从"48 Adopted 迁移 + 6 Superseded 归档"改为完整口径（88 归档）

## 落地清单

| # | 动作 | 文件 | 责任 |
|---|---|---|---|
| 1 | D1 git mv 35 ADR 文件 | docs/adrs/ → .openxenon/.archived/docs/adrs/ | 工程师 + AI |
| 2 | D1 ADR-0099 frontmatter 更新 | docs/adrs/0099-adr-landing-mandatory.md | 工程师 |
| 3 | D2 全清 121 处 RFC/ADR 编号引用 | 18 Asset/builtin 文件 | AI |
| 4 | D2 新增 E_ASSET_RFC_ADR_CITATION 规则 | scripts/check-asset-structure.ts | AI |
| 5 | D3 RFC-0017 Errata 追加 | docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md | AI |
| 6 | D3 RFC-0018 Errata 追加 | docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md | AI |
| 7 | D5 README §ADR 归档查询段更新 | docs/rfc/zh-cn/README.md | AI |
| 8 | D4 check-adr-landing.ts --enforce 切换 | .husky/pre-commit 或 .github/workflows/ci.yml | 工程师 |
| 9 | 6 项验证守门 | scripts/{check-asset-structure,check-doc-boundary,validate-dependencies,check-adr-landing,check-versioned-docs,sync-domain-glossary}.ts | AI |
| 10 | .changes/0-7-0-rfc-adr-historical-convergence.md 落盘 | .changes/ | AI |

## 验证守门

```bash
bun run typecheck                                       # passed
bun run check                                           # passed
bun run lint                                            # passed
bun test                                                # 2127+ pass / 0 fail
bun scripts/check-asset-structure.ts                    # 0 违规（含 E_ASSET_RFC_ADR_CITATION）
bun scripts/check-doc-boundary.ts                       # 0 违规（4 规则）
bun scripts/validate-dependencies.ts                    # passed
bun scripts/check-adr-landing.ts --enforce              # 0 违规
bun scripts/check-versioned-docs.ts                     # passed
bun scripts/sync-domain-glossary.ts --write             # Domain 9 files → glossary 单页
oxn assetmap show oxn-system --scene <all 6 scenes>     # 6 scene 全解析无 dangling link
```

## 风险与缓解

| # | 风险 | 严重度 | 缓解 |
|---|---|---|---|
| R1 | 88 归档 ADR landing-files 强制模式后报错 | 高 | 归档时统一加 `status: Archived` + `landing-reason: declarative` 豁免 |
| R2 | `git mv` 后 GitHub 锚点链接破 | 中 | README §ADR 归档查询段指向 `.openxenon/.archived/docs/adrs/` |
| R3 | RFC-0017/0018 Errata 与原 §D1/D2 表述并存引发搜索歧义 | 低 | Errata 段标注"🆕 v0.7.0 修订"前缀 |
| R4 | Batch D 涉及 Inv 修订触发守门 | 中 | RFC-0030 D1/D2 是 Inv 修订授权 |
| R5 | `E_ASSET_RFC_ADR_CITATION` 守门误伤合法术语 | 低 | 正则豁免 RFC-XXXX 占位与路径模板 |
| R6 | Stage 2 与 Stage 3 并行执行冲突 | 中 | Stage 3 涉及 Domain 文件改动时串行 |
| R7 | `assets-no-docs` 死代码未启用可能仍误伤 | 低 | 暂不动；单独议题 |

## 架构原则一致性

| 原则 | 一致性 |
|---|---|
| **AGENTS.md 裁决规则 2 档**（Domain = SSOT 第 1 档） | ✅ D1/D2/D3 全方位落地 |
| **RFC frozen + errata 演进**（RFC-0010） | ✅ D3 走 Errata |
| **文档三情态**（Asset / RFC / Doc · RFC-0009） | ✅ D1 ADR 归档消除情态混淆 |
| **ADR 不再独立机制**（v0.7 RFC-0027/0028/0029） | ✅ D1 物理归档 17 活跃 ADR |
| **Asset 结构 v2**（Group → Axiom → Theorem） | ✅ D2 清理强化 Inv2 字面 |
| **AI Agent Blueprint 闭包 L2 加载链** | ✅ Domain 引用纯净，AI 无歧义 |
| **`scripts/check-adr-landing.ts` 规则 3** | ✅ D4 切 enforce |

## changelog

`.changes/0-7-0-rfc-adr-historical-convergence.md`（v0.7.0-alpha.0）。

## Errata

<!-- status: Accepted → 冻结,仅可追加 errata 段,version bump patch -->