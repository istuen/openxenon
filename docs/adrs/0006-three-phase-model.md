# ADR-0006: 三相模型（静态结构 → Loop → 静态产物）

> **来源**：`docs_tmp/refactor-4.md` (2026-07-02)
> **抽取日**：2026-07-04
<!-- allow-version -->
> **状态**：Proposed → 候选 v0.7+ 落地
<!-- /allow-version -->
> **影响层**：E2 Work / E4 Insight

## 决策

OXN 的物质形态经历**三相循环**：

```
Phase 1: 静态结构（Asset · E1）
   ↓ 工程师写入 / AI 生成
Phase 2: Loop（Work · E2 — 动态过程）
   ↓ Intent → Align → Proof → Round
Phase 3: 静态产物（frozen.json · E3 + Insight · E4）
```

## 背景

<!-- allow-version -->
v0.6 IAP 重构时提出"Loop 是 Work 与 Insight 的核心"，进一步抽象为三相：物质静止 / 物质运动 / 物质静止。借鉴热力学耗散结构理论。
<!-- /allow-version -->

## 后果

- ✅ 资产层（Asset）始终是相对静态的"边界"
- ✅ Loop 阶段所有变化都被 trace 记录
- ✅ frozen.json 是物质再次静止的"凝固点"
- 🔗 Insight E4 涌现层处理 Phase 2 累积的痕迹
- ❗ **未落地**：SSOT docs 未吸收此模型，建议增补到 `docs/zh-cn/core-concepts.md`

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-02-refactor-4.md`
<!-- allow-version -->
- v0.6 RFC：`.openxenon/docs/rfcs/v0.6-iap-refactor-rfc.md`
<!-- /allow-version -->