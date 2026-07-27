---
entity: draft-design
name: rfc-format-design
version: 1.0.0
date: 2026-07-26
synced-at: 2026-07-26
related:
  - .openxenon/drafts/rfc-migration-master-plan.md  (Phase 1)
---

# RFC 格式与模板设计

> **状态**：设计稿（Phase 1.1 + 1.2 产出）
> **生效**：Phase 2 的 12 个 RFC 文件将按本格式落盘到 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`
> **决策**：见 `.openxenon/drafts/rfc-migration-master-plan.md` D6/D9/D10

---

## 1. RFC frontmatter 格式（1.1 产出）

### 1.1 完整字段表

```yaml
---
entity: rfc                  # 固定值，标识 RFC 实体类型
id: RFC-XXXX                 # 顺序编号（4 位补零），与文件名一致
theme: <theme-slug>          # 主题分组（见 1.3 主题清单）
version: 1.0.0               # RFC 版本号（frozen 后 bump errata）
status: <status>             # 见 1.4 状态值
date: 2026-07-26             # RFC 落盘日期（YYYY-MM-DD）
supersedes:                  # 本 RFC 推翻的旧 RFC（数组，可选）
  - RFC-XXXX
superseded-by: RFC-XXXX      # 推翻本 RFC 的新 RFC（仅一项，状态非 Accepted 时使用）
related:                     # 相关 ADR / 决策（数组，可选）
  - ADR-XXXX: .openxenon/drafts/rfc/XXXX-<slug>.md
synced-at: 2026-07-26        # 最近一次同步/更新日期
---
```

### 1.2 字段语义

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `entity` | string | ✅ | 固定 `rfc`；用于 Blueprint / doc-domain 识别 |
| `id` | string | ✅ | RFC 顺序编号；与文件名 `RFC-XXXX-<theme>.md` 一致 |
| `theme` | string | ✅ | 主题分组（见 1.3）；决定 sidebar 分组 |
| `version` | semver | ✅ | 起始 `1.0.0`；frozen 后追加 errata 段时 bump patch |
| `status` | enum | ✅ | 见 1.4 |
| `date` | date | ✅ | RFC 落盘日期（accepted 日期） |
| `supersedes` | string[] | ⬜ | 本 RFC 推翻的旧 RFC id 列表（仅当存在时填） |
| `superseded-by` | string | ⬜ | 推翻本 RFC 的新 RFC id（status ≠ Accepted 时填） |
| `related` | object[] | ⬜ | 相关 ADR 路径或决策引用；用于追溯 |
| `synced-at` | date | ✅ | 最近一次同步日期 |

### 1.3 主题清单（theme 字段值）

与 `.openxenon/drafts/rfc-migration-master-plan.md` §RFC 主题分组 一致：

| theme 值 | 主题 | RFC |
|---|---|---|
| `oxl-philosophy` | OXL / Blueprint 哲学 | RFC-0001 |
| `kernel-l0` | Kernel / L0 边界 | RFC-0002 |
| `ai-collaboration` | AI 协作哲学 | RFC-0003 |
| `work-asset` | Work / Asset 体系 | RFC-0004 |
| `insight-skill` | Insight / Skill | RFC-0005 |
| `docs-brand` | Docs / Brand | RFC-0006 |
| `domain-positioning` | Domain 词汇与 OXN 定位 | RFC-0007 |
| `naming-evolution` | 命名 / 演进策略 | RFC-0008 |
| `doc-three-modalities` | 文档三情态分离 | RFC-0009 (meta) |
| `frozen-errata` | RFC frozen+errata 演进策略 | RFC-0010 (meta) |
| `builtin-asset-two-layer` | 内置 Asset 两层机制 | RFC-0011 (meta) |
| `bootstrap-exemption` | 自举种子豁免 | RFC-0012 (meta) |

### 1.4 status 字段值

| status | 含义 |
|---|---|
| `Draft` | 起草中（仅存于 `.openxenon/drafts/rfc/`，未 promote） |
| `Proposed` | 提交评审（已走 IAP gather 阶段，待 validate） |
| `Accepted` | 已接受（核心冻结，仅可追加 errata 段） |
| `Superseded` | 已被新 RFC 取代（指向 `superseded-by`） |
| `Withdrawn` | 主动撤销（与 Superseded 区别：非被推翻而是作者撤回） |

### 1.5 与 OXP frontmatter 的差异

| 字段 | OXP | RFC | 变化理由 |
|---|---|---|---|
| `entity` | `oxp` | `rfc` | 废除 OXP 双层 |
| `id` | `OXP-XXXX` | `RFC-XXXX` | 命名 |
| `promoted-from` | ✅ | ❌（改用 `related`） | RFC 不区分来源，统一追溯 |
| `theme` | ❌ | ✅ | D9：主题分组 |
| `supersedes` | ❌ | ✅ | D6：frozen + errata 需追溯链条 |
| `superseded-by` | ❌ | ✅ | 同上 |
| `version` | ✅ | ✅ | 保留 |

---

## 2. RFC 正文模板（1.2 产出）

### 2.1 骨架（heading skeleton）

```markdown
# RFC-XXXX: <主题标题>

> **类型**：RFC（OpenXenon 规范）
> **主题**：<theme 字段值>
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：<YYYY-MM-DD promote 日期>

## 摘要

<200-300 字概述：解决什么问题、核心决策、影响范围。>

## 决策要点

### <决策 D1 标题>

<决策内容；引用证据链（ADR 来源 / 代码位置 / 概念位置）。>

### <决策 D2 标题>

<同上。>

...

## 影响范围

- ✅ <已落 SSOT + 代码>
- 🟡 <部分已落，部分待办>
- 📝 <待办 work>

## 相关术语

> 所有术语引用必须指向 `docs/glossary/zh-cn/<category>.html#<term>`。

- [TermA](/glossary/zh-cn/core-terms.html#terma) — 简述
- [TermB](/glossary/zh-cn/engine-terms.html#termb) — 简述

## 相关决策

- [<相关 RFC id>](<RFC-XXXX 对应路径>.md) — 简述关系
- ADR-XXXX（参见 `.openxenon/drafts/rfc/XXXX-<slug>.md`，仅 related 段引用）— 来源 ADR

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-XXXX Accepted 起冻结。
```

### 2.2 与 OXP 模板的差异

| 段落 | OXP | RFC | 变化理由 |
|---|---|---|---|
| 类型标注 | `OXP (OpenXenon Proposal)` | `RFC（OpenXenon 规范）` | D1：RFC 是规范不是 Proposal |
| 模板段 | What → Why → How → 参考 | 摘要 → 决策要点 → 影响范围 → 相关术语 → 相关决策 → Errata | D5/D9：RFC 强调决策+术语，弱化 How |
| 章节标题 | 论文式命名（如"核心命题"） | 朴素命名（决策要点） | 与 doc-author workflow 一致 |
| 术语引用 | 部分引用 glossary | 强制引用 `docs/glossary/zh-cn/*` | D5：RFC 只引用 glossary |
| 决策要点 | 可选 | 必填（每条决策独立 H3） | 版本级 RFC 必含可独立追溯的决策 |
| Errata | 有 | 有 | D6：frozen + errata 保留 |

### 2.3 引用规则（来自 D5 + F9）

1. RFC 内部可互引 RFC（`./RFC-XXXX-<theme>.md` 相对路径）✅
2. RFC → ADR：`../../.openxenon/drafts/rfc/XXXX-<slug>.md`（仅 `related` 段；正文不引）✅
3. RFC → glossary：`/glossary/zh-cn/<category>.html#<term>` 强制 ✅
4. RFC → docs/{product,dev}：❌ 禁止（规定性文档不依赖描述性文档）
5. RFC → `.openxenon/assets/`：❌ 禁止（RFC 在 docs/，严格隔离）

### 2.4 与 OXP 现有文件的兼容

- 已落盘的 3 条 OXP（OXP-0001/2/3）保留原文件至 Phase 3 删除
- Phase 2 创建的新 RFC 文件按本模板
- Phase 3 删除 OXP 后，OXP README.md 重写

---

## 3. 验证清单（每个 RFC promote 前）

- [ ] frontmatter 字段完整且值类型正确
- [ ] `id` 与文件名 `RFC-XXXX-<theme>.md` 一致
- [ ] `theme` 在主题清单内
- [ ] `status` 在合法枚举值内
- [ ] heading skeleton 完整（摘要/决策要点/影响范围/相关术语/相关决策/Errata）
- [ ] 所有术语引用都指向 `docs/glossary/zh-cn/*`
- [ ] 无 `.openxenon/` 相对路径（除 `related` 段指向 ADR）
- [ ] 无 docs/{product,dev} 引用
- [ ] `related` 段 ADR 路径存在
- [ ] `bun run docs:build` 通过（无死链）

---

## 4. 附录：示例 frontmatter

```yaml
---
entity: rfc
id: RFC-0008
theme: naming-evolution
version: 1.0.0
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0066: .openxenon/drafts/rfc/0066-terminology-simplification.md
  - ADR-0071: .openxenen/drafts/rfc/0071-abolish-audit-trail.md
  - ADR-0080: .openxenon/drafts/rfc/0080-error-terminology-unification-and-governance.md
synced-at: 2026-07-26
---
```

---

*本设计稿将随 Phase 2 首批 RFC 落盘后归档为 accepted；如有偏差，编辑更新即可。*