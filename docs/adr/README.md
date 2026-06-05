# ADR (Architecture Decision Records)

> 记录 OpenXenon 关键架构决策。每个 ADR 一篇文件，**不可修改**（如有更新则新建并 supersede）。

## 格式

```
adr/
├── README.md                       # 本文件
├── template.md                     # ADR 模板
├── 0001-four-layer-constitution.md
├── 0002-intent-align-paradigm.md
├── 0003-domain-as-bounded-context.md
├── 0004-dsl-grammar-choice.md
└── 0005-yaml-deprecation.md
```

## 命名约定

- `NNNN-<kebab-case-title>.md`
- 编号**单调递增**，不可复用
- 文件创建后**不可修改**；如需更新，新增 `NNNN-<title>.md` 并在原文件中加 `**Superseded by 0NNN**`

## 索引

| # | 标题 | 状态 | 日期 |
|---|---|---|---|
| 0001 | 四层架构宪法（L0-L3） | Accepted | 2026-06 |
| 0002 | Intent-Align 范式 | Accepted | 2026-06 |
| 0003 | Domain 作为 DDD 限界上下文 | Accepted | 2026-06 |
| 0004 | DSL 选择 Langium 语法 | Accepted | 2026-06 |
| 0005 | YAML/JSON Blueprint 废弃 | Accepted | 2026-06 |
| 0006 | L2 命名为 Module 避免与 Domain 实体混淆 | Accepted | 2026-06 |

## 下一阶段

- ADR-0006: Probe 信息隐藏原则
- ADR-0007: 双层 state.json 设计
- ADR-0008: ref 二作用域优先级（@prj > @oxn）
- ADR-0009: 全量隔离（task 只看 align 的 domain）
