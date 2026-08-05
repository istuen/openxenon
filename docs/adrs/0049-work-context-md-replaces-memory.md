# ADR-0049: Work/context.md 取代 Memory L1

<!-- allow-version -->
> **来源**：v0.6.3 Asset Paper Schema RFC §3
<!-- /allow-version -->
> **抽取日**：2026-07-05
> **状态**：Adopted
> **影响层**：L2-Work（context.md schema + lifecycle）

## 决策

Work 内动态上下文不再走 `.openxenon/memory/`，而是使用 `works/<work-id>/context.md`（Work 内的"短期记忆"）。

## 决策背景

<!-- allow-version -->
v0.7.x Memory RFC 反弹后，Work 内"易失信息"（当前 Round、临时推导、工具结果）需要新承载：
<!-- /allow-version -->

| 原方案（被反弹）| 新方案（本 ADR）|
|---|---|
| `.openxenon/memory/entries/<id>.md`（Memory L1）| `works/<work-id>/context.md`（Work 内）|
| 全局 hash + TTL 衰减 | Work 生命周期（finalize 后冻结）|
| 独立模块（`oxn memory ingest`）| 复用 Work 流程（自动生成）|

## context.md 模板

```markdown
<!-- works/<work-id>/context.md -->
---
workId: w-fix-payment-idempotency
intent: 修复支付网关回调的幂等性
createdAt: 1731628800000
status: aligning
currentRound: 3
references:                        # 引用 Asset（不复制内容，只存指针）
  - assets/domain/payment-core.oxn
  - assets/stack/nodejs.oxn
  - assets/library/axios-docs.oxn
---

## Intent
[工程师声明的意图]

## Roadmap
- [x] 1. 读取 payment/service.ts
- [x] 2. 分析幂等性漏洞
- [~] 3. 编写单元测试  ← current
- [ ] 4. 修复代码
- [ ] 5. 运行 Proof

## Loop History（仅摘要，不全量历史）
### Round 1
- User: 启动 Work
- AI: 读取代码 → 发现漏洞位置

### Round 3 (current)
- User: 写测试
- AI: 写测试用例
- Tool: write_file(tests/payment/idempotency.test.ts)
- Key Observation: 现有代码未去重

## Key Observations
- 支付回调未使用 idempotency_key
- 现有 fix 方案：参考 library/axios-docs.oxn §3.2
```

## KV Cache 提示词结构

```text
[1. System Instruction]              ← Stable
[2. assets/* (Stable Prefix)]       ← Stable per-project
[3. works/<id>/context.md (Stable per-Work)]   ← Stable per-Work
[4. Loop Tail (Dynamic)]             ← 每轮追加
```

**关键工程约束**：
- ① ② 字节级稳定（按字母序排序，避免 Map 遍历）
- ③ 在 Work 周期内稳定（仅关键节点变化）
- ④ 只追加不回写（保证前 3 段前缀稳定）

## Work 生命周期中 context.md 的演变

```
Work 启动 → 自动生成空 context.md（仅 Intent + Roadmap）
   ↓
Loop N（每轮）→ 追加到 Loop History + Key Observations
   ↓
Work finalize → context.md 冻结（不再修改）
   ↓
<!-- allow-version -->
[可选] 写一份 summary 到 .openxenon/works/<id>/memory-summary.md（v0.8.0 计划）
<!-- /allow-version -->
```

## 后果

<!-- allow-version -->
- ✅ 取代 v0.7.x Memory L1（无需新模块）
<!-- /allow-version -->
- ✅ 自动获得 Work 的 8 阶段流程（validate/lock/run/submit/finalize）
- ✅ Work finalize 后 context.md 冻结（满足"易失信息"特性）
- ✅ KV Cache 优化：context.md 字节级稳定 → Stable Prefix
- ⚠ context.md 文件需保证序列化顺序（避免 hash 漂移）

## 反模式

- ❌ context.md 回写项目级 Asset 内容（破坏 KV Cache 前缀稳定）
- ❌ context.md 包含完整 Loop 全文（Token 爆炸）
- ❌ context.md 包含时间戳等易变元数据到前缀部分

## 参考

<!-- allow-version -->
- v0.6.3 Asset Paper Schema RFC §3
- ADR-0050 Onboarding via Starter Work
- v0.7.x Memory RFC 反弹记录（archive/）
<!-- /allow-version -->