---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0007: Loop 行为观测三维度（命令 + 命中规则 + 反复重试）

> **来源**：`docs_tmp/refactor-4.md` (2026-07-02)
> **抽取日**：2026-07-04
<!-- allow-version -->
> **状态**：Proposed → v0.6.x-observability-roadmap 候选
<!-- /allow-version -->
> **影响层**：E2 Work / Insight 观测

## 决策

Insight 对 Loop 的观测应捕获三个维度：

1. **命令**（intent.action）：AI 在 Align 阶段执行的工具调用序列
2. **命中规则**（rule hit）：命令触发哪些 Domain rule / Blueprint invariant
3. **反复重试**（retry pattern）：verdict FAIL 后 AI 调整策略的模式

## 背景

<!-- allow-version -->
v0.6 IAP 重构识别 Insight E4 的输入应是 Loop 行为的多维指纹，而非单一 verdict。
<!-- /allow-version -->

## 后果

<!-- allow-version -->
- ⚠️ **v0.7-emergence 实际走向"模式库 + 关系图"路径，未沿 Loop 三维观测**
- ❗ ADR 待 v0.6.x observability roadmap 评估是否采纳
<!-- /allow-version -->
- 🔗 当前 `frozen.json` + `probe-stats.json` 仅覆盖静态层

## 候选落地

- `docs/zh-cn/insight.md` 增补 §Loop 观测
<!-- allow-version -->
- v0.6.x observability RFC 新增"行为指纹"模块
<!-- /allow-version -->

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-02-refactor-4.md`