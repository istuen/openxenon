---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0017: probe-stats.json 跨 proof 累积机制

> **来源**：`docs_tmp/insight-1.md` (2026-06-10)
> **抽取日**：2026-07-04
> **状态**：Partially Adopted
> **影响层**：E3 Engine / E4 Insight

## 决策

`probe-stats.json`（位于 `.openxenon/.cache/`）累积跨 proof 跨 work 的 Probe 行为数据：

```json
{
  "fs-exists": {
    "totalRuns": 128,
    "passRate": 0.96,
    "avgDurationMs": 12,
    "lastFailure": "2026-06-30T12:34:56Z",
    "unstableContexts": ["path-contains-spaces"]
  }
}
```

## 累积规则

- 每次 `work run` 完成 → append 一条 stats 记录
- Probe 改名 / 删除 → stats 保留 90 天后归档（不立即删）
- 不稳定 Probe（pass rate < 0.8 且 totalRuns > 20）→ Insight 自动警告

## 现状

- ✅ 文件位置 `.openxenon/.cache/probe-stats.json` 已确立
- ⚠️ 累积细节（append / retention / 不稳定告警）未在 docs 显式

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-10-insight-1.md`
- 关联：`docs/zh-cn/proof.md` §6