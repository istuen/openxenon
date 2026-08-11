---
version: 0.7.0-alpha.0
prerelease: alpha
date: 2026-08-11
type: refactor
scope: rfc-adr-historical-convergence
status: pending
---

# 0.7.0-alpha.0: RFC/ADR 历史溯源收敛

> 来源：[RFC-0030-rfc-adr-historical-convergence](../../docs/rfc/zh-cn/RFC-0030-rfc-adr-historical-convergence.md)（v0.7.0）
> 前置：[RFC-0027-asset-convergence-v070](../../docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md) + [RFC-0028-context-map-deprecation](../../docs/rfc/zh-cn/RFC-0028-context-map-deprecation.md) + [RFC-0029-inv2-revision](../../docs/rfc/zh-cn/RFC-0029-inv2-revision.md)

## 摘要

v0.7.0 文档架构在 RFC-0027（Asset 收敛）+ RFC-0028（CONTEXT-MAP 退役）+ RFC-0029（Inv2 语义修订）三轮落地后，仍有 4 项长期未决：

1. **17 活跃 ADR 残留**（与 v0.7『ADR 不再独立』承诺张力）
2. **Asset 文件 121 处 RFC/ADR 编号引用**（违反 Inv2RfcSotDecisionLayer 字面）
3. **RFC-0017/0018 措辞残留**（与 Inv2 修订口径不一致）
4. **`check-adr-landing.ts` 默认 advisory**（未启用强制）

RFC-0030 集中决策 4 项配套落地动作；与 RFC-0029 一并构成 v0.7.0 文档架构完整闭环。

## D1 · 17 活跃 ADR 物理归档

- **35 文件 git mv**：`docs/adrs/` 17 活跃 ADR + 012/013 + 0066~0098（除 0099）→ `.openxenon/.archived/docs/adrs/`
- **仅 ADR-0099 保留**于 `docs/adrs/` 作机制定义根（landing-files 机制引入者）
- 88 归档 ADR frontmatter 加 `status: Archived` + `archived-at: 2026-08-11` + `archived-by: RFC-0030-D1`
- ADR-0099 frontmatter 改 `status: Active-Mechanism` + `role: mechanism-root`
- `docs/rfc/zh-cn/README.md` §ADR 归档查询段更新：从"72 归档 + 17 活跃" → "1 机制根 + 88 归档"

### 归档清单（按 ADR 编号）

| 范围 | 数量 | 处理 |
|---|---:|---|
| 0001~0061 + 0072 | 54 | git mv 至 archived（其中部分已存在，新版本覆盖） |
| 0066~0082 | 17 | 移除 docs/adrs/ 重复（archived 已是更新版） |
| 0083~0098 | 16 | git mv 至 archived |
| 012、013 | 2 | 移除 docs/adrs/ 重复 |
| 0099 | 1 | **保留**于 docs/adrs/，`status: Active-Mechanism` |

## D2 · 全清 121 处 Asset RFC/ADR 编号引用

- **18 文件改动**（13 `.openxenon/assets/` + 5 `packages/engine/src/builtin/`），~100 行
- 已完成（v0.6.4 阶段清理 + RFC-0027 PR-F）；实测 0 处违规
- `scripts/check-asset-structure.ts` 已有 `E_ASSET_RFC_ADR_CITATION` 规则接 pre-commit
- 正则：`\b(?:RFC|ADR)-[0-9]{3,4}\b`；豁免：`RFC-XXXX` 占位、`docs/rfc/zh-cn/RFC-XXXX-<theme>.md` 路径模板、`### RFC` 概念定义

### 8 类引用处理（per `.openxenon/drafts/design-asset-no-rfc-adr-citation.md §2`）

| # | 类别 | 处理 |
|---|---|---|
| A | 纯行尾引用 | 删引用 |
| B | 锁定/机制声明 | 去编号保留语义 |
| C | 替代/废弃历史 | 去编号保语义 |
| D | 🆕 变更标注 mid-section | 整段删除 |
| E | 显式 docs/ 链接 | 删链接保文字 |
| F | L3 回源导航声明 | 整段删除 |
| G | 概念定义 + RFC-XXXX 占位 + 路径模板 | **保留** |
| H | frontmatter version-changelog 编号引用 | 删 RFC 编号保日期 |

## D3 · RFC-0017/0018 Errata 收尾

- **RFC-0017 §D1/D2 后追加 Errata v0.3 段**：标注"🆕 v0.7.0 RFC-0029 + RFC-0030 修订：术语三层 SSOT 架构"
- **RFC-0018 附录 B 后追加 Errata v0.4 段**：标注"🆕 v0.7.0 RFC-0028 + RFC-0029 + RFC-0030 修订：Meta 层由 5 类降为 4 类"
- 走 RFC-0010 frozen+errata 演进规则；不改原正文；Errata 段统一前缀

## D4 · `check-adr-landing.ts --enforce` 切换（推迟）

**切换时点**：Stage 2 全批（Batch A/C/D/E）落地完成 + D1 归档完毕 + D2 守门激活 + D3 Errata 追加 + D5 README 更新全部完成

**当前状态**：`advisory` 模式（仅警告）

**预切前清单**：

- [ ] Batch A · oxn-engine-domain Theorem 增补完成
- [ ] Batch C · oxn-proof-domain Theorem 增补完成
- [ ] Batch D · oxn-project-domain Theorem 增补完成
- [ ] Batch E · oxn-draft + oxn-cli Theorem 增补完成
- [ ] 30 RFC frontmatter 补 landing-files 或 landing-reason
- [ ] ADR-0099 landing-files 已含至少一条 Domain 路径（已落）
- [ ] `.husky/pre-commit` 或 `.github/workflows/ci.yml` 默认参数改 `--enforce`

## D5 · RFC README §ADR 归档查询段更新

- §ADR 归档查询段：从"72 归档 + 17 活跃" → "1 机制根（ADR-0099）+ 88 归档"
- §ADR → RFC 迁移说明段：补充"v0.7.0 RFC-0030 D1 物理归档 17 活跃 ADR"
- §统计表更新：从"48 Adopted 迁移 + 6 Superseded 归档"改为完整口径（88 归档）

## 落地清单

| # | 动作 | 文件 | 状态 |
|---|---|---|---|
| 1 | D1 git mv 35 ADR 文件 | docs/adrs/ → .openxenon/.archived/docs/adrs/ | ✅ |
| 2 | D1 ADR-0099 frontmatter 更新 | docs/adrs/0099-adr-landing-mandatory.md | ✅ |
| 3 | D2 18 文件 RFC/ADR 引用清理 | 18 Asset/builtin 文件 | ✅（v0.6.4 已完成；实测 0 违规）|
| 4 | D2 E_ASSET_RFC_ADR_CITATION 规则 | scripts/check-asset-structure.ts | ✅（v3.2 已实现）|
| 5 | D3 RFC-0017 Errata 追加 | docs/rfc/zh-cn/RFC-0017-terminology-two-tier-ssot.md | ✅ |
| 6 | D3 RFC-0018 Errata 追加 | docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md | ✅ |
| 7 | D5 README §ADR 归档查询段更新 | docs/rfc/zh-cn/README.md | ✅ |
| 8 | D4 check-adr-landing.ts --enforce 切换 | .husky/pre-commit 或 .github/workflows/ci.yml | ⏸ 推迟到 Phase 2 全批落地后 |
| 9 | 6 项验证守门 | scripts/*.ts | ⏸ 部分已通过 |
| 10 | RFC-0030 草稿 + RFC 文件 | .openxenon/drafts/ + docs/rfc/zh-cn/ | ✅ |

## 验证守门

| 守门 | 状态 | 备注 |
|---|---|---|
| `bun scripts/check-asset-structure.ts` | ✅ 通过 | 23/23（已含 E_ASSET_RFC_ADR_CITATION 守门） |
| `bun scripts/validate-dependencies.ts` | ✅ 通过 | 0 violations |
| `bun scripts/check-doc-boundary.ts` | ⚠️ 2 违规 | 预存在 RFC-0017 路径格式不一致（`./../../product/...` vs `./glossary.md`）；非本 PR 引入 |
| `bun scripts/check-adr-landing.ts --advisory` | ⚠️ 23 警告 | 历史 RFC landing-files 缺失；待 Batch A/C/D/E 完成后切换 enforce |
| `bun scripts/sync-domain-glossary.ts --write` | ⏸ 待跑 | 域名收敛后跑 |
| `oxn assetmap show oxn-system --scene <6 scenes>` | ⏸ 待跑 | 收尾验证 |

## 关联变更

| 关联项 | 处理 |
|---|---|
| `RFC-0027` Asset 收敛 v0.7 | 历史 RFC，frozen；本次配套 |
| `RFC-0028` CONTEXT-MAP 退役 | 历史 RFC，frozen；本次配套 |
| `RFC-0029` Inv2 语义修订 | 历史 RFC，frozen；本次配套 |
| `AGENTS.md` 裁决规则 | 已对齐，无需改 |
| `scripts/check-doc-boundary.ts` `rfc-no-product-doc` 规则 targetExempt | 待补丁（仅允许 `.html`；RFC-0017 用 `.md`）|

## changelog 历史

- `0-6-4-alpha-0-asset-convergence-pr-f.md` — v0.6.4 32→25 Asset 收敛（PR-F Domain 收敛）
- `0-7-0-context-map-deprecation.md` — v0.7.0 CONTEXT-MAP.md 整体删除
- `0-7-0-inv2-revision.md` — v0.7.0 Inv2RfcSotDecisionLayer 语义修订
- `0-7-0-rfc-adr-historical-convergence.md` — **本 changelog**