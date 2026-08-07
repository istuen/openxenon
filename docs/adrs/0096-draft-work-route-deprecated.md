# ADR-0096: Draft → work 直达路由废弃

v0.6.0 / D3 / 2026-08-07

## Status
Accepted（与 D3 同步落地）。

## Context
原 `oxn draft promote --target work` 把探索稿直接提升为 `.openxenon/works/<id>/work.md`（workId frontmatter + IAP 4 phase 入口）。但与 D2 引入的 Goal 概念重叠：Work IAP 准备阶段（Goal）与 Work IAP 执行阶段（Works）共一段位面，导致 Draft → work 跳过 Goal 中间层。

## Decision
`oxn draft promote --target work` 退役。CLI + Engine 双层拒收 `OXN_DRAFT_PROMOTE_TARGET_WORK_REMOVED`。统一链路：`oxn draft promote --target goal --goal-slug=<slug>` → Goal entry → D5+ `oxn goal work <slug>` 创建 Work IAP。

## Consequences
- CLI 拒收目标：`--target=work` 即抛（Work A 落地）；
- Engine Phase 2 拦截 `target === 'work'` 抛相同错误码（双层守门）；
- 提示文案引导用户走 goal 链路；
- DraftTarget 实际可选收窄为 3（rfc/asset/goal）—— 后续 1 版本兼容期后 `promote-work` sub-target 移除。
