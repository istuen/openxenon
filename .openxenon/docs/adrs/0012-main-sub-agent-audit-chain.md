# ADR-0012: Main/Sub Agent 审计链哲学

> **来源**：`docs_tmp/kernel-infra-4.md` (2026-05-27)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：E2 Work / Skill 设计

## 决策

AI 协作采用 **Main Agent + Sub Agent** 架构，OXN 通过**审计链**而非**预防限制**约束 AI：

```
Engine (OXN) — Main Agent
   ↓ 调 Sub Agent（AI）执行 Align
Sub Agent (AI)
   ↓ 写 trace.jsonl / state.json（自描述）
   ↓ Engine 公证（不评判对错，只记录"发生了什么"）
```

## 反模式

- ❌ "AI 不应该看到 Probe" — 错。AI 必须看到 Probe 才能调用，但所有调用都被 trace。
- ❌ "AI 不应该改 Asset" — 错。AI 可 CRUD，但变更必须经 audit chain 落档。

## 后果

- ✅ 不阻碍 AI 发挥，但保留事后审计能力
- ✅ "AI 行为可解释" 通过 trace 而非 schema 限制
- ✅ slogan："OpenXenon 不生产代码，只生产信任"

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-27-kernel-infra-4.md`
- 关联：`docs/zh-cn/insight.md` 涌现层