---
entity: skeleton
target-entity: goal
---

# Goal: <theme>

> Goal = IAP 准备阶段承诺单元；与 Work（IAP 执行）正交。
> v0.5.0 / D2 起由 `oxn draft promote --target goal --goal-slug <slug>` 从 Draft 派生。

## Goal Frontmatter (派生后)

```yaml
---
id: <slug>                    # kebab-case
theme: <human-readable>
priority: low | medium | high | critical
status: planned
created-at: YYYY-MM-DD
scheduled-version: ~          # 改语义："未绑版本"（Goal 天然晚绑）
synced-at: YYYY-MM-DD
branch: feat/goal-<slug>      # 新增：强制显式分支名（auto git checkout -b）
source: draft                 # 本次 D2 路径固定为 draft（design-version-iteration-redesign.md D2）
source-ref: <draft-path>      # 若 source=draft，记录源 Draft 路径
---
```

- 出池条件：cut forcing function 触发（见 design-version-iteration-redesign.md §2.4）。
- 1:1 with branch：每个 Goal 一条 `feat/goal-<slug>` 分支（auto 创建于 promote 时）。
- 1:1 with Work：每个 Goal 经 `oxn goal work <slug>` 创建对应 Work（v0.5.0 后）。

## Intent

TODO: 描述 Goal 要回答什么问题 / 解决什么边界（一两句话）。

## Why

TODO: 为什么这个 Goal 重要；与已存在的 Goal/Work/RFC 的关系。

## Acceptance

TODO: Goal finalize 的判定标准（Domain proof PASS → 立即 cut 当前 Version）。

## References

- 源 Draft: `<source-ref>`（由 promote 注入）
- 关联 RFC / ADR: TODO
