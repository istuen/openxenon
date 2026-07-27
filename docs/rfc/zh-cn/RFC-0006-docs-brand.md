---
entity: rfc
id: RFC-0006
theme: docs-brand
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0023: docs/adrs/0023-at-addressing-no-arrow-pointer.md
  - ADR-0030: docs/adrs/0030-term-cross-reference-upstream-dag.md
synced-at: 2026-07-27
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

### D4：`@term/` 跨 term 寻址 + `@upstream` DAG 验证（ADR-0030）

`@term/` 跨 term 引用必须满足 **DAG（无环）**——防止 Domain 间相互引用形成循环：

```oxl
// 合法：DAG 上游引用
@term/OrderItem -> @upstream/[Domain.Order, Blueprint.Checkout]   // 声明上游
@upstream/[Blueprint.Checkout] -> @upstream/[Domain.Order]       // 链式上游
```

**验证规则**：

| 规则 | 错误码 | 触发 |
|---|---|---|
| 引用必须物理存在 | `E_MD_REFERENCE_NOT_FOUND` | `@term/X` 无对应 H3 标题 |
| 引用必须 DAG 无环 | `E_MD_UPSTREAM_CYCLE` | A→B→A 直接 / 间接循环 |
| 上游必须声明 | `E_MD_UPSTREAM_UNDECLARED` | 引用了未在 `@upstream/` 注册的依赖 |
| 上游 Domain 存在性 | `E_MD_UPSTREAM_MISSING_DOMAIN` | 引用的 Domain 文件不存在 |

**@upstream DAG 作用**：

- **编译期校验**：编译 Asset 时构建上下游 DAG，检测循环引用与缺失引用
- **LLM 上下文边界**：AI 读取 Domain 时按 DAG 拓扑加载上游，避免无关上下文注入
- **Insight 反向追溯**：Insight 涌现层可通过反向 DAG 从 frozen.json 追溯到所有上游 Domain

**当前状态**（v0.7-emergence 待办）：

- ✅ `@term/` 语法已落地（mdast 编译器继承 Langium 退役）
- ⚠️ `@upstream/` 声明语法在 v0.7+ 落地
- ⚠️ DAG 循环检测编译期校验 v0.7+ 实现
- ⚠️ LLM 上下文按 DAG 拓扑加载 v0.7+ 实现

## 影响范围

- ✅ ADR-0023 Accept（2026-06-18 落地）
- ✅ 当前 OXL Grammar 已落实 `@` 前缀
- ✅ 跨 term / 跨 Domain 引用语义统一
- 📝 与 RFC-0011 内置 Asset 两层机制联动（`@oxn/` fallback + `@prj/` override）
- 📝 ADR-0030 内容（@upstream DAG 验证）部分采纳——语法已落地，校验机制 v0.7+ 实施

## 相关术语

- [Asset](/glossary/zh-cn/asset-terms.html#asset) — `@prj/` 解析目标
- [Built-in Asset](/glossary/zh-cn/project-terms.html#built-in-asset) — `@oxn/` 解析目标
- [Domain](/glossary/zh-cn/core-terms.html#domain) — `@term/` 解析目标
- [OXL](/glossary/zh-cn/core-terms.html#oxl) — 引用语法承载者

## 相关决策

- [ADR-0023](../../adrs/0023-at-addressing-no-arrow-pointer.md) — `@` 一贯寻址 + `->` 否决（2026-06-18）
- [ADR-0030](../../adrs/0030-term-cross-reference-upstream-dag.md) — `@term/` 跨 term + `@upstream` DAG 验证（2026-06-17，Proposed → RFC 部分采纳）

## Errata

### v1.0.1 (2026-07-26)

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

### 2026-07-27 errata

- **新增 D4 `@upstream` DAG 验证机制**：ADR-0030 内容已并入 RFC 正文。`@term/` 跨 term 引用必须满足 DAG（无环）约束，引入 4 类错误码（`E_MD_REFERENCE_NOT_FOUND` / `E_MD_UPSTREAM_CYCLE` / `E_MD_UPSTREAM_UNDECLARED` / `E_MD_UPSTREAM_MISSING_DOMAIN`）。DAG 循环检测 + LLM 上下文拓扑加载 v0.7+ 落地。
- **frontmatter related 增补**：ADR-0030。
- **影响范围段**：ADR-0030 状态标注 Proposed → RFC 部分采纳。

> 本段用于后续追加修正说明。核心决策自 RFC-0006 Accepted 起冻结。