---
entity: rfc
id: RFC-0013
theme: versioning-policy
status: Accepted
date: 2026-07-27
accepted-at: 2026-07-27
supersedes: []
superseded-by: ~
synced-at: 2026-07-27
---

# RFC-0013: 版本号政策——Versioning Policy

> **类型**：RFC（OpenXenon 规范）
> **主题**：versioning-policy
> **状态**：✅ Accepted（2026-07-27，v0.6.2-alpha.0 首批新增；frontmatter `status: Accepted`）
> **批次**：2026-07-27 v0.6.2-alpha.0 首批新增

## 摘要

OXN 版本号约定——alpha prerelease 机制 + 版本相关文档三情态分离（Version Fragment / Roadmap / Fix Record）+ AssetMap 与 Roadmap 术语消歧 + RFC 文档版本策略（移除 version 字段，对齐业界标准）。package.json 为版本号唯一真相源（SSOT），`bun run version:check` 强制 8 文件一致性。

## 决策

### D1：Alpha 格式（semver prerelease）

OXN 采用 semver 2.0.0 标准的 prerelease 标记：

```
MAJOR.MINOR.PATCH-alpha.N
```

- 格式：`0.6.2-alpha.0`、`0.6.2-alpha.1`、...、`0.6.2`（stable）
- semver 排序：`0.6.2-alpha.0 < 0.6.2-alpha.1 < 0.6.2`
- 历史先例：`0.6.1-alpha.0`（2026-07-02，调试驱动修复版）

**禁用格式**：

- ❌ 字面字符串前缀（`alpha-0.6.2`）——破坏 npm/Bun 工具链 semver 解析
- ❌ release channel 元数据分离（version `0.6.2` + channel `alpha`）——OXN 无多通道分发需求

### D2：Alpha 生命周期

#### 何时开启 alpha

| 版本类型 | Alpha | 理由 |
|---|---|---|
| **patch**（0.6.2 → 0.6.3） | ❌ 不走 | 小修复，风险低 |
| **minor**（0.6.x → 0.7.0） | ⚙️ 人工确认 | 视内容而定——涉及重大功能/重构则开启，否则直接发 |
| **major**（0.x → 1.0.0） | ✅ 必经 | 破坏性变更，需验证 |

**是否开启 alpha 由工程师人工确认**——不依赖自动条件（测试通过率、feature gate 等）。

#### 一旦开启，必须走完

```
0.7.0-alpha.0  ← 开启后
0.7.0-alpha.1  ← 迭代
0.7.0-alpha.N  ← ...
0.7.0          ← 必须转正（不能跳过 0.7.0 直接去 0.8.0）
```

**约束**：一旦开启 alpha 阶段，必须走完到 stable 转正——不能放弃该版本直接跳到下一个版本。这防止 alpha 版本堆积。

#### 转正

**工程师人工 sign-off**——无自动条件。工程师判断以下维度（非穷举，非强制）：

- 核心特性已实现且通过人工验证
- 测试套件无已知阻塞失败
- 版本号一致性检查通过（`bun run version:check`）
- changelog 片段已落盘（`.changes/0-X-Y-*.md`）

**转正动作**：bump `0.7.0-alpha.N` → `0.7.0`（3 个 package.json + version-check.ts 8 文件一致性）。

#### 不追溯原则

本 RFC Accepted 后开始适用。历史版本（0.6.1-alpha.0 等）不追溯重新评估。

### D3：版本相关文档三情态分离

OXN 版本相关文档分为三类，各居其位，职责不重叠：

| 文档类型 | 情态 | 位置 | 时间向 | 内容 | 何时落盘 | 转正后 |
|---|---|---|---|---|---|---|
| **Version Fragment** | 描述性 | `.changes/0-X-Y-*.md` | 回顾 | 变更日志片段（改了什么） | 版本转正时 | — |
| **Roadmap** | 描述性 | `dev/versions/` | 前瞻 | 版本计划（将包含什么） | 版本规划时 | 归档（不删除） |
| **Fix Record** | 描述性 | `dev/fix/` | 回顾 | Bug 修复记录（开发者面向） | 修复完成时 | — |

#### Version Fragment（`.changes/`）

- 回顾性——版本转正时落盘
- frontmatter：`version` / `date` / `type` / `status: released`
- 公开可见（README + CHANGELOG.md 引用）
- 不引用 `.openxenon/` 内部路径（boundary 规则）

#### Roadmap（`dev/versions/`）

- 前瞻性——描述未来版本将包含什么
- frontmatter：`version` / `date` / `type` / `status: planned`
- 允许引用 `.openxenon/` 内部 RFC 草稿、sprint 设计稿（`dev/ → .openxenon/ ✅` 允许）
- 版本转正后**归档**（移到 `.openxenon/.archived/dev/versions/`，不删除）——对应的 Version Fragment 已落盘到 `.changes/`
- 注意：此 "Roadmap" 与 AssetKind=Roadmap（AssetMap）不同概念，见 D4

#### Fix Record（`dev/fix/`）

- 回顾性——开发者面向的 bug 修复记录
- 比 Version Fragment 更详细（含根因分析、调试过程）
- 不对外公开（dev/ 是开发者手册，不是产品文档）

### D4：AssetMap ≠ Roadmap（术语消歧）

"Roadmap" 在 OXN 里曾经过载——同时指 AssetKind 和版本计划。本决策拆分：

| 概念 | 术语 | 位置 | 情态 | 内容 |
|---|---|---|---|---|
| AssetKind=roadmap | **AssetMap** | `.openxenon/assets/roadmaps/` | 定义性 Asset | 系统导航索引（6 scene 路由表 + Domain/Blueprint 索引）；AI 路由入口；不参与 references DAG |
| 版本计划文档 | **Roadmap** | `dev/versions/` | 描述性 Doc | 前瞻性版本计划（将包含什么） |
| 公开路线图 | **Public Roadmap** | `docs/product/.../roadmap.md` | 描述性 Doc | 用户面向摘要 |

- AssetKind 枚举值保持 `roadmap`（代码不改），glossary 主术语改为 **AssetMap**
- "Roadmap" 在 glossary 中专指版本计划文档（D3）
- AssetMap 的 glossary 定义加注："别名 Roadmap（已废弃，避免与版本计划文档混淆）"

### D5：package.json 为版本号 SSOT

`package.json`（root）的 `version` 字段是版本号唯一真相源。

`bun run version:check` 强制以下 8 文件与 package.json 一致：

| 文件 | 提取方式 |
|---|---|
| `README.md` | `/版本:\s*([\d.\-a-z]+)/` |
| `README.en.md` | `/Version:\s*([\d.\-a-z]+)/` |
| `docs/product/zh-cn/changelog/CHANGELOG.md` | 第一个 `## [X.Y.Z]` |
| `docs/product/en/changelog/CHANGELOG.md` | 第一个 `## [X.Y.Z]` |
| `packages/engine/package.json` | `version` 字段 |
| `packages/cli/package.json` | `version` 字段 |
| `docs/product/zh-cn/roadmap.md` | `/当前版本[：:]\s*\*?\*?v?([\d.\-a-z]+)/` |
| `.openxenon/assets/roadmaps/oxn-system.md` | `/当前自举范围.*v?([\d.\-a-z]+)/` |

**豁免清单**（不检查）：

- `dev/versions/`（前瞻性，版本号未定）
- `docs/product/en/roadmap.md`（已标 stale banner）
- `.changes/pre-0-6-history.md`（历史归档）
- `docs/rfc/zh-cn/*.md`（RFC 文档无 version 字段，见 D6）
- AGENTS.md（历史叙述，不强制等于 package.json）

### D6：RFC 文档版本策略（移除 version 字段）

**对齐业界标准**（IETF RFC / Rust RFC / Python PEP）——RFC 文档不使用版本号。

- **移除** RFC frontmatter 的 `version` 字段
- **保留** `status` 字段：`Draft | Accepted | Superseded`
- **Errata**：追加到 `## Errata` 段（带日期），不 bump 版本号
- **Amendment**（实质性变更）：新 RFC 编号 + `supersedes` 指向原 RFC
- **理由**：frozen+errata 模型下，semver 的 minor/major 位永远不会被使用（frozen = 无 amendment，amendment = 新 RFC）。保留 version 字段是多余的 semver 外壳。

**对本 RFC 的影响**：RFC-0013 自身无 `version` 字段，`status: Draft`。

**对 RFC-0010 的影响**：RFC-0010 的 "version bump patch" 条款需 errata 更新，引用本 RFC D6。

**对现有 12 RFC 的影响**：批量移除 `version: 1.0.1` 字段（errata 级变更，不改核心内容）。

## 不变量

1. **inv-1**：minor 版本是否开启 alpha 由工程师人工确认；major 必经 alpha；patch 不走 alpha
2. **inv-2**：一旦开启 alpha 阶段，必须走完到 stable 转正（不能跳过该版本）
3. **inv-3**：alpha → stable 转正仅由工程师人工 sign-off 触发（无自动条件）
4. **inv-4**：版本相关文档三情态分离——Version Fragment / Roadmap / Fix Record 各居其位
5. **inv-5**：AssetMap（AssetKind=roadmap）≠ Roadmap（版本计划文档）——术语不混用
6. **inv-6**：package.json 为版本号 SSOT，8 文件一致性由 version-check 强制
7. **inv-7**：RFC 文档不使用 version 字段；用 status + Errata 段演进

## 参考

- [RFC-0009 文档三情态分离](./RFC-0009-doc-three-modalities.md)——本 RFC 的情态分离原则来源
- [RFC-0010 frozen+errata](./RFC-0010-frozen-errata.md)——RFC 自身演进策略（D6 errata 更新其 version bump 条款）
- [semver 2.0.0](https://semver.org/)——alpha prerelease 语法来源
- IETF RFC Editor——RFC 不版本化的业界先例
- Rust RFC Process——RFC 不版本化的业界先例
- 历史 alpha 先例：`.changes/0-6-1-alpha-0.md`（2026-07-02）

## Errata

### 2026-07-27 — D3 补充：规划池（Planning Pool）

**触发**：2026-07-27 grilling session C-OC2 决策——把当前 v0.7.0+ 规划集中到无版本号的规划池，由工程师 scheduling 后再绑版本号。

**补充条款**：在 D3 表格中 `Roadmap` 行下，新增前置状态：

| 文档类型 | 情态 | 位置 | 时间向 | 入场条件 | 状态 |
|---|---|---|---|---|---|
| **PlanningPool** | 描述性 | `dev/pool/` | 前瞻（备选）| 工程师 mental commit 后入池；frontmatter 无 `version` 字段 | `status: planned` |
| **Roadmap** | 描述性 | `dev/versions/` | 前瞻（已绑版本）| 从 PlanningPool scheduling 后移过来；frontmatter 必填 `version` | `status: planned` |

**frontmatter schema 差异**：

| 字段 | PlanningPool（`dev/pool/`）| Roadmap（`dev/versions/`）|
|---|---|---|
| 必填 | `id` / `theme` / `priority` / `status` / `created-at` / `scheduled-version` | `version` / `date` / `type` / `status` |
| 可选 | `note` / `rfc` / `adr` | `rfc` / `adr` |
| 禁用 | `version` 字段 | — |

**生命周期**：

```
1. 入池: PlanningPool  (工程师 mental commit)
2. 调度: PlanningPool  → Roadmap  (git mv + 补 version)
3. 转正: Roadmap      → .openxenon/.archived/dev/versions/  (版本转正时)
```

**当前状态（2026-07-27）**：`dev/versions/` 为空，所有 v0.7.0+ 规划已迁入 `dev/pool/`（5 个 entry + 2 个 grilling 产出 critical entry）。

**配套修改**：
- `.openxenon/assets/domains/oxn-project-domain.md` 新增 `PlanningPool` 术语 + 更新 `Roadmap` 术语
- `dev/pool/README.md` 创建立规划池定义
- `dev/versions/README.md` 更新为"已绑版本 Roadmap 目录（当前空）"
- 5 个原 `dev/versions/0-X-Y-*.md` 已 `git mv` 到 `dev/pool/<slug>.md` + 改 frontmatter
- `dev/pool/` 新增 `engine-closure-self-verify.md` + `npm-ship-path.md`（grilling 产出）

**配套 invariant**：
- `oxn-project-domain.md` 新增 `PlanningPool` 术语（含入池/出池条件）
- 无新增 inv——`Roadmap` 原有 inv（`doc-three-modalities`）继续适用