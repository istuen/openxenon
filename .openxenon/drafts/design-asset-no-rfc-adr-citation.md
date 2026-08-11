---
type: draft
created: 2026-08-11
status: active
abstract: |
  Asset 内 RFC/ADR 编号引用全量清理 + 守门新增。Asset 作为 SSOT 自身就是出处，RFC/ADR 是这些 SSOT 的扩展阅读或描述。RFC→Domain 方向引用保留；Asset → RFC/ADR 方向（编号引用）全清。本次处理 13 + 5 = 18 文件、~121 处编号引用，新增 E_ASSET_RFC_ADR_CITATION 守门。
---

# Asset 去 RFC/ADR 编号引用执行计划

## 1. 现状盘点

- **121 处 RFC/ADR 编号引用**（RFC-0027×15、ADR-0066×14、RFC-0028×10、ADR-0089×8 …）
- 涉及文件：9 Domain + 3 Workflow + 1 AssetMap + 1 Stack（.openxenon/assets/）+ builtin 5 文件（packages/engine/src/builtin/）
- **关键发现**：`oxn-project-domain.md §Inv2RfcSotDecisionLayer` 第 191 行已明文规定 "Domain 不反向引用 RFC/ADR（assets-no-docs 规则）"——这 121 处全是该项目自己规则的存量违规。`scripts/check-doc-boundary.ts` 的 `assets-no-docs` 规则是**死代码**（main() 不扫描 .openxenon/assets/），未实际执行。

## 2. 8 类引用及处理

| # | 类别 | 数量 | 处理 | 工程师决策 |
|---|---|---|---|---|
| A | 纯行尾引用（信息在正文） | 47 | 删除引用，内容无损（`3 字段不变量（ADR-0051）` → `3 字段不变量`） | 默认 |
| B | 锁定/机制声明 | 17 | 去编号保留语义（`RFC-0012 锁定（meta-RFC）` → `已锁定`） | 默认 |
| C | 替代/废弃历史 | 10 | 去编号保语义（`已被 ADR-0067 废弃` → `已废弃`） | 默认 |
| D | 🆕 变更标注（mid-section/abstract/changelog） | 16 | 整段删除 | 延续上一任务 |
| E | 显式 docs/ 链接 | 6 | 删链接保文字 | 默认 |
| F | L3 回源导航声明（AssetMap） | 2 | 整段删除 | **去掉**：AssetMap 导航只针对 Asset 本身 |
| G | RFC/ADR 概念定义 + `RFC-XXXX` 占位符 + 路径模板 | ~8 | **保留** | RFC 保留术语定义 |
| H | frontmatter version-changelog 里的编号引用 | 7 | 删 RFC 编号，保留日期/版本 | **去掉** |

## 3. 特殊处理（保留 + 编号清理）

- **Inv2RfcSotDecisionLayer**（project-domain:186-193）：保留"RFC/ADR = why 记录层"与"Domain 不反向引用"规则内容；去 `（RFC-0028 已开先例）`、`（RFC-0029）`、`RFC-0018 附录 A` 编号
- **Inv14AdrAcceptedLandingRequired**（我们 Phase-4 加的）：去 `（如 ADR-0066…RFC-0027/0028 覆盖）` 和 `（ADR-0099 生效后…）/ 存量 0066~0098`，保留 landing 规则语义
- **release-cut.md frontmatter `references:`**：3 条 docs/rfc + docs/adrs 路径删除
- **oxn-system.md abstract**：v3.2.0 等 changelog 行去 RFC 编号；L3 回源声明（line 21）整段删除

## 4. builtin starter assets 清理

`packages/engine/src/builtin/{domains,blueprints,stacks,workflows,assetmaps}` 的 5 个 起手 Asset 引 `（ADR-0089 D1/D6）`——对消费者项目引用内部 ADR 无意义，删除。**注意**：builtin 是独立副本（与 .openxenon 不同步），需单独改。

## 5. 守门新增

`scripts/check-asset-structure.ts` 新增 `E_ASSET_RFC_ADR_CITATION`：
- 规则：Asset 正文禁止 `RFC-[0-9]{3,4}` / `ADR-[0-9]{3,4}`
- 天然豁免（正则只匹配数字）：
  - `RFC-XXXX` 占位符（doc-md-domain:62 追踪标记）
  - `docs/rfc/zh-cn/RFC-XXXX-<theme>.md` 路径模板
  - 无编号的 "RFC/ADR" 术语（`### RFC` 概念定义）

## 6. 不做的事

- **不动** `assets-no-docs` 死代码：启用会误伤合法 Domain → glossary 路径引用（oxn-asset-domain:73/76/82），属另一议题
- **不动** RFC/ADR 文档 → Domain 方向引用（landing-files、L3 回源）——保持单向

## 7. 验证

`check-asset-structure` / `check-doc-boundary` / `validate-dependencies` / `sync-domain-glossary --write` / `typecheck` / `check` / `lint` / `test`（预期仍 2127 pass / 10 pre-existing fail）。

## 8. 影响范围

| 类别 | 文件数 | 改动行数（估算） |
|---|---|---|
| .openxenon/assets/ | 13 | ~80 行（删 ~40 行引用、改写 ~30 行） |
| packages/engine/src/builtin/ | 5 | ~6 行 |
| scripts/check-asset-structure.ts | 1 | ~20 行（新规则） |
| **合计** | **19** | **~100 行** |