---
title: 洞察术语
---
synced-at: 2026-07-22
source: oxn-insight-domain.md
---

# 洞察术语

> 适用：E4 涌现层、跨 Proof 累积、审计追踪、Insight Pool。

## 核心概念

### Insight
- Insight 是 E4 涌现层。整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。

### Pattern
- 跨 Work 模式识别与持久化（v0.7 新增），存 `.openxenon/drafts/insight-patterns/`；CLI `oxn insight patterns list/show/promote/archive`。

### CrossProofAccumulation
- 跨 Proof 累积统计（数据源 `.openxenon/.cache/probe-stats.json`），用于 E4 综合推理的"统计事实底座"。Probes 不入 catalog（AI 盲区）。

### ModeRecommendation
- 基于跨 Work 模式的 Work 模式推荐（domain + occurrences≥3 → suggestedInvariant + confidence）；强约束：永不自动 apply，工程师 review/approve 后手动应用。

## 审计与计数

### AuditTrail
- Asset 修改历史审计链（version + date + author + changes[]），自动维护、不可篡改；Asset 演进必填引用旧版。

### Citation
- 资产反向引用计数 + 影响半径（impactRadius: low/medium/high/critical），自动维护、归档保留。

## 流动性分类

### Pool
- 5 类 Intent Pool union（research / design / issue / audit / journal），物理位置 `.openxenon/drafts/{kind}/<slug>.md`；heading 模板互为独立 spec。

### Raw
- Insight 原始池（生命周期阶段 1），数据源 trace.jsonl 结构化事件（asset.violation / intent.drift）；状态 raw，未审核。

### Audit
- Insight 审核池（生命周期阶段 2），从 raw promote（工程师手动）；资产草案 `.openxenon/assets/{kind}/{name}.oxn.draft`；AI 永不自动覆盖 Asset。

### Judged
- Insight 已判定池（生命周期阶段 3+4），状态 approved/applied/archived；applied 后 Asset 更新 + planLock 重算。

## 简明对照

| 阶段 | 名称 | 状态 |
|---|---|---|
| 1 | Raw | 未审核 |
| 2 | Audit | 工程师手动 promote |
| 3 | Judged · approved | 已判定 |
| 4 | Judged · applied | 已落实 |
| 5 | Judged · archived | 已归档 |
