---
entity: oxp
id: OXP-0003
version: 1.0.0
status: Accepted
date: 2026-07-22
promoted-from: .openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md
related:
  - ADR-0068: .openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md
  - ADR-0067: .openxenon/drafts/rfc/0067-no-judgment-principle.md
synced-at: 2026-07-22
---

# OXP-0003: Daemon 职责边界——运行时状态监听 + 事件监听

> **类型**：OXP (OpenXenon Proposal)
> **来源**：ADR-0068（2026-07-21 grilling session）
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-22 首批 OXP promote

## 摘要

定义 OXN Engine 后台守护进程（Daemon）的**3 项职责边界**——彻底分离 Daemon 与 Kernel 的权能，防止 Daemon 越界（行政不能给自己盖章，司法不能立法）。

## 决策要点

### D1: Daemon 的 3 项职责

| 职责 | 描述 | 实现 |
|---|---|---|
| **运行时状态监听** | Work 长时间未变化（如 5 分钟无 trace 写入）→ 通知工程师 | `work-state-monitor.ts` |
| **事件监听** | Probe DEVIATED / INCONCLUSIVE → 通知工程师 | `probe-event-listener.ts` |
| **CLI socket 事件** | CLI 订阅 Daemon 事件（如 Daemon 主动推送通知）| `socket-server.ts` |

### D2: Daemon 不做的 4 件事

| 不做 | 理由 |
|---|---|
| **不监听文件系统** | 文件监听属于 Infra 职责，Daemon 不直接 fs.*（ADR-0003 + ADR-0068） |
| **不阻断 Work** | Daemon 通知不阻断，OXN 不判（ADR-0067） |
| **不修改 Kernel 规则** | 司法不能立法（oxn-engine-domain inv-3） |
| **不宣布 Work 完成** | Infra 不能绕过 Daemon 自己宣布 Work 完成（oxn-engine-domain inv-3） |

### D3: 硬阻断 vs 软警告分类

Daemon 的**通道构建期**硬阻断（结构错误/拓扑错误）由 Engine 守卫负责（lock 阶段），不属于 Daemon 职责。Daemon 职责限于**运行时软通知**。

| 类别 | 处理 | 责任方 |
|---|---|---|
| 结构错误（如 DAG 有环）| 硬阻断（lock 阶段拒绝）| Engine 守卫 |
| 拓扑错误（如 Blueprint 引用不存在）| 硬阻断（lock 阶段拒绝）| Engine 守卫 |
| 边界越界（如 Probe DEVIATED）| 软警告（Daemon 通知）| Daemon 职责 |
| Legacy ref 漂移 | 软警告（Daemon 通知）| Daemon 职责 |

## 影响范围

- ✅ ADR-0068 Accept
- ✅ oxn-engine-domain.md Daemon desc 重写
- ✅ oxn-cli-domain.md Daemon 引用同步
- ✅ glossary/engine-terms.md Daemon 同步
- 📝 代码层 Daemon 3 模块拆分（work-state-monitor / probe-event-listener / socket-server）跟进 v0.7.x

## 相关决策

- [ADR-0068 完整原文](../../.openxenon/drafts/rfc/0068-daemon-responsibility-boundary.md)
- [ADR-0067 彻底不判贯彻](../../.openxenon/drafts/rfc/0067-no-judgment-principle.md) — Daemon 不阻断的核心理由
- [oxn-engine-domain.md inv-3](../../.openxenon/assets/domains/oxn-engine-domain.md) — Kernel/Infra/Daemon 司法行政分离

## Errata

> 本段用于后续追加修正说明。核心决策自 OXP-0003 Accepted 起冻结。