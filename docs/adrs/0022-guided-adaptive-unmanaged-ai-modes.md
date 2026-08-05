# ADR-0022: Guided / Adaptive / Unmanaged 三模式 AI 执行

> **来源**：`docs_tmp/next-version-1.md`, `next-version-2.md` (2026-05-28)
> **抽取日**：2026-07-04
<!-- allow-version -->
> **状态**：Partially Adopted → v0.7-emergence 候选
<!-- /allow-version -->
> **影响层**：AI 协作 / Hall（研讨厅）

## 决策

AI 执行 Work 时按工程师监督程度分三模式：

| 模式 | 监督 | 验证 | 适用 |
|---|---|---|---|
| **Guided** | 全程（默认） | 严格 Probe | 生产 |
| **Adaptive** | 跳过 action 重放但仍校验 | 警告级 | 调试 |
| **Unmanaged** | 无 | 仅 lint | 实验（Hall 告警） |

## 当前状态

<!-- allow-version -->
- v0.6.1 默认走 Guided
<!-- /allow-version -->
- Adaptive / Unmanaged 仅在 Hall 实验性启用
- 未落实：reputation.json / 模式自动切换

## 候选落地

<!-- allow-version -->
- `docs/zh-cn/roadmap.md` v0.7+ 段
<!-- /allow-version -->
- `oxn-work --mode adaptive|unmanaged` CLI flag

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-28-next-version-1.md`