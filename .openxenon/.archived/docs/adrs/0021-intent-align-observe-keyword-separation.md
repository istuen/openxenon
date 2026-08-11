---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0021: Intent / Align / Observe 四关键字分离

> **来源**：`docs_tmp/intent-align-1.md` 至 `intent-align-5.md` (2026-05-29)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L1-OXL 语法

## 决策

OXL 关键字按 4 个语义轴分离（避免 `type` 重载歧义）：

| 关键字 | 含义 | 载体 | 谁写 |
|---|---|---|---|
| `kind` | Blueprint 类别（task/plan/explore） | Blueprint 顶层 | 工程师 |
| `intent` | Part 能力声明（"我提供什么"） | Part 块 | 工程师 |
| `align` | 能力实现（"我具体怎么做"） | Part 块 | AI / 工程师 |
| `observe` | Probe 维度（"我测什么"） | Probe 块 | 工程师 |

## 反模式（否决）

- ❌ `type` 重载（既表 Blueprint 类别，又表 Part 能力）
- ❌ `role` / `port` 命名（语义不清）
- ❌ `Blueprint type task` 隐式（应显式 `kind "task"`）

## 后果

- ✅ 关键字语义无歧义
- ✅ 编译期可静态校验
- 🔗 当前 OXL Grammar 已采纳

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-29-intent-align-1.md`