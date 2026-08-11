---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0012: Main/Sub Agent 审计链哲学

> **来源**：`docs_tmp/kernel-infra-4.md` (2026-05-27)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **修订**：2026-07-21 — **AuditChain 术语废弃**（详见 ADR-0066），决策内容保留并归入 OXN Engine desc
> **影响层**：E2 Work / Skill 设计

## 决策

AI 协作采用 **Main Agent + Sub Agent** 架构，OXN 通过**事后审计**而非**预防限制**约束 AI：

```
Engine (OXN) — Main Agent
   ↓ 调 Sub Agent（AI）执行 Align
Sub Agent (AI)
   ↓ 写 trace.jsonl / state.json（自描述）
   ↓ Engine 记录（不评判对错，只记录"发生了什么"）
```

> **2026-07-21 修订**：术语"AuditChain"废弃（ADR-0066）。决策内容"事后审计而非预防限制"保留，归入 OXN Engine desc。本 ADR 保留决策内容。

## 哲学原则

- **事后审计（post-hoc audit）**：OXN 不预防 AI 行为（不沙箱），而是记录 AI 行为到 trace.jsonl
- **可重放**：删 state.json 仅凭 trace.jsonl 可重放完整过程
- **可解释**：AI 行为通过 trace 而非 schema 限制来解释

> **2026-07-21 修订**：原 AuditChain 描述归入 OXN Engine desc。

## 反模式

- ❌ "AI 不应该看到 Probe" — 错。AI 必须看到 Probe 才能调用，但所有调用都被 trace。
- ❌ "AI 不应该改 Asset" — 错。AI 可 CRUD，但变更必须经 audit chain 落档。
- ❌ "Daemon 阻止 Probe FAIL 的 Work 进入 done"（已被 ADR-0067 废弃）——错。OXN 只记录不阻断。

## 后果

- ✅ 不阻碍 AI 发挥，但保留事后审计能力
- ✅ "AI 行为可解释" 通过 trace 而非 schema 限制
- ✅ 与传统"沙箱"的区别：

| 维度 | 传统沙箱 | OXN 事后审计 |
|---|---|---|
| 约束时机 | 预防（pre-emptive） | 事后（post-hoc） |
| 失败处理 | 拒绝执行 | 记录并继续 |
| 哲学 | "不该做的不能做" | "做了什么都被记住" |
| AI 自主性 | 低（被约束） | 高（被信任 + 可审计） |

- ✅ slogan：**"OpenXenon 不生产代码，只生产证据"**

> **2026-07-21 修订**：原 slogan"只生产信任"改为"只生产证据"（与 ADR-0066 一致）。

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-27-kernel-infra-4.md`
- 关联：`docs/zh-cn/insight.md` 涌现层
- **关联 ADR-0066 术语精简**（AuditChain 废弃，决策内容保留）
- **关联 ADR-0067 彻底不判贯彻**（不阻断，只记录）