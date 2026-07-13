# ADR-0058 信任闭环实现方案

> **目标**：将 OpenXenon 从"任务追踪器"升级为"信任协作工具"——闭合 ADR-0058 定义的四层确定性闭环。
> **来源**：ADR-0058 最小信任闭环 + 2026-07-09 Work 闭环清理草案
> **日期**：2026-07-12
> **关联**：ADR-0057 信任链核心模型、ADR-0056 External 注入

---

## 一、当前缺口（三个 Anomaly，按 ADR-0058 D2/D3/D4 映射）

| Anomaly | 对应闭环层 | 当前状态 | 信任后果 |
|---|---|---|---|
| **A3** — `submitTask` 返回合成假结果 | D2 确定性验证 | `dual-state-exec.ts:228` 推入 `{probe: 'state-machine', passed: true}` | OXN 出示的证据是假的，Engine 公证权失能 |
| **A1** — `finalizeWork` 不写 frozen.json | D3 确定性证据 | `dual-state-exec.ts:621` 只更新 state.json + trace | 失败路径零证据，Insight pipeline 无数据 |
| **A2** — `finalizeWorkDomains` 零调用者 | D4 确定性记录 | `infra/frozen/work-domains.ts:44`（163 行，完美）无人调用 | 边界违反不可见，工程师不知道 AI 跨越边界 |

---

## 二、现有可用组件（无需新建，直接复用）

| 组件 | 路径 | 作用 |
|---|---|---|
| `executeProbe` | `Proof/runner.ts:58` | 完整 Probe 执行管线（resolve → Infra handler → Kernel judge → FrozenProofProbeResult） |
| Probe catalog（18 内置） | `kernel/verdicts/catalog.ts` | 内置 probe 目录（fs-exists/shell-exec/ts-compiles/http-responds/...） |
| 判定策略（14 个） | `kernel/verdicts/verdict.ts` | 纯函数判定，无 IO |
| Trust Baseline（12 flag） | `kernel/verdicts/trust-baseline.ts` | RED/YELLOW 污染检测 |
| Infra probe handlers（22 个） | `infra/probes/*.ts` | fs/shell/http/git/sandbox 物理观测 |
| `workPrecheck` | `Work/work-precheck.ts` | 已实现 + 单测覆盖，零调用 |
| `writeFrozen` 原子写入 | `dual-state-exec.ts:362` | tmp+rename 原子写 |
| `writeWorkFrozen` | `dual-state-exec.ts:357` | work 级 frozen 写入（仅 submit all-pass 路径调用） |
| `finalizeWorkDomains` | `infra/frozen/work-domains.ts:44` | 二阶段原子写 + FAIL 硬阻断（163 行） |
| `evaluateDomainProof` | `infra/frozen/domain-proof-evaluator.ts` | script exit 0=PASS / 1=FAIL / other=INCONCLUSIVE |

---

## 三、实现方案（三阶段，串行）

### 阶段 A：闭合 A3 — `submitTask` 接入真实 Probe（D2 验证层）

**核心改动**：

1. **`dual-state-exec.ts` — `submitTask`**
   - 当 `runProbes === true` 时：从 task.md 读取 probe 声明 → `await executeProbe(probe, {projectRoot})` → 写入真实 `probeResults`
   - 当 `runProbes === false`（默认）时：保留合成行为（向后兼容）
   - `executeProbe` 是 async，`submitTask` 需要改 async（或新加 `submitTaskWithProbes`）
   - Probe 声明来源：task.md 中 `### <probe>` H3 或 `## Parts > ### part > - probe:`

2. **`dual-state-exec.ts` — `writeTaskFrozen`**
   - 冻结时写真实 probeResults（verdict/output/errorMessage/durationMs），而非合成 `{probe: 'state-machine'}`

3. **`dual-state-exec.ts` — `workPrecheck` 接入**
   - 在 `submitTask` 或 `runTask` 启动时调用 `workPrecheck(requiredSchemes)`
   - requiredSchemes 从 work 中引用的 probe scheme 推导（`@oxn/probes/xxx`）
   - 当前 CLI 未调 `workPrecheck`，需要接入

4. **`packages/cli/src/commands/work.ts` — submit 子命令**
   - `submitTask` 从 sync → `await submitTask(...)`
   - 输出 JSON 中包含真实 probe verdict

**依赖边界检查**：
- `executeProbe` 在 `Proof/` (L2)，从 `dual-state-exec.ts` (L2-Work) 调用 — 同层，合法
- `executeProbe` 内部分解：`@openxenon/engine/infra/probes` (L1) + `@openxenon/engine/kernel` (L0) — 均合法

**风险与缓解**：
- `submitTask` 改 async 波及面广（work.ts 调用点、测试、CLI）
- **缓解**：新加 `submitTaskWithProbes`（async），原有 `submitTask`（sync）不动，CLI 根据 `--run-probes` 路由

---

### 阶段 B：闭合 A1 — `finalizeWork` 写 frozen.json（D3 证据层）

**核心改动**：

1. **`dual-state-exec.ts` — `finalizeWork`**
   - 在关闭 round + 标终态之后，追加 `.run/frozen.json` 写入：
     - 二阶段原子写：draft → rename → chmod 0o444
     - 包含：`finalVerdict` / `totalRounds` / `roundHistory[]` / `taskFrozenPaths[]`
     - 包含：`boundaryViolations[]`（阶段 C 注入）
     - 包含：`finalizedAt`
   - 失败路径也写 frozen（"失败收档"语义，Insight pipeline 可消费）

2. **新增类型**：`WorkFinalizedFrozen`（扩展现有 `WorkFrozenSnapshot`）
   - 新增：`finalVerdict: string` / `totalRounds: number` / `roundHistory: RoundRecord[]`
   - 新增：`boundaryViolations?: BoundaryViolation[]` / `taskFrozenPaths?: string[]`
   - 保留向后兼容：`tasks` 字段继续使用

3. **CLI `finalize` 子命令**：无需改动，`finalizeWork` 内部已包含 frozen 写入

**frozen.json 路径**：`works/<w>/.run/frozen.json`（与 `getWorkFrozenPath` 一致）

**风险**：低。`writeFrozen` 原子写入已实现，只是被 finalize 路径遗漏。

---

### 阶段 C：闭合 A2 — 接通 `finalizeWorkDomains` 调用方（D4 记录层）

**核心改动**：

1. **`dual-state-exec.ts` — `finalizeWork`**
   - 在写 frozen.json 之前，收集 Domain invariant 列表：
     1. 读取 work.md → 提取 work-level domain refs（`## Refs` 中 `kind: domain`）
     2. 对每个 domain，读取 Domain.md → 提取 `## Invariants` 下所有条目
     3. 构造 `DomainProofInput[]` `{ domain, invariant, script, manual, scope }`
     4. 调用 `finalizeWorkDomains(workName, projectRoot, domainProofs, force?)`
     5. 结果（overallVerdict + hardBlocked + domainProofs）注入 frozen.json
     6. 若 `overallVerdict !== 'PASS'` 且无 `--force`：抛 `OXN_FINALIZE_REJECTED`

2. **`finalizeWork` 新增参数**：`force: boolean`（CLI 透传 `--force`）

3. **`packages/cli/src/commands/work.ts` — `finalize` 子命令**
   - 新增 `--force`（忽略 domain proof 硬阻断，仍写 frozen.json 但记录边界违反）
   - 新增 `--dry-run`（仅评估不写 frozen.json，用于 pre-finalize 检查）

4. **`infra/frozen/work-domains.ts` 路径统一**
   - 当前写 `works/<w>/work-domains-frozen.json`，与 `getWorkFrozenPath`（`works/<w>/.run/frozen.json`）不在同一目录
   - 推荐：保留独立文件 + frozen.json 中增加 `domainProofsPath` 索引字段

**关键决策点**：
- `finalizeWorkDomains` 使用 async API（filesystem-async），与 `finalizeWork` 同步逻辑冲突
- **推荐方案**：`finalizeWork` 保持 sync，新增 `finalizeWorkAsync`（或让 CLI 先调 async `finalizeWorkDomains`，再调 sync `finalizeWork`）

---

## 四、孤儿代码清理

| 模块 | 行数 | 处理 | 理由 |
|---|---|---|---|
| `Work/explore/*.ts` | 364 | **删除** | Explore 模式代码零 caller |
| `Work/policies/*.ts` | 40 | **删除** | 零 caller |
| `Work/sandbox/sandbox-manager.ts` | 145 | **删除** | 仅测试 exempted |
| `Work/blueprint-freezer.ts` | 175 | **删除** | Insight 已有等价实现 |
| `Work/adapters/frozen-to-blueprint-adapter.ts` | ~40 | **删除** | 零 caller |
| `Work/task-filesystem.ts`（API 部分） | ~400 | **删除** taskNew/Submit/Verify；保留 taskTraceAppend | 与 dual-state-exec 重叠 |
| `Work/probe-evaluator.ts` | 125 | **删除** | `executeProbe` 替代 |
| `Work/work-context-builder.ts` | 292 | **保留** | External 注入已接入 |
| `Work/work-lock.ts` lockWork/unlockWork | ~60 | **保留** | 语义价值高 |
| `Work/work-precheck.ts` | 43 | **保留并接入** | 阶段 A 接入 |

---

## 五、实施顺序

```
阶段 A (A3) → 阶段 B (A1) → 阶段 C (A2) → 孤儿清理
```

理由：没有验证层（A3），证据层（A1）和记录层（A2）都是空壳；B 依赖 A3 的 probeResults 作为 frozen 内容来源之一；C 的结果注入 B 的 frozen.json。

---

## 六、测试计划

| 阶段 | 测试 |
|---|---|
| A3 | `submitTask(runProbes=true)` → 真实 executeProbe 结果写入 frozen.json |
| A3 | `workPrecheck` 阻断：PROBE_CORRUPTED / PROBE_MISSING |
| A1 | `finalizeWork` → `.run/frozen.json` 写入（三态 + roundHistory） |
| A1 | 失败路径 `finalizeWork` → frozen.json 仍写入 |
| A2 | `finalizeWorkDomains` 被调用 → domainProofs 注入 frozen.json |
| A2 | Domain proof FAIL + 无 `--force` → `OXN_FINALIZE_REJECTED` |
| 孤儿 | 删除后确认零 caller / 无 import error |

---

## 七、主要风险

| 风险 | 缓解 |
|---|---|
| `submitTask`/`finalizeWork` 改 async 波及面大 | 渐进：新加 async 入口，原有 sync 不动 |
| Probe 声明格式在 task.md 中不统一 | 双来源：`## Probes` H3 + `## Parts > - probe:` |
| `finalizeWorkDomains` 是 async API | CLI 先调 async `finalizeWorkDomains`，再调 sync `finalizeWork` |
| 孤儿代码删除可能意外断依赖 | 先 grep caller 确认，再删 |

---

## 八、非目标

- Work↔Proof 完整缝合（`executeProbe` 端到端 + frozen 形状统一）→ v0.7.2+ RFC
- 自动 round loop driver → v0.8+
- Asset 模式重构（旁路）→ v0.9+
- 新 npm 依赖
- CLI `work.ts` 单文件拆分 → 独立技术债 RFC

