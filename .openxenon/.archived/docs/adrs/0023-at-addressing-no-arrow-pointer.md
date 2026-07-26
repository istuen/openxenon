# ADR-0023: `@` 一贯寻址哲学 + `->` 伪指针否决

> **来源**：`docs_tmp/domain-md-2.md` (2026-06-18)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L1-OXL 寻址语法

## 决策

`@` 在 OXL 全库语义统一：

- `@oxn/probe/...` — builtin
- `@prj/...` — 项目级
- `@gbl/...` — 用户全局
- `@term/OrderItem` — 同 Domain 跨 term 引用

### `->` 否决

```oxl
// ❌ 否决：伪指针
OrderItem -> Order

// ✅ 改用：纯文本或 `@term/`
"OrderItem"           // 自然语言引用
"@term/OrderItem"     // 物理引用（强制存在校验）
```

## 原因

- `->` 是 OOP 思维在 OXL 中的渗透
- OXL 引用必须是**物理可寻址**（Langium 能解析为实际 AST 节点）
- `->` 不携带位置信息，编译期无法校验

## 后果

- ✅ 跨 term / 跨 Domain 引用语义统一
- ✅ 编译期可做引用完整性校验
- 🔗 当前 OXL Grammar 已落实 `@` 前缀

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-18-domain-md-2.md`