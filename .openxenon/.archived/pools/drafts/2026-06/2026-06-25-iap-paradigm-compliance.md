---
audit: iap-paradigm-compliance
version: 0.2.0
date: 2026-06-25
type: audit
status: completed
---

# Audit: IAP 范式符合度 + 端到端生命周期审计

> **审计**：当前代码库是否真正按 IAP（Intent / Align / Proof）范式运行
> **版本**：v0.2.0（main 分支快照）
> **日期**：2026-06-25
> **类型**：架构符合度审计

---

## 1. 审计范围

回答两个问题：

1. **当前项目与 `.openxenon/` 目录，是否真的按 IAP 范式运行？**
2. **CLI 与内部代码，是如何跑完从 Intent 到 Proof 的全生命周期？**

**审计维度**：

- IAP 三轴（Intent / Align / Proof）的物理兑现度
- 错误范式（IAPError × 4 档出口）落地
- CLI 端到端生命周期可追踪性
- 关键结构空缺（"声称 vs 物理"的差距）

---

## 2. 总评

| 维度 | 兑现度 | 物理证据 |
|---|---|---|
| **Intent 轴** | [OK] 高 | 14 Domain + 11 Blueprint，OXL DSL 7 顶层概念齐备 |
| **Align 轴** | [WARN] 半 | work 状态机在跑，但 probe 验收是 noop 占位 |
| **Proof 轴** | [OK] 高 | `proof.ts` → `writeFrozenImmutable` 0o444 + SHA-256 |
| **错误范式** | [OK] 完整 | IAPError 13 码 × 2 action，CLI 4 档出口 |
| **静态门禁卡** | [OK] 落盘 | `.work` 含 4-hash planLock |
| **双轨制（.oxn ↔ .md）** | [WARN] 在改 | T18/T19/T20 RFC 🟡 未合 |

**总评**：**声称的 "IAP 范式" 在 schema / 类型 / 错误出口 / 写权独占四个维度物理兑现；work 主路径的 Proof 闭环尚未物理接通。**

---

## 3. IAP 三轴兑现度

### 3.1 Intent 轴 — [OK]

**物理证据**：

- 14 个 Domain `.oxn`（`.openxenon/domains/`）+ 15 个 `.md` 镜像
- 11 个 Blueprint `.oxn`（`.openxenon/blueprints/`）+ 11 个 `.md` 镜像
- 5 类 Intent Pool（`pools/{research,design,issue,audit,journal}/`）已建空骨架
- OXL DSL 7 个顶层概念（`src/oxl/langium-driver/oxn.langium:9-16`）：
  - `ProbeDeclaration`、`PartDeclaration`、`BlueprintDeclaration`
  - `DomainDeclaration`、`WorkDeclaration`、`TaskDeclaration`、`ProofDeclaration`
- 15 个 builtin probe 资产（`src/builtin/probes/*.oxn`）
- 3 个 builtin blueprint 资产（`src/builtin/blueprints/*.oxn`）

**消费侧**：

- `oxn domain validate` → Langium AST → slim 索引
- `.cache/domains.json` + `.cache/blueprints.json` 提供 AI 离线检索入口
- `migration-stamp.json` 维系 `.oxn` ↔ `.md` 字节级同步

### 3.2 Align 轴 — [WARN]

**真活部分**：

- Probe 语义↔内部 ref 翻译表（`src/kernel/verdicts/catalog.ts:567-657` `translateProbeInputs`）
- 15 个 verdict 策略（`src/kernel/verdicts/verdict.ts:551-571` `PROBE_VERDICT_STRATEGIES`）
- Verdict 三态：`PASS` / `FAIL` / `INCONCLUSIVE`（`src/kernel/contracts/probe-port.ts`）
- work 状态机跑通：`.run/state.json` + `.run/trace.jsonl` 完整
- 4-hash planLock 落盘（`src/work/birth-cert.ts:59-71`）：
  - `workOxnHash` / `workDomainsHash` / `blueprintsHash` / `tasksHash` + `allHash`（PR-13 必填）

**结构空缺（详见第 5 节）**：

- `submitTask` 的 `probeResults` 是 noop 占位（`src/work/dual-state-exec.ts:225-229`）
- DAG 拓扑排序未在运行时消费（`L0-Processor/dag.ts` 存在但未调用）
- work frozen.json 走的是 `tmp+rename`，未走 `writeFrozenImmutable`

### 3.3 Proof 轴 — [OK]

**物理证据**：

- `src/infra/frozen/immutable.ts:40-74` `writeFrozenImmutable`：
  - SHA-256 of canonical body（剥 `_xenon_meta`）
  - `writeFileSync` with `mode: 0o444` + 显式 `chmodSync` 二次保险
  - try/finally 保证写失败也回锁
- Reader 端重算 hash 校验（`immutable.ts:88-127`），**特意不用 zod result 防 key 顺序漂移**
- 三态聚合（`src/cli/proof-frozen-writer.ts:45-79`）：`PASSED` / `FAILED` / `INCONCLUSIVE`

**frozen.json 落点（3 种）**：

1. `.openxenon/proofs/<name>/frozen.json`（Proof-First 主路径，走 immutable）
2. `.openxenon/works/<w>/tasks/<t>/frozen.json`（work 路径，**未走 immutable**）
3. `.openxenon/works/<w>/frozen.json`（work 终态，**未走 immutable**）

### 3.4 错误范式 — [OK]

- `IAPError` 13 码 × 2 action（`AUTONOMOUS_RETRY` / `YIELD_TO_HUMAN`），见 `src/kernel/contracts/iap-error.ts:50-64`
- CLI 4 档出口（`src/cli/index.ts:71-139`）：
  - Tier 1: `IAPError` → exit 1，stdout JSON（AI 消费）
  - Tier 2: `OXNCrash` → exit 2，stderr（人类消费）
  - Tier 3: `isCliInputError` → exit 1，stdout JSON（用户输入错）
  - Tier 4: 兜底 crash → exit 2，stderr

---

## 4. 端到端生命周期（Intent → Proof）

完整 5 阶段，详见同级文件 `2026-06-25-iap-lifecycle-sequence.md` 的 Mermaid 时序图。本节是文字版。

### Phase 1 — Intent 资产化

```
oxn domain create <Name>             → .openxenon/domains/<Name>.oxn
oxn blueprint create <bp> --slots a,b,c
                                     → .openxenon/blueprints/<bp>.oxn
oxn domain validate                  → Langium AST + slim index 重建
```

- 入口：`src/cli/domain.ts:89-204`（create）/ `:209-308`（validate）
- 持久化：`.oxn` + `.cache/domains.json`（slim）

### Phase 2 — Work 编排（图纸）

```
oxn work create <w> --blueprint <bp>     → .openxenon/works/<w>/work.oxn
oxn work add-task <w> --task <t> --blueprint <bp>
                                         → works/<w>/tasks/<t>/task.oxn
oxn work validate <w>                    → validateAndWriteArtifacts
                                         → 写 .work（BirthCert + 4-hash planLock）
```

- 入口：`src/cli/work.ts:755-942`（create）/ `:1087-1232`（add-task）/ `:947-1082`（validate）
- 关键：`validateAndWriteArtifacts`（`src/cli/work.ts:274-409`）

### Phase 3 — Align 运行时（work 状态机）

```
oxn work run <w>                         → runWork
                                         → 写 .run/state.json + trace.jsonl
oxn work submit <w> --task <t>           → submitTask
                                         → 推进 currentPart
                                         → 终态 writeFrozen（未走 immutable）
```

- 入口：`src/work/dual-state-exec.ts:91-112`（`runWork`）/ `:209-328`（`submitTask`）
- **状态机按数组下标推进，非 DAG 拓扑**

### Phase 4 — Proof 闭环（3 阶段协议，独立于 work）

```
oxn proof create <P>                     → .openxenon/proofs/<P>/proof.oxn
oxn proof probe add <P> <semantic> --input-json '{...}'
                                         → translateProbeInputs
                                         → 改写 proof.oxn（semantic → internalRef）
oxn proof run <P>                        → 3 阶段协议
```

**3 阶段协议**（`src/cli/proof.ts:653-801`）：

- **Phase 0.5 `snapshotWorkMd`**：若 proof.oxn 含 `// proofs-target-work:` 注释，比对 `work-hash.txt`，写不可变 `proof.md`（0o444）
- **Phase 1**：写 `.running.json`（让 self-ref probe 可读）
- **Phase 2**：串行 `executeProbe` → Infra handler（`src/infra/probes/`，15 个）→ Kernel verdict
- **Phase 3**：`writeFrozenProof` → `writeFrozenImmutable`（0o444 + SHA-256）

副作用：更新 `.cache/probe-stats.json`（非 frozen 派生数据）

### Phase 5 — 读取 + Insight 反馈

```
oxn proof show <P>                       → readFrozenImmutable + hash 校验
                                         → renderShowHuman（3 态 emoji + TTY）
oxn proof verify <P>                     → 重算 work.md hash，对比 work-hash.txt
oxn insight --proof <P>                  → computeInsightFromInputs
                                         → emergentPatterns（AI 自行推导）
```

- 读取：避免 zod key 顺序漂移，reader 用 raw body 重算 hash
- Insight：纯 L0 派生，不写回 frozen

---

## 5. 七处结构空缺（[GAP]）

### Gap 1 — `oxn work finalize` CLI 是 PoC 桩

- 位置：`src/cli/work-finalize.ts:18-30`
- 现状：`async run` 直接抛 `IAPError('PROOF', 'INFRA_FAIL', YIELD_TO_HUMAN, 'CLI not wired; use finalizeWorkDomains() programmatically')`
- 影响：Three-Layer Proof v2 PR-2（T12）关键路径未接通
- 已有底层：`src/infra/frozen/work-domains.ts:44` 的 `finalizeWorkDomains()` 函数已实现并被 5 个 e2e test 覆盖

### Gap 2 — `submitTask` 的 `probeResults` 是 noop

- 位置：`src/work/dual-state-exec.ts:225-229`
- 现状：
  ```ts
  probeResults.push({
    probe: 'state-machine',
    passed: true,
    output: { advanced: true, part: taskState.currentPart },
  })
  ```
- 影响：Align 轴"probe 验收驱动 task 推进"未真实执行
- 注释：`probeResults` 字段被声明但调用方从未传真实数据

### Gap 3 — work frozen.json 未走 immutable writer

- 位置：`src/work/dual-state-exec.ts:359-369` `writeFrozen`
- 现状：仅 `tmp + renameSync` 原子写，**没有 chmod 0o444**
- 对比：`proof.ts:758` 的 `writeFrozenProof` 走 `writeFrozenImmutable`
- 影响：Align 轴的不可篡改保证只到原子写，缺 OS 层硬防御

### Gap 4 — DAG 未被运行时消费

- 位置：`L0-Processor/dag.ts` 提供 `topologicalSortGeneric`
- 现状：`submitTask`（line 238-241）用 `taskState.partExecutions[i]` 数组下标推进，**不走 DAG 排序**
- 影响：`blueprint.oxn` 中 `slot "X" { deps = ["Y"] }` 声明的依赖在运行时未拓扑解析

### Gap 5 — daemon 与 work 模型失联

- 位置：`src/daemon/ipc/handlers/` 处理旧 task 模型（`.openxenon/tasks/<uuid>/`）
- 现状：`src/cli/work.ts` **不通过 daemon**，直接调 `src/work/dual-state-exec.ts`
- 影响：daemon 雷达停留在 v0.0.x 单层模型（`src/hall/index.ts:6-9` 留有 TODO 注释承认）

### Gap 6 — Hall 扫描仍指旧布局

- 位置：`src/hall/index.ts:60-85` `scanProjectTasks`
- 现状：读 `<root>/tasks/<id>/state.json`（旧）
- 实际：v1 写 `<root>/.openxenon/works/<w>/.run/state.json` + `<root>/.openxenon/works/<w>/tasks/<t>/.run/state.json`
- 影响：Hall dashboard 与 v1 work 模型不一致

### Gap 7 — `workPrecheck` 未挂 CLI

- 位置：`src/work/work-precheck.ts:18` 库函数已实现
- 现状：`oxn work run` 入口未调用（`grep workPrecheck src/cli` 仅返回 import 提示）
- 影响：v2 核心倒置（精准阻断该 Work）在 API 层 ready，CLI 层未挂载

---

## 6. 关键入口路径速查表

| 角色 | 文件:行号 |
|---|---|
| CLI 入口 + 4 档错误分类 | `src/cli/index.ts:49-139, 145-178` |
| Work 8 阶段编排 | `src/cli/work.ts:274-409, 755-1232` |
| Work 状态机执行 | `src/work/dual-state-exec.ts:91-112, 209-328` |
| Work 静态门禁卡 | `src/work/birth-cert.ts:59-71, 73-90` |
| Proof 3 阶段协议 | `src/cli/proof.ts:189-236, 653-801` |
| Probe 运行时 | `src/cli/proof-runner.ts:58-115` |
| Probe 封装边界 | `src/kernel/verdicts/catalog.ts:567-657` |
| 判定策略（15 个）| `src/kernel/verdicts/verdict.ts:551-571` |
| frozen.json 写权独占 | `src/infra/frozen/immutable.ts:40-74, 88-127` |
| frozen.json body 三态聚合 | `src/cli/proof-frozen-writer.ts:45-79` |
| Langium 7 顶层概念 | `src/oxl/langium-driver/oxn.langium:9-16` |
| 错误范式（13 码）| `src/kernel/contracts/iap-error.ts:50-64` |
| Daemon socket 服务 | `src/daemon/ipc/server.ts:16-136` |
| Daemon 监督器 | `src/daemon/supervisor.ts:77-116` |
| CLI socket 客户端 | `src/cli/socket-client.ts:95-119, 160-186` |
| Hall 扫描 | `src/hall/index.ts:60-85, 131-166` |
| workFinalize PoC 桩 | `src/cli/work-finalize.ts:18-30` |
| workPrecheck 库 | `src/work/work-precheck.ts:18` |
| finalizeWorkDomains 函数 | `src/infra/frozen/work-domains.ts:44` |

---

## 7. 修复优先级

按"工程价值 / 改动成本"排序：

| 序 | 缺口 | 优先级 | 改动成本 | 备注 |
|---|---|---|---|---|
| 1 | Gap 1：接通 `work finalize` CLI | **P0** | 低 | 底层函数已就绪，仅缺 CLI 接通 |
| 2 | Gap 3：work frozen 改走 immutable | **P0** | 低 | 单点替换 writer 调用 |
| 3 | Gap 2：`submitTask` 真接 probe | **P1** | 中 | 需注入真实 probe handler 调用 |
| 4 | Gap 7：`workPrecheck` 挂 `work run` | **P1** | 低 | 单点插入预检 |
| 5 | Gap 4：DAG 拓扑接入 | **P2** | 中 | 需在 `submitTask` 改下标为拓扑序 |
| 6 | Gap 5：daemon 切 v1 work 模型 | **P2** | 高 | 跨 daemon + work 双侧改造 |
| 7 | Gap 6：Hall 扫描同步 | **P3** | 低 | 单函数路径修正 |

---

## 8. 一句话结论

**Intent 与 Proof 两端兑现，Align 中段是桥，但桥墩是 noop 的**——`oxn work submit` 不真调 probe，`oxn work finalize` 是桩，work frozen.json 不走 immutable writer。这是 IAP 范式"形式上闭环、物质上未贯通"的物理全貌。

要把 IAP 真正"贯通到物质层"，**至少要补 P0 的 2 项 + P1 的 2 项**（即 Gap 1/3/2/7）。其它属于"范式已兑现代价"的可控技术债。

---

## 9. 关联引用

- 时序图：`.openxenon/pools/design/2026-06-25-iap-lifecycle-sequence.md`
- 上一份 v0.2.0 准备度审计：`.openxenon/pools/sprints/v0.3-md-ssot/audit/audit-v0.2.0-md-ssot-readiness.md`
- 路线图执行复盘：`.openxenon/pools/sprints/v0.3-md-ssot/audit/retro-v0.2.0-roadmap-execution.md`
- 项目总体路线图：`AGENTS.md` 第 v0.2 / v0.3 章节
- OXL 语法定义：`src/oxl/langium-driver/oxn.langium`
