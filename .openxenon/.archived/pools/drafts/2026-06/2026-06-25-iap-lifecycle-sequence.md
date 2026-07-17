---
design: iap-lifecycle-sequence
version: 0.2.0
date: 2026-06-25
type: design
status: draft
---

# Design: IAP 端到端时序图

> **设计**：从 Intent 资产化到 Proof 闭环的 5 阶段时序图
> **版本**：v0.2.0（main 分支快照）
> **日期**：2026-06-25
> **类型**：架构时序图（Mermaid）

---

## 1. 背景

本文是 `.openxenon/pools/audit/2026-06-25-iap-paradigm-compliance.md` 的姊妹篇。该审计报告给出"是否符合 IAP 范式"的文字结论；本文给出"如何跑完整个生命周期"的时序图。两者一起回答两个核心问题：

1. **是否真的按 IAP 范式运行？** → 见审计报告
2. **CLI 与内部代码如何跑完从 Intent 到 Proof 的全生命周期？** → 见本文

---

## 2. 端到端时序图

```mermaid
sequenceDiagram
    autonumber
    actor User as AI / Operator
    participant CLI as oxn CLI<br/>(cli/index.ts)
    participant Work as L3-Work<br/>(cli/work.ts +<br/>work/dual-state-exec.ts)
    participant Proof as L3-Proof<br/>(cli/proof.ts +<br/>cli/proof-runner.ts)
    participant Lang as OXL/Langium<br/>(oxl/langium-driver)
    participant Probe as L1-Probes<br/>(infra/probes/*)
    participant Frozen as L1-Frozen<br/>(infra/frozen/immutable.ts)
    participant Kernel as L0-Kernel<br/>(kernel/verdicts/*)
    participant FS as .openxenon/*<br/>(Filesystem)

    rect rgb(230, 240, 255)
    Note over User, FS: Phase 1 — Intent 资产化 (图纸 + slim index)
    User->>CLI: oxn domain create Foo
    CLI->>FS: write domains/Foo.oxn
    User->>CLI: oxn blueprint create bp --slots a,b,c
    CLI->>FS: write blueprints/bp.oxn
    User->>CLI: oxn domain validate Foo
    CLI->>Lang: parse Foo.oxn -> AST
    Lang-->>CLI: AST (term / ban / invariant)
    CLI->>FS: rebuild .cache/domains.json (slim index)
    end

    rect rgb(230, 255, 240)
    Note over User, FS: Phase 2 — Work 编排 (图纸 + 4-hash 门禁卡)
    User->>CLI: oxn work create w --blueprint bp
    CLI->>Work: createSubcommand (work.ts:755)
    Work->>FS: write works/w/work.oxn
    User->>CLI: oxn work add-task w --task t --blueprint bp
    Work->>FS: write works/w/tasks/t/task.oxn
    User->>CLI: oxn work validate w
    CLI->>Work: validateAndWriteArtifacts (work.ts:274)
    Work->>Lang: parse work.oxn + merger(domain/bp refs)
    Lang-->>Work: AST + resolved refs
    Work->>FS: write works/w/domains.json
    Work->>FS: write works/w/blueprints.json
    Work->>FS: write works/w/.work<br/>(BirthCert + 4-hash planLock<br/>workOxn/workDomains/<br/>blueprints/tasks)
    end

    rect rgb(255, 245, 220)
    Note over User, FS: Phase 3 — Align 运行时 (work 状态机)
    User->>CLI: oxn work run w
    CLI->>Work: runWork (dual-state-exec.ts:91)
    Work->>FS: write works/w/.run/state.json (zod)
    Work->>FS: append .run/trace.jsonl (work-started)
    User->>CLI: oxn work submit w --task t
    CLI->>Work: submitTask (dual-state-exec.ts:209)
    Work->>Work: advance currentPart = partExecutions[i++]
    Note right of Work: [GAP-2] probeResults.push('state-machine',<br/>passed:true) — noop 占位<br/>未真正调 probe handler
    Work->>FS: write tasks/t/frozen.json<br/>[GAP-3] tmp+rename 未 chmod 0o444
    Work->>FS: write works/w/frozen.json
    Work->>FS: append trace.jsonl (task-submit)
    Note over Work, FS: [GAP-1] oxn work finalize (T12) 未接通<br/>finalizeWorkDomains() 仅 API 可用
    end

    rect rgb(255, 230, 230)
    Note over User, FS: Phase 4 — Proof 闭环 (3 阶段协议，独立于 work)
    User->>CLI: oxn proof create P1
    CLI->>FS: write proofs/P1/proof.oxn
    User->>CLI: oxn proof probe add P1 fs-exists<br/>--input-json '{...}'
    CLI->>Kernel: translateProbeInputs (catalog.ts:567)
    Kernel-->>CLI: { internalRef, internalParams }
    CLI->>FS: rewrite proof.oxn<br/>(semanticName -> internalRef)
    User->>CLI: oxn proof run P1
    CLI->>Proof: 3-phase protocol (proof.ts:653)
    Note over Proof, FS: ── Phase 0.5: snapshotWorkMd ──
    Proof->>FS: read work-hash.txt + work.md
    Proof->>FS: write proofs/P1/proof.md (0o444, immutable)
    Note over Proof, FS: ── Phase 1: self-ref visible ──
    Proof->>FS: write .running.json
    Note over Proof, FS: ── Phase 2: 串行 executeProbe ──
    loop for each probe in proof.oxn
        Proof->>Probe: executeProbe (proof-runner.ts:58)
        Probe->>FS: read inputs / shell out / HTTP / git
        FS-->>Probe: raw output
        Probe->>Kernel: judge (verdict.ts:593)<br/>15 PROBE_VERDICT_STRATEGIES
        Kernel-->>Probe: { passed, verdict (3-state), value }
        Probe-->>Proof: probe result
    end
    Note over Proof, FS: ── Phase 3: frozen.json 写权独占 ──
    Proof->>Frozen: writeFrozenProof (proof-frozen-writer.ts:81)
    Frozen->>Frozen: buildFrozenProof (3-state aggregate<br/>PASSED/FAILED/INCONCLUSIVE)
    Frozen->>FS: chmod 0o644 -> write -> chmod 0o444<br/>+ SHA-256 in _xenon_meta.content_hash
    Proof->>FS: update .cache/probe-stats.json (append)
    end

    rect rgb(240, 230, 255)
    Note over User, FS: Phase 5 — 读取 + Insight 反馈 (闭环记忆)
    User->>CLI: oxn proof show P1
    CLI->>Frozen: readFrozenImmutable (immutable.ts:88)
    Frozen->>FS: read proofs/P1/frozen.json
    Frozen->>Frozen: re-hash raw body<br/>compare _xenon_meta.content_hash<br/>(避开 zod key 顺序漂移)
    Frozen-->>CLI: verified body
    CLI->>Kernel: renderShowHuman (3-state emoji + TTY)
    CLI-->>User: human-readable verdict
    User->>CLI: oxn proof verify P1
    CLI->>FS: recompute work.md hash
    CLI-->>User: hash OK / hash MISMATCH
    User->>CLI: oxn insight --proof P1
    CLI->>Kernel: computeInsightFromInputs
    Kernel->>Frozen: read frozen.json
    Kernel->>FS: read .cache/probe-stats.json
    Kernel-->>CLI: emergentPatterns (原始数据)
    CLI-->>User: pattern hints (AI 自行推导)
    end
```

---

## 3. Phase 拆分说明

### Phase 1 — Intent 资产化（蓝）

- **入口**：`src/cli/domain.ts`、`src/cli/blueprint.ts`
- **关键调用**：`create` 子命令 + `validate` 子命令
- **产物**：`.oxn` 文件 + `.cache/domains.json` slim 索引
- **特性**：纯声明、纯解析，无 IO 执行器介入

### Phase 2 — Work 编排（绿）

- **入口**：`src/cli/work.ts`（3173 行单文件巨型命令，8 阶段中央调度器）
- **关键调用**：`createSubcommand` (line 755) / `addTaskSubcommand` (line 1087) / `validateAndWriteArtifacts` (line 274)
- **产物**：`work.oxn` + `task.oxn` + `.work`（BirthCert + 4-hash planLock）
- **关键 schema**：`src/work/birth-cert.ts:73-90` `BirthCertSchema`；`src/work/birth-cert.ts:59-71` `PlanLockSchema`
- **静态门禁**：`workOxnHash` / `workDomainsHash` / `blueprintsHash` / `tasksHash`（+ `allHash` PR-13 必填）

### Phase 3 — Align 运行时（橙）— [WARN]

- **入口**：`src/work/dual-state-exec.ts`（状态机执行器）
- **关键调用**：`runWork` (line 91) / `runTask` (line 130) / `submitTask` (line 209)
- **产物**：`.run/state.json` + `.run/trace.jsonl` + `frozen.json`（任务级 / work 级）
- **结构空缺**：
  - `submitTask` 的 `probeResults` 是 noop 占位（line 225-229）
  - `writeFrozen` 仅 `tmp+rename`，未 chmod 0o444（line 359-369）
  - `oxn work finalize` CLI 是 PoC 桩（`src/cli/work-finalize.ts:18-30`）
  - **状态机按数组下标推进，非 DAG 拓扑**（`L0-Processor/dag.ts` 未消费）

### Phase 4 — Proof 闭环（红）

- **入口**：`src/cli/proof.ts`（1070 行）+ `src/cli/proof-runner.ts`
- **关键调用**：3 阶段协议（`proof.ts:653-801`）
- **产物**：`proof.oxn` + `frozen.json`（0o444 + SHA-256 签名）+ `proof.md`（v0.3+ 模式 0o444）
- **写权独占**：`src/infra/frozen/immutable.ts:40-74` `writeFrozenImmutable`
- **判定三态**：`PASS` / `FAIL` / `INCONCLUSIVE`
- **特性**：独立于 work 模型——可绕过 work 直接跑

### Phase 5 — 读取 + Insight 反馈（紫）

- **入口**：`src/cli/proof.ts` show/verify + `src/cli/insight.ts`
- **关键调用**：`readFrozenImmutable`（immutable.ts:88-127）— 不用 zod result 防 key 顺序漂移
- **产物**：人类可读 verdict + emergent patterns
- **特性**：纯读取 + 派生计算，不写回 frozen

---

## 4. 图中 7 处结构空缺对照

| 标记 | 缺口 | 位置 |
|---|---|---|
| [GAP-1] | `oxn work finalize` 是 PoC 桩 | `src/cli/work-finalize.ts:18-30` |
| [GAP-2] | `submitTask` probeResults 是 noop | `src/work/dual-state-exec.ts:225-229` |
| [GAP-3] | work frozen 未走 immutable | `src/work/dual-state-exec.ts:359-369` |
| [GAP-4] | DAG 未拓扑解析 | `L0-Processor/dag.ts` 未消费 |
| [GAP-5] | daemon ↔ work 失联 | `src/daemon/ipc/handlers/` 旧 task 模型 |
| [GAP-6] | Hall 扫旧布局 | `src/hall/index.ts:60-85` |
| [GAP-7] | `workPrecheck` 未挂 CLI | `src/work/work-precheck.ts:18` 未被 CLI 调用 |

完整分析见同级审计文件。

---

## 5. 关键文件:行号速查

| 角色 | 路径 |
|---|---|
| CLI 主入口 | `src/cli/index.ts:145-178` |
| Work 8 阶段 | `src/cli/work.ts:274-409, 681-1232` |
| Work 状态机 | `src/work/dual-state-exec.ts:91-112, 209-328, 359-369` |
| Work 门禁卡 | `src/work/birth-cert.ts:59-71, 73-90` |
| Proof 3 阶段 | `src/cli/proof.ts:189-236, 653-801` |
| Probe 运行时 | `src/cli/proof-runner.ts:58-115` |
| Probe 翻译 | `src/kernel/verdicts/catalog.ts:567-657` |
| Verdict 策略 | `src/kernel/verdicts/verdict.ts:551-571` |
| Frozen 写权 | `src/infra/frozen/immutable.ts:40-74, 88-127` |
| Frozen 三态 | `src/cli/proof-frozen-writer.ts:45-79` |
| OXL 7 概念 | `src/oxl/langium-driver/oxn.langium:9-16` |
| 错误范式 | `src/kernel/contracts/iap-error.ts:50-64` |
| 4 档出口 | `src/cli/index.ts:71-139` |

---

## 6. 关联引用

- 审计报告：`.openxenon/pools/audit/2026-06-25-iap-paradigm-compliance.md`
- 上一份 v0.2.0 准备度审计：`.openxenon/pools/sprints/v0.3-md-ssot/audit/audit-v0.2.0-md-ssot-readiness.md`
- 路线图执行复盘：`.openxenon/pools/sprints/v0.3-md-ssot/audit/retro-v0.2.0-roadmap-execution.md`
- 总体路线图：根 `AGENTS.md`
- OXL 语法定义：`src/oxl/langium-driver/oxn.langium`
