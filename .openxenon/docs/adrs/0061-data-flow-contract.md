---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-17
supersedes: null
superseded-by: null
related:
  - .openxenon/docs/rfcs/v0.7.3-ideal-data-flow-rfc.md
  - .openxenon/docs/adrs/0054-three-boundary-framework.md
  - .openxenon/docs/adrs/0055-blueprint-as-composition-template.md
  - .openxenon/docs/adrs/0060-domain-vocabulary-boundary.md
  - .openxenon/assets/blueprints/oxn-blueprint.md
  - .openxenon/works/v073-ideal-data-flow/work.md
---

# ADR-0061: Blueprint → Work → Task 数据流契约

> **状态**：🟢 Accepted（v0.7.3 P0 落地，P1-P8 渐进落地）
> **日期**：2026-07-17
> **来源**：[v0.7.3-ideal-data-flow-rfc §2 + §3](../../rfcs/v0.7.3-ideal-data-flow-rfc.md)
> **影响层**：L2-Work（`packages/engine/src/Work/`）+ L2-Proof（`packages/engine/src/Proof/`）+ L1-OXL（`packages/engine/src/oxl/summary-extractors.ts`）
> **承接 Work**：[`v073-ideal-data-flow`](../../../works/v073-ideal-data-flow/work.md)

## 背景

v0.6.1 ADR-0055 已规定 Work `## Refs` 只接受 `kind: blueprint`，Domain/Workflow/Stack 通过 Blueprint 间接引用。v0.7.0 ADR-0060 D4 又规定同名特性词（如 OXL）可在 root + 多个子 Domain 多视角共存。但 runtime 实现层未跟上：

1. **F1**：`work-context-builder.ts` 不读 `blueprints.json`，BlueprintIR 完全不进 runtime
2. **F2**：`work-context-builder.ts:209-223` 只读 Domain `externals`，丢弃 `language{terms,bans,invariants}`
3. **F3**：`task.ts:34` `domain: string | null` 是单值字段，Task 只能绑 1 个 Domain 视角
4. **F4**：Blueprint `observe` 与 Task `## Probes` 无 lock 期联动；Workflow `## Slots` DAG 与 Task `## deps` DAG 互不校验

ADR-0055 §D2 + ADR-0060 §D4 的"多视角组合"是**纸面规范**，AI 执行 Work 时实际只看到单 Domain 视角的 term desc，Blueprint 编排信息完全丢失。

## 决策

### D1：Task.domain 演进策略 — 保留主/背景双视角【a】

`task.md ## Refs - domain: X` 保持单值字段（不动 TaskIR schema），但语义升级为"**主对齐视角**"；`Blueprint.use.domain[]` 自动派生其余 Domain 为"**背景视角**"。

理由：保留 TaskIR schema 兼容性（不动 `task.ts:31-38`）；让工程师在 Task 设计期显式选 1 个主对齐视角，避免"多 Domain 同名 term 谁说了算"的歧义；背景视角仅作 desc 补充，不参与 lock 期校验的"主视角"语义。

### D2：多 Domain 同名 term 注入格式 — 块状 + 视角标注【a】

每个同 name term 在 `## Allowed Language ### Terms` 下聚合为一个 H4 子节，下方按 Domain 视角列多行（`[Domain 名]` 行内前缀）。

理由：让 AI 看到的多视角 desc 是结构化分块（不是 concat），避免 AI 把不同视角混为一个断言；`[Domain 名]` 标注与 ADR-0060 §D8 视角隔离原则一致。

### D3：Boundary.observe 与 Task.probes — lock 期 hard-check【a】

`task.md ## Probes ### X - ref: @oxn/probes/Y` 中的 Y 必须 ∈ Task 所对齐 slot 的 `Blueprint.boundaries[].observe[]`。lock 期校验失败 → `IAP_INTENT_PROBE_OUT_OF_BOUNDARY` (YIELD_TO_HUMAN)。

理由：让 Blueprint 真正成为 Probe 标准的 SSOT（替代 `oxn-work-domain.inv-25` 的纯文本 invariant 约束）；让 Blueprint 编排运行时生效，回归 ADR-0054 三边界框架设计意图。

### D4：Workflow.slot DAG 与 Task.deps DAG — 闭包校验【a】

Workflow `## Slots` 形成 slot DAG（slot.deps）；Task `## Tasks` 内每个 task.deps 必须对应 Workflow slot DAG 中**存在**的依赖边。lock 期校验：Task DAG ⊆ Workflow slot DAG 拓扑闭包。

理由：让 Workflow 重新成为"执行模板"（ADR-0054 设计意图），不只是文档元数据；不阻断 Work 内部 task 编排自由（task 可比 slot 多但 DAG 必须可被 slot DAG 表达）。

### D5：Stack.tools 注入 Probe 上下文 — runtime 注入 ProbeRunner【a】

`work-context-builder` 把 `Blueprint.use.stack` 解析得到的 `StackIR.tools` 传给 ProbeRunner；ProbeRunner 在执行 `@oxn/probes/shell-exec` 等需要环境的 Probe 时，把 tool 的 `version/command/config` 与 task 内 `params` 合并。

理由：工程师不再在 `task.md` 手写 `bun run typecheck`，只写 `command: run typecheck`，runtime 自动注入 `bun` 前缀 + 锁文件路径 + 超时上限；Stack 资产回归"实现层约束"语义（ADR-0054）。

### D6：Work `## Refs` 兼容性 — 旧 `kind: domain` deprecation warn【推荐】

ADR-0055 已规定 Work `## Refs` 只接受 `kind: blueprint`，但 `trust-closure/work.md` 等历史 Work 仍有 `kind: domain`。

方案：
- v0.7.3 lock 期：检测到 `kind: domain` 触发 `OXN_WORK_LEGACY_DOMAIN_REF` 软警告（不阻断 lock，记录到 diagnostics）
- v0.8.0 lock 期：硬阻断（`IAP_INTENT_LEGACY_DOMAIN_REF_BLOCKED`）

理由：给历史 Work 一个 migrate 窗口；不立即 hard cut 防止 v0.7.3 release 阻碍。

### D7：PlanLock hash 公式扩展 — 不动公式【a】

`plan-hash.ts:159 hashWorkPlan` 当前算 4 个 hash（workMd / blueprints / tasks / all），其中 `blueprintsHash` 已是 composite（含 Blueprint + 3 边界）。无需新加 hash 字段。

只需让 `work-context-builder.ts` 把 `works/<w>/blueprints.json` 真正读出来（当前根本不读），从中反序列化 `BlueprintUse` + `BlueprintBoundary[]` + 边界文件路径列表，加载各边界文件 IR。

理由：不动 PlanLock schema 避免破坏向后兼容；`blueprints.json` 已是 SSOT 的 Blueprint 编排快照，drift 由现有 hash 公式保护。

## 后果

### 正面

- **ADR-0054 三边界框架**首次实现 runtime 闭环：Blueprint / Workflow / Stack 不再是文档元数据，进入实际注入路径
- **ADR-0055 §D2 Blueprint 组合模板**：`BlueprintUse`/`BlueprintBoundary` 在 lock 期后真正消费
- **ADR-0060 §D4 + §D8 多视角 + 视角隔离**：AI 上下文中的 `## Allowed Language` 多视角块成为默认
- **Token 预算**：多视角注入净增量 ~+1500-3000 tok/Task（按 §5.1 缓解策略），对 32k 模型占 5-10%

### 负面 / 风险

- **P3 多视角冲击**：未做 §5.1 缓解策略时可达 +8000 tok/Task → 需 CLI `--context-mode lean` 切回单视角
- **P5 DAG 校验过严**：`trust-closure` 等历史 Work 的 task DAG 可能违反 slot DAG → 需 `--skip-workflow-dag-check` escape hatch
- **P6 Stack 注入副作用**：Probe 结果可复现性需验证（仅注入 `version`/`timeout`/`lockfile` 三项环境元数据，不动 `command` 主参数）
- **D6 deprecation 窗口**：trust-closure 等历史 Work 的 `kind: domain` ref 在 v0.7.3 仅 warn，v0.8.0 hard cut → 需提前 migrate

### 落地路径（v0.7.3 Phased Landing）

| Phase | 内容 | 版本 |
|---|---|---|
| P0 | RFC 定稿 + 本 ADR 立法 | v0.7.3-alpha.1 |
| P1 | `work-context-builder.ts` 读 `blueprints.json`，注入 `BlueprintIR` + 边界 Domain IR（F1+F2） | v0.7.3-alpha.2 |
| P2 | Domain 注入路径 regex → mdast 切换（修 `## Terms:` 后缀 + multiline `- desc: \|` 两个 bug） | v0.7.3-alpha.2 |
| P3 | Task 多 Domain 主/背景视角注入；`## Allowed Language` 渲染格式升级（D1+D2） | v0.7.3-alpha.3 |
| P4 | Boundary.observe 与 Task.probes lock 期校验（F4 part 1 + D3） | v0.7.3-alpha.3 |
| P5 | Workflow.slot DAG 与 Task.deps DAG 闭包校验（D4） | v0.7.3-beta.1 |
| P6 | Stack.tools 注入 ProbeRunner（D5） | v0.7.3-beta.1 |
| P7 | Work `## Refs` 旧 `kind: domain` deprecation warn（D6） | v0.7.3 |
| P8 | ADR-0054/0055/0060 标注"runtime 已实现"（移除纸面规范标记） | v0.7.3 |

### Token 预算缓解策略（P3 实现）

- **背景视角仅注入与主视角同名 term 的 desc**：把 token 增量压到 +1500-3000 tok/Task
- **按 Blueprint.use 顺序截断**：前 3 个背景 Domain 满注入，4+ 仅 term name 列表
- **CLI flag `--context-mode lean`**：切回单 Domain 模式（保留兼容路径）

## 验收门槛

- P1：`oxn work context --task X` 输出含 `blueprint: <BlueprintIR>`
- P3：`oxn work context --task X` 输出 `## Allowed Language` 含同名 term 多视角块
- P4：`oxn work lock` 对越界 probe 抛 `IAP_INTENT_PROBE_OUT_OF_BOUNDARY`
- P5：`oxn work lock` 对违反 Workflow slot DAG 的 task 抛 `IAP_INTENT_TASK_DAG_VIOLATES_SLOT`
- P6：`StackIR.tools[bun]` 自动注入 ProbeRunner，task.md `## Probes - params: command:` 不再需要手写 `bun`
- P7：旧 `kind: domain` 触发 `OXN_WORK_LEGACY_DOMAIN_REF` warn
- 全程：`bun test` + `bun run typecheck` + `bun run lint` + `bun scripts/validate-dependencies.ts` 全绿

## 跨引用

- 上游 ADR：[ADR-0054 三边界框架](./0054-three-boundary-framework.md) + [ADR-0055 Blueprint 组合模板](./0055-blueprint-as-composition-template.md) + [ADR-0060 Domain 词汇边界](./0060-domain-vocabulary-boundary.md)
- 落地 RFC：[v0.7.3-ideal-data-flow-rfc](../../rfcs/v0.7.3-ideal-data-flow-rfc.md)
- 承接 Work：[`v073-ideal-data-flow`](../../../works/v073-ideal-data-flow/work.md)
- 受影响文件：
  - `packages/engine/src/Work/work-context-builder.ts`
  - `packages/engine/src/Work/work-validator.ts`
  - `packages/engine/src/Work/work-lock.ts`
  - `packages/engine/src/oxl/summary-extractors.ts`
  - `packages/engine/src/Proof/runner.ts`