# ADR-0019: Blueprint Type 范式（task / plan / explore）

> **来源**：`docs_tmp/oxn-type-1.md`, `oxn-type-review-1.md` (2026-05-22)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L1-OXL

## 决策

Blueprint 通过 `type` 字段声明其语义类别：

```oxl
blueprint "my-feature" {
  type "task"       // 单次执行单元
  // type "plan"    // 多次 Round 编排（v0.6+）
  // type "explore" // 探索性 work（无严格 Proof）
  ...
}
```

### 三类语义

| Type | 意图 | Proof 严格度 | v0.6 状态 |
|---|---|---|---|
| `task` | 单次任务执行 | 强制 | ✅ 落地 |
| `plan` | 多 Round 编排 | 强制 | ✅ 落地 |
| `explore` | 探索（草稿 / 研究） | 警告（不强制） | ✅ 落地 |

## 关键设计

- `type` 是 Blueprint **本身**的元数据，**不与 `slot` 混用**
- Skill（AI 编排器）根据 type 选择 round 策略
- `plan-default` Blueprint 可用 `slot "plan_dag"` 数据驱动 DAG

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-22-oxn-type-1.md`