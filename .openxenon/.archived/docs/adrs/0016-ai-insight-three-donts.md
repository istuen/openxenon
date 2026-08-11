---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0016: AI 启示"三层不要"

> **来源**：`docs_tmp/insight-1.md` (2026-06-10)
> **抽取日**：2026-07-04
> **状态**：Proposed → llm-prompt.md 候选
> **影响层**：AI 行为指引

## 决策

Insight 涌现层向 AI 反馈时，遵循**三层不要**：

1. **不要无约束自由发挥** — Insight 只描述已发生事实，不预测新可能
2. **不要撞墙反复试** — verdict FAIL 时 Insight 必须指出哪条 rule 被违反，AI 据此调整而非盲重试
3. **不要把没检查当没问题** — Probe 未跑过的部分，Insight 必须标 `UNVERIFIED`，AI 不可当作 PASS

## 候选落点

- `docs/zh-cn/llm-prompt.md` 增补 AI 行为指引
- `instruction.md` AI 段（`oxn-work` Skill）
- Insight CLI 输出格式（`oxn insight show`）

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-10-insight-1.md`