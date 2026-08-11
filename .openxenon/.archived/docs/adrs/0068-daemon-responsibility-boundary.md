---
entity: adr
version: 1.0.0
status: Archived
date: 2026-07-22
supersedes: null
superseded-by: null
promoted-to: docs/rfc/zh-cn/OXP-0003-daemon-responsibility-boundary.md
related:
  - .openxenon/docs/adrs/0034-work-precise-block-not-daemon-cascade.md
  - .openxenon/assets/domains/oxn-engine-domain.md
  - .openxenon/assets/domains/oxn-work-domain.md
  - ADR-0067 彻底不判贯彻
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0068: Daemon 职责边界——运行时状态监听 + 事件监听

> **状态**：✅ Accepted
> **日期**：2026-07-21
> **来源**：2026-07-21 grilling session
> **影响层**：L3-Tools（`src/daemon/` 残留）+ L2-Work + L2-Proof

## Context

OpenXenon 通道设计原则：
- **软契约**：AI 自愿走 OXN 才有证据；不走 = 通道外，工程师自负
- **未来 Daemon 强化**：但当前不预设监听范围

当前 oxn-engine-domain.md Daemon desc 写：
> "OXN Engine 后台守护进程；负责 Engine 常驻模式 + 文件监听 + Work 追踪 + Probe FAIL 阻止。"

这与收敛的"彻底不判"原则冲突（"Probe FAIL 阻止"是裁判+阻断行为），也与"软契约"原则冲突（"文件监听"接近 Daemon 全局崩溃）。

ADR-0034（已 Adopted）决策"Work 前置精准阻断 vs Daemon 全局崩溃"——否决了 Daemon 全局崩溃路线。当前需要明确 Daemon 的具体职责边界，避免与 ADR-0034 冲突。

## Decision

### Daemon 三项职责

Daemon 监听以下三类事件：

1. **Work 状态变化**（运行时状态监听）：
   - Work 长时间未变化 → AI 丢失信号（脱通道），通知工程师
   - Work 状态异常（stuck / orphan / error）
   - 触发条件：`state.lastUpdate < now - threshold` 或状态机异常

2. **Task Probe 结果事件**（事件监听）：
   - ProbeOutcome DEVIATED 时通知工程师（不阻断）
   - ProbeOutcome INCONCLUSIVE 时通知工程师
   - 触发条件：`outcome.deviated > 0` 或 `outcome.inconclusive > 0`

3. **OXN CLI socket 事件**（事件监听）：
   - CLI → Daemon 的 socket 调用
   - Daemon → CLI 的事件推送
   - payload schema 由 Engine 包统一提供

### 不监听的范围

- **不监听文件系统**：与 ADR-0034 兼容——文件系统级监听属于"Daemon 全局崩溃"范畴，已否决
- **不阻断 Work 进入 done**：Probe DEVIATED 只通知工程师，不阻断（ADR-0067 D5）
- **不修改 Kernel 规则**：inv-7 daemon-no-rule-mutate 保留
- **不宣布 Work 完成**：inv-6 infra-no-self-done 保留

### Daemon desc 重写

oxn-engine-domain.md Daemon H3 term desc 改为：

> "OXN Engine 后台守护进程；负责运行时状态监听（Work 长时间未变化 → 通知工程师）+ 事件监听（Probe DEVIATED/INCONCLUSIVE 通知 + CLI socket 事件）；不监听文件系统，不阻断 Work，不修改 Kernel 规则。"

## Consequences

### 正面

- **与 ADR-0034 兼容**：Daemon 只监听 OXN 运行时状态与事件，不监听文件系统
- **与 ADR-0067 兼容**：Probe DEVIATED 时只通知不阻断，遵守"彻底不判"
- **软契约强化**：Daemon 检测 AI 丢失信号（Work 长时间未变化），帮助工程师发现脱通道情况
- **职责清晰**：3 项明确职责 + 4 项不监听范围，避免 Daemon 膨胀

### 负面 / 风险

- **实现成本**：Daemon 需要实现 Work 状态变化检测（threshold）+ Probe 事件监听 + socket 通信
- **Work 长时间未变化阈值**：需要明确（建议默认 5 分钟，可配置）
- **通知机制**：当前无统一通知渠道；需要 CLI 输出 + 未来 Hall 面板

### 衍生

- **Daemon 模块拆分**：建议 `src/daemon/` 拆分为 `work-state-monitor.ts` + `probe-event-listener.ts` + `socket-server.ts`（v0.7+ RFC）
- **CLI 增强**：CLI 订阅 Daemon 事件，DEVIATED 时打印警告
- **Hall 面板**：v0.7+ Hall 面板展示 Work 状态异常列表

## Alternatives Considered

- **保留文件监听 + Probe FAIL 阻止**：当前 desc。与 ADR-0034 冲突，与"彻底不判"冲突——否决
- **完全不做 Daemon**：依赖 CLI 轮询。与"软契约"原则冲突（AI 丢失无信号）——否决
- **Daemon 全权接管 Work 生命周期**：Daemon 负责 Work 的 create/run/finalize。违反 L0-L3 分层（Daemon 是 L3，Work 是 L2）——否决

## References

- [ADR-0034 Work 前置精准阻断 vs Daemon 全局崩溃](./0034-work-precise-block-not-daemon-cascade.md)
- [ADR-0067 彻底不判原则的代码贯彻](./0067-no-judgment-principle.md)
- [oxn-engine-domain.md](../../../assets/domains/oxn-engine-domain.md) — OXN Engine 业务领域
- [oxn-work-domain.md](../../../assets/domains/oxn-work-domain.md) — Work 业务领域
