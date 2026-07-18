# ADR-0009: 架构守护测试模式 + Trace-before-State 写入顺序

> **来源**：`docs_tmp/kernel-test-3.md` (2026-05-28)
> **抽取日**：2026-07-04
> **状态**：Adopted（部分）
> **影响层**：L0 守护 / Work 物理层

## 决策

### 架构守护测试（Architectural Guard Test）

CI 必须包含**反向 import 测试**：Kernel 不能 import L1+，Kernel 不能用 `fs/net/child_process`。当前由 `bun scripts/validate-dependencies.ts` + `bun run lint`（含 `no-restricted-imports`）强制。

### Trace-before-State 写入顺序

写 `state.json` 前必须先 append `trace.jsonl` 事件：

```ts
// ❌ 禁止
fs.writeFileSync(statePath, ...)

// ✅ 必须
fs.appendFileSync(tracePath, eventJsonl)
fs.writeFileSync(statePath, ...)
```

### 原因

state 是快照，trace 是历史。若 state 写成功但 trace 未写，崩溃后无法解释 state 来源。Trace 在前意味着：state 永远有迹可循。

## 后果

- ✅ Kernel 真空有 CI 守卫
- ✅ state 变更可重放
- ⚠️ 异步 IO 顺序需在 `work run` 关键路径严格保持

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-28-kernel-test-3.md`
- AGENTS.md L0 宪法表