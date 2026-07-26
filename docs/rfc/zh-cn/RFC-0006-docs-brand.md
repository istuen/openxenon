---
entity: rfc
id: RFC-0006
theme: docs-brand
version: 1.0.0
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0023: .openxenon/drafts/rfc/0023-at-addressing-no-arrow-pointer.md
synced-at: 2026-07-26
---

# RFC-0006: `@` 一贯寻址哲学 + `->` 伪指针否决

> **类型**：RFC（OpenXenon 规范）
> **主题**：docs-brand
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

OXL 寻址语法统一在 `@` 前缀下——builtin（`@oxn/...`）、项目级（`@prj/...`）、用户全局（`@gbl/...`）、Domain 跨 term（`@term/...`）。`->` 箭头指针被否决，因为它不携带位置信息、无法做编译期引用完整性校验，且语义上混淆 OOP "指针"概念与 OXL 文本引用。

## 决策要点

### D1：`@` 前缀全库语义统一

OXL 所有引用必须以 `@` 前缀开头，区分四种 scope：

| Scope 前缀 | 含义 | 示例 |
|---|---|---|
| `@oxn/` | Builtin（随 OXN 版本发布） | `@oxn/probe/ts-compiles` |
| `@prj/` | 项目级（`.openxenon/assets/`） | `@prj/domains/oxn-domain` |
| `@gbl/` | 用户全局（`~/.config/openxenon/`） | `@gbl/workflow/dev-workflow` |
| `@term/` | 同 Domain 跨 term | `@term/OrderItem` |

### D2：`->` 箭头指针否决

`->` 在 OXL 视为伪指针否决——以下两种写法必须改：

```oxl
// ❌ 否决：伪指针
OrderItem -> Order

// ✅ 改用：纯文本或 `@term/`
"OrderItem"           // 自然语言引用（文档场景）
"@term/OrderItem"     // 物理引用（强制存在校验）
```

### D3：物理可寻址约束

OXL 引用必须是**物理可寻址**——Langium（v0.6.1 退役后由 mdast 编译器继承）必须能解析为实际 AST 节点。这意味着：

- `@term/OrderItem` 必须指向某个 Domain 文件中的 H3 标题
- `@prj/domains/oxn-domain` 必须指向 `.openxenon/assets/domains/oxn-domain.md`
- `@oxn/probe/ts-compiles` 必须指向 `src/builtin/probes/ts-compiles.md`

不可寻址的引用在 validate 阶段报错（`E_MD_REFERENCE_NOT_FOUND`）。

## 影响范围

- ✅ ADR-0023 Accept（2026-06-18 落地）
- ✅ 当前 OXL Grammar 已落实 `@` 前缀
- ✅ 跨 term / 跨 Domain 引用语义统一
- 📝 与 RFC-0011 内置 Asset 两层机制联动（`@oxn/` fallback + `@prj/` override）

## 相关术语

- [Asset](/glossary/zh-cn/asset-terms.html#asset) — `@prj/` 解析目标
- [Built-in Asset](/glossary/zh-cn/project-terms.html#built-in-asset) — `@oxn/` 解析目标
- [Domain](/glossary/zh-cn/core-terms.html#domain) — `@term/` 解析目标
- [OXL](/glossary/zh-cn/core-terms.html#oxl) — 引用语法承载者

## 相关决策

- [ADR-0023](../../.openxenon/drafts/rfc/0023-at-addressing-no-arrow-pointer.md) — 来源 ADR（2026-06-18）

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-0006 Accepted 起冻结。