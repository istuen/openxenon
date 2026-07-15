# 两层 Proof 设计与边界映射分析（探索稿）

> **状态**：Draft（探索稿 · Pool）
> **日期**：2026-07-13
> **触发**：回答两个产品设计问题——(1) Asset 边界如何跟 Work 里的 Proof 对应上；(2) 两层 Proof 机制（Round Proof + Work Proof）的设计
> **定位**：产品层设计 + 当前实现缺口分析（面向产品 / 用户视角，附带代码调研证据）
> **落点**：本稿为 Pool 探索稿；定稿后边界映射缺口部分走 `oxn work create boundary-proof-gap --blueprint fix-issue` 进入修复流程，两层 Proof 设计部分走 `oxn work create two-layer-proof --blueprint doc-promote` 提升为 `docs/zh-cn/proof.md` 补充章节。
> **素材来源**：代码调研（packages/engine/src/{Work,Proof,Asset,kernel,infra}/）+ `docs/zh-cn/{proof,asset,work,core-concepts}.md` + ADR-0011/0031/0054/0055 + `packages/engine/src/Work/dual-state.ts` / `dual-state-exec.ts` / `domain-proof-evaluator.ts`

---

## 一、问题提出

### 1.1 Asset 边界如何跟 Work 里的 Proof 对应上

OpenXenon 的 F2 边界资产定义了 3 类边界（Domain / Workflow / Stack）+ Blueprint 组合模板。工程师定义边界后，AI Agent 在 F3 协作空间内执行，OXN Engine 用 F4 客观证据证明 AI 成果。

但这里有一个产品设计的核心问题：**Asset 里的边界，如何成为 Work 与 Task 里的 Probe，然后 Proof 可以证明？**

这涉及完整的映射链路：

```
Asset 边界（工程师定义）        Work/Task（AI 执行）         Proof（Engine 出证）
─────────────────────          ──────────────────           ──────────────────
Domain term/ban/invariant  →   ??? 如何成为 Probe ???   →   PASSED / FAILED / INCONCLUSIVE
Workflow slot/deps/observe →   ??? 如何成为 Probe ???   →   PASSED / FAILED / INCONCLUSIVE
Stack runtime/linter/test  →   ??? 如何成为 Probe ???   →   PASSED / FAILED / INCONCLUSIVE
```

### 1.2 两层 Proof 的需求

当前 Work 的 Round 是指一次正式的 IAP（Intent → Align → Proof）。一次 Work 可以有多次 Round。因此 Proof 应该有两个层级：

- **Round Proof**：针对本次 Round 的 Proof。Proof 成功就结束 Work；失败则 AI Agent 决策是结束 Work 还是调整进入下一轮 Round。
- **Work Proof**：针对整个 Work 的 Proof。工程师通过 Work Proof 了解本次 Work 的 Round 情况，以及 AI 执行 N 次 Round 后的关键点，来判断是**边界问题**（Asset 需演化）还是 **AI Agent 问题**（需换策略）。

---

## 二、Asset 边界 → Probe 映射分析

### 2.1 完整映射表

| 边界类型 | 边界子项 | 对应 Probe | 实现状态 | 关键代码 |
|---|---|---|---|---|
| **Domain** | term | 无（仅渲染为 AI 上下文提示） | ✅ 上下文渲染 / ❌ 无机器判定 | `work-context-builder.ts:145-154, 281-296` |
| **Domain** | ban | 无（仅渲染为 AI 上下文提示） | ✅ 上下文渲染 / ❌ 无机器判定 | `work-context-builder.ts:147, 289-290` |
| **Domain** | invariant（带 script） | `evaluateDomainProof` 执行脚本 | ⚠️ **有缺口**：script 字段丢失 | `domain-proof-evaluator.ts:21-59`; `work.ts:2897-2914` |
| **Domain** | invariant（带 manual） | MANUAL_PENDING | ⚠️ **有缺口**：manual 字段丢失 | `domain-proof-evaluator.ts:31-37` |
| **Domain** | invariant（纯文本） | MANUAL_PENDING（需人工） | ✅ 按设计 | `domain-proof-evaluator.ts:54-58` |
| **Workflow** | slot + deps | DAG 拓扑约束（无环校验） | ✅ 但不是 Probe | `per-work-blueprints-merger.ts:259-279`; `Asset/dag-validator.ts` |
| **Workflow** | slot.observe | 声明性引用，不直接执行 | ⚠️ 仅 E4 覆盖率分析 | `pipeline-compute.ts:164-197` |
| **Stack** | runtimes | 应对应 `ts-compiles` 等 | ❌ **未实现** | `stack-compiler.ts:167-223`（解析存在，无下游） |
| **Stack** | linters | 应对应 `lint-check` | ❌ **未实现** | 同上 |
| **Stack** | testers | 应对应 `test-pass` | ❌ **未实现** | 同上 |
| **Task** | part 内联 probe | `executeProbe`（需 `--run-probes`） | ✅ 已实现 | `dual-state-exec.ts:351-398` |
| **Task** | ## Probes 段 | `executeProbe`（需 `--run-probes`） | ✅ 已实现 | `dual-state-exec.ts:401-413` |

### 2.2 映射链路图

```
Asset 边界                        Work/Task                        Proof
───────────                       ──────────                       ────────
Domain term          →  AI 上下文渲染（无 Probe）         →  无机器判定
Domain ban           →  AI 上下文渲染（无 Probe）         →  无机器判定
Domain invariant     →  collectWorkDomainProofs           →  evaluateDomainProof（有缺口）
Workflow slot/deps   →  DAG 校验 + task 骨架自动生成      →  拓扑约束（非 Probe）
Workflow observe     →  E4 覆盖率分析（不触发执行）       →  声明性引用
Stack runtime        →  ❌ 无下游消费                     →  ❌ 未实现
Stack linter         →  ❌ 无下游消费                     →  ❌ 未实现
Stack tester         →  ❌ 无下游消费                     →  ❌ 未实现
Blueprint ## Refs    →  per-work blueprints.json          →  组合 3 边界（仅 Domain invariant 被评估）
Task part 内联 probe →  collectTaskProbeDecls             →  executeProbe（需 --run-probes）
Task ## Probes 段    →  collectTaskProbeDecls             →  executeProbe（需 --run-probes）
```

**信息隐藏原则**：AI 只看"该做什么"（term / ban / slot），不看"该满足什么"（Part 内 Probe 验证标准对 AI 不可见）。实现方式：
- `renderContextHuman` 渲染 Task Parts 时只输出 part 名和技能上下文，不输出 probes 字段
- part 内无 ref 的 probe 不执行（AI 即使看到 probe 名也不知道是否真的会被执行）
- catalog 的 `internalRef` 对 AI 封装，AI 只接触 `semanticName`

### 2.3 当前实现缺口（5 项，按严重度排序）

#### 缺口 1（严重）：Stack runtimes/linters/testers 无自动 Probe 化

- **文档声称**（`asset.md`）："Proof 阶段直接断言"
- **代码实际**：`StackCompiler.parse()` 能解析出 `runtimes[]` / `linters[]` / `testers[]`，但全仓库搜索这些字段的下游消费者，**无任何生产代码**把它们转成 Probe 声明
- **影响**：Stack 资产目前只是"文档"，Engine 不会自动验证技术栈约束
- **临时方案**：工程师在 task.md 手动声明 `ts-compiles` / `lint-check` / `test-pass`

| Stack 字段 | 应对应 catalog Probe | domainTerm |
|---|---|---|
| `runtime typescript` | `ts-compiles` | `SourceFile` |
| `linter biome` | `lint-check` | `SourceFile` |
| `tester bun-test` | `test-pass` | `TestCase` |

#### 缺口 2（严重）：Domain invariant 的 script/manual/scope 字段丢失

- `readDomainFile()`（`summary-extractors.ts:112-129`）只提取 invariant 的 `- value:` 行，丢弃 `- script:` / `- manual:` / `- scope:` 字段
- `collectWorkDomainProofs()`（`work.ts:2897-2914`）只传 `{domain, invariant}` 两个字段，不传 script/manual/scope
- **影响**：即使 invariant 声明了可执行 script，`evaluateDomainProof()` 也收不到 → 所有 invariant 都返回 `MANUAL_PENDING` → finalize 不带 `--force` 会被阻塞

#### 缺口 3（中等）：Workflow slot.observe 不直接触发 Probe 执行

- observe 是"期望声明"（probe semanticName 数组），实际执行依赖 task.md 的 `## Probes` 段手动声明
- 如果 task.md 没声明对应 probe，observe 就是空期望，只在 E4 Insight coverage gap 报告里出现
- **设计意图**：observe 应该驱动 Probe 执行，但当前无此实现

#### 缺口 4（低）：Domain term/ban 无机器判定

- **这是设计选择而非 bug**：term/ban 是语义约束，机器难以自动判定
- 当前依赖 AI 自觉遵守 + 工程师人工 review + E4 Insight 行为模式分析
- 可用手动 `fs-content-match` probe 检查 ban 词是否出现在产物中，但需人工声明

#### 缺口 5（低）：submit 默认不跑真实 Probe

- `oxn work submit` 默认走 `runNoopProbe()`（always PASS）
- 需显式 `--run-probes` 才走 `submitTaskWithProbes()` 执行真实 Probe
- 可能是故意的（让 AI 先完成再验证），但文档未明确强调此默认行为

---

## 三、两层 Proof 产品设计

### 3.1 设计目标

两层 Proof 服务于两个不同的决策者：

| 层级 | 服务对象 | 决策内容 |
|---|---|---|
| **Round Proof** | AI Agent | 本轮结束后，是结束 Work 还是调整进入下一轮 Round |
| **Work Proof** | 工程师 | Work 结束后，是边界问题（Asset 需演化）还是 AI Agent 问题（需换策略） |

### 3.2 Round Proof（每轮一份）

**产出时机**：每轮 IAP 的 Proof 阶段结束时（`next-round` 或 `finalize` 关闭当前 round 时）

**产品视角**：Round Proof 是 AI Agent 做下一轮决策的依据。AI Agent 看到本轮哪些 Probe 失败、哪些边界被违反，决定是调整意图重新对齐，还是承认失败结束 Work。

| 字段 | 内容 | AI Agent 用途 |
|---|---|---|
| round | 第几轮（1-based） | 定位 |
| probeResults | 本轮所有 Probe 的 PASSED / FAILED / INCONCLUSIVE + 输出 | 判断哪步失败、失败原因 |
| boundaryViolations | 本轮 Domain invariant 评估结果 | 判断是否越界、越了哪条边界 |
| verdict | PASSED / FAILED / INCONCLUSIVE | PASSED → finalize；FAILED → next-round；INCONCLUSIVE → 需人工 |
| failedTasks | 失败 task 名 + 失败原因摘要 | 聚焦修复目标 |

**AI Agent 决策逻辑**：

```
Round Proof verdict = PASSED
  → AI Agent 调 oxn work finalize 结束 Work

Round Proof verdict = FAILED
  → AI Agent 分析 failedTasks + probeResults
  → 判断：是 Probe 没跑对（可修复）还是边界太严（需工程师调整 Asset）
  → 可修复 → 调整意图 → oxn work next-round 开启下一轮
  → 边界太严 → 建议 finalize with warning，告知工程师

Round Proof verdict = INCONCLUSIVE
  → AI Agent 无法自行决策 → 需工程师介入
```

### 3.3 Work Proof（最终一份，汇总所有 Round）

**产出时机**：`oxn work finalize` 时产出，是整个 Work 的最终证据

**产品视角**：Work Proof 是工程师做全局判断的依据。工程师看到所有 Round 的收敛过程、哪些 Probe 反复失败、哪些边界被反复违反，来判断是**边界问题**还是 **AI Agent 问题**。

| 字段 | 内容 | 工程师用途 |
|---|---|---|
| roundHistory | 所有 Round 的 verdict 序列 | 看收敛过程（几轮收敛？是否震荡？） |
| persistentFailures | 跨 Round 反复失败的 Probe / 边界 | **区分边界问题 vs AI Agent 问题** |
| boundaryViolations | 所有 Round 的边界违反汇总 | 判断 Asset 是否需要演化 |
| finalVerdict | 最终 verdict | 合格判定基础 |
| taskProofs | 各 Task 的 Probe 详情索引 | 深入查看具体证据 |

**工程师判断逻辑**：

```
Work Proof 显示：某 Probe 在 Round 1/2/3 都 FAILED
  → 工程师判断：边界问题（Asset 定的约束可能不合理）
  → 决策：演化 Asset（调整 invariant / 放宽 ban / 修改 Blueprint slot）

Work Proof 显示：某 Probe 在 Round 1 FAILED，Round 2 PASSED
  → 工程师判断：AI Agent 问题（第一轮执行不到位，第二轮修正了）
  → 决策：Work 合格，可选产出 Insight（该失败模式可复用）

Work Proof 显示：边界违反在多轮中反复出现
  → 工程师判断：AI Agent 不理解边界（边界表达需更清晰）或边界本身有矛盾
  → 决策：演化 Asset（改善边界表达）或调整 Blueprint（调整 slot 结构）
```

### 3.4 关键区分：边界问题 vs AI Agent 问题

这是两层 Proof 的核心产品价值——**让工程师能区分两类问题**：

| 信号 | 判断 | 决策 |
|---|---|---|
| Probe 跨 Round 反复失败（persistentFailures 非空） | **边界问题** | 演化 Asset（约束可能不合理） |
| Probe 单次失败后下一轮通过 | **AI Agent 问题** | Work 合格，产出 Insight |
| 边界违反多轮反复出现 | **边界表达问题** | 改善 Asset 表达或调整 Blueprint |
| 所有 Round 都 INCONCLUSIVE | **验证能力问题** | Probe 设计不足，需增加 Probe |

### 3.5 与信任链四层的关系

两层 Proof 承载信任链的 D2 和 D3：

| 信任层 | 由哪层 Proof 承载 | 怎么承载 |
|---|---|---|
| **D2 确定性验证** | Round Proof | 每轮独立验证，非 AI 自报——AI Agent 拿到的是 Engine 出具的事实 |
| **D3 确定性证据** | Work Proof | 汇总所有 Round，含失败路径——工程师看得到 AI 不可靠的部分 |
| **D4 确定性记录** | Work Proof 的 persistentFailures + boundaryViolations | 边界违反记录而非阻止——工程师判断是边界问题还是 AI 问题 |

---

## 四、当前实现现状 vs 目标设计

### 4.1 现状

| 概念 | 当前状态 |
|---|---|
| **Round 级 frozen.json** | ❌ **不存在**。Round 状态只是 `state.json` 里 `roundHistory[]` 的一条记录，含 `verdict` + `failures`（task 名列表），无 probe 详情 |
| **Work 级 frozen.json** | ✅ 存在（`.run/frozen.json`），含 `roundHistory[]` + `taskFrozenPaths[]` + `boundaryViolations`。但**无不可篡改保护**（无 chmod 0o444、无 hash） |
| **Task 级 frozen.json** | ✅ 存在（`.run/tasks/<t>/frozen.json`），含 probe 执行详情。同样**无不可篡改保护** |
| **独立 Proof 轴** | ✅ `oxn proof run` 产出的 frozen.json 是**唯一**真正不可篡改的（chmod 0o444 + SHA-256） |
| **Round verdict 传递** | 靠**用户手动传参**（`--verdict FAILED --failures t1,t2`），引擎不自动从 task frozen.json 聚合 |
| **E4 消费 roundHistory** | ❌ `pipeline-analyzer.ts:140-149` 只读 work frozen.json 的 `name` 字段，未解析 `roundHistory` |

### 4.2 差距表

| 目标 | 现状 | 差距 |
|---|---|---|
| Round Proof（每轮一份 frozen.json） | 不存在 | 需新增 Round 级 frozen.json writer |
| Round Proof 含 probeResults | roundHistory 只有 verdict + failures（task 名） | 需在 nextRoundWork 时聚合 task probe 结果 |
| Work Proof 不可篡改 | Work frozen.json 无 chmod/hash | 需走 immutable writer |
| 引擎自动聚合 Round verdict | 用户手动传 `--verdict --failures` | 需从 task frozen.json 自动聚合 |
| Work Proof 含 persistentFailures | 不存在该字段 | 需新增跨 Round 失败模式分析 |
| Stack 边界自动 Probe 化 | 完全未实现 | 需 runtimes/linters/testers → Probe 映射 |
| Domain invariant script 执行 | script 字段丢失 | 需修复 collectWorkDomainProofs 传字段 |

### 4.3 三处文档与代码偏差

| 偏差 | 文档声称 | 代码实际 |
|---|---|---|
| Work frozen.json 权限 | `work.md` 标注 `(work 终态, 0o444)` | `writeFrozen` 未 chmod，无 `_xenon_meta.content_hash` |
| round-n/ 子目录 | `work.md` / `insight.md` / `architecture.md` 声称有 `round-1/` `round-2/` 快照子目录 | 代码从未创建，Round 状态仅活在 `state.json` 的 `roundHistory[]` |
| E4 消费 roundHistory | `work.md` 声称"finalize 保留所有历史供 E4 Insight 消费" | `pipeline-analyzer.ts` 只读 `name` 字段，未解析 `roundHistory` |

---

## 五、实现路径建议（按优先级）

### P0（信任链闭环必须）

| 改动 | 说明 | 关键代码位置 |
|---|---|---|
| 新增 Round 级 frozen.json writer | 在 `nextRoundWork` 关闭 round 时写 `.run/rounds/<N>/frozen.json`，含 probeResults + boundaryViolations + verdict | `dual-state-exec.ts:594-670`（nextRoundWork） |
| 引擎自动聚合 Round verdict | 从 task frozen.json 自动聚合 probe 结果为 Round verdict，不再靠用户手动传 `--verdict --failures` | `dual-state-exec.ts:625-655` |
| Work frozen.json 走 immutable writer | 用 `writeFrozenImmutable` 替代内部 `writeFrozen`，加 chmod 0o444 + SHA-256 | `dual-state-exec.ts:459-469` |

### P1（两层 Proof 完整化）

| 改动 | 说明 | 关键代码位置 |
|---|---|---|
| 修复 Domain invariant script 字段丢失 | `readDomainFile` 提取 script/manual/scope；`collectWorkDomainProofs` 传递这些字段 | `summary-extractors.ts:112-129`; `work.ts:2897-2914` |
| Work Proof 新增 persistentFailures | 跨 Round 失败模式分析算法：识别在 ≥2 轮中反复失败的 Probe / 边界 | `dual-state-exec.ts:725-806`（finalizeWork） |
| E4 接线消费 roundHistory | `pipeline-analyzer.ts` 解析 `roundHistory` / `finalVerdict` / `persistentFailures` | `pipeline-analyzer.ts:140-149` |

### P2（边界映射补齐）

| 改动 | 说明 | 关键代码位置 |
|---|---|---|
| Stack 自动 Probe 化 | `runtimes/linters/testers` → 自动生成对应 Probe 声明，注入 task 骨架 | 新增 `stack-to-probes.ts`；`work-manager.ts` create 时调用 |
| Workflow observe 触发 Probe | observe 从"期望声明"升级为"自动注入 Probe"，确保 blueprint 声明的 observe 一定被执行 | `work-manager.ts` create 时从 observe 生成 task probe 声明 |

---

## → 参考

### 代码引用索引

| 主题 | 引用 |
|---|---|
| RoundRecord schema | `packages/engine/src/Work/dual-state.ts:35-42` |
| WorkspaceState schema | `packages/engine/src/Work/dual-state.ts:44-83` |
| WorkFrozenSnapshot 接口 | `packages/engine/src/Work/dual-state-exec.ts:428-447` |
| TaskFrozenSnapshot 接口 | `packages/engine/src/Work/dual-state-exec.ts:419-426` |
| writeFrozen（普通 writer，无 immutable） | `packages/engine/src/Work/dual-state-exec.ts:459-469` |
| nextRoundWork 实现 | `packages/engine/src/Work/dual-state-exec.ts:594-670` |
| finalizeWork 实现 | `packages/engine/src/Work/dual-state-exec.ts:725-806` |
| submitTaskWithProbes（真实 Probe 执行） | `packages/engine/src/Work/dual-state-exec.ts:351-398` |
| evaluateDomainProof（invariant 评估） | `packages/engine/src/infra/frozen/domain-proof-evaluator.ts:21-59` |
| collectWorkDomainProofs（有缺口） | `packages/cli/src/commands/work.ts:2897-2914` |
| readDomainFile（invariant 字段丢失） | `packages/engine/src/oxl/summary-extractors.ts:112-129` |
| StackCompiler.parse（无下游） | `packages/engine/src/oxl/md-bridge/compilers/stack-compiler.ts:167-223` |
| writeFrozenImmutable（chmod+hash） | `packages/engine/src/infra/frozen/immutable.ts:40-74` |
| FrozenProof schema（独立轴） | `packages/engine/src/kernel/schemas/proof-schema.ts:58-68` |
| E4 pipeline-analyzer（未消费 roundHistory） | `packages/engine/src/infra/insight/pipeline-analyzer.ts:140-149` |
| Probe catalog（16 个 builtin） | `packages/engine/src/kernel/verdicts/catalog.ts:58-493` |
| Blueprint ## Refs 解析 | `packages/engine/src/Work/per-work-blueprints-merger.ts:189-257` |
| buildWorkContext（AI 上下文渲染） | `packages/engine/src/Work/work-context-builder.ts:129-154` |

### 文档链接
- [Proof](../../docs/zh-cn/proof.md) — E3 Engine 独立公证
- [Asset](../../docs/zh-cn/asset.md) — E1 边界资产
- [Work](../../docs/zh-cn/work.md) — E2 协作空间 + Round + IAP
- [Core Concepts](../../docs/zh-cn/core-concepts.md) — E1-E4 + 信任链

### ADR 链接
- [ADR-0011 证据链三件套](../docs/adrs/0011-evidence-chain-triple.md)
- [ADR-0031 Proof = 公证人 ≠ 裁判](../docs/adrs/0031-proof-notary-not-judge.md)
- [ADR-0054 三边界框架](../docs/adrs/0054-three-boundary-framework.md)
- [ADR-0055 Blueprint 组合模板](../docs/adrs/0055-blueprint-as-composition-template.md)

### 同层探索稿
- [OpenXenon 产品设计](./openxenon-product-design.md) — 产品视角全景
- [信任链产品模型](./trust-chain-product-model.md) — 信任链四层确定性

---

## 六、边界 → Probe 的统一映射模型

> **触发**：在 §二 的映射分析基础上，修正"边界成为脚本"的错误方向，确立"Asset 只声明可用 Probe，参数由 AI Agent 在 Task 编排时具象化"的正确模型。

### 6.1 修正：为什么不在 Asset 里写 script / command

§二 分析的现有实现里，Domain invariant 有 `script` 字段、Stack 有 `command` 字段——直接在 Asset 里写可执行脚本/命令。**这个方向是错的**，原因有四：

| 问题 | 说明 |
|---|---|
| **注入风险** | Asset 是 AI 可读的 markdown。如果 Asset 含 shell 脚本，从不可信来源引入 Asset（如 v0.8 Skill Registry）时，shell 注入就是安全漏洞。Asset 里不应有任何可执行代码。 |
| **Asset 与 Engine 执行耦合** | `script: "bun test tests/unit/email-unique.test.ts"` 把 Asset 绑死在具体执行路径上。测试文件改名、bun 换 pnpm、路径变了 → script FAIL，但不是 AI 的错。 |
| **AI 无法区分边界问题 vs 执行问题** | AI Agent 看到 script FAIL，无法判断是"自己的执行问题"还是"Asset 的脚本坏了"——破坏了两层 Proof 的核心价值（区分边界问题 vs AI Agent 问题）。 |
| **动态参数无法写死** | 参数是执行时产生的，不是定义时写死的。DocDomain 定义"创建文档"边界时不知道 AI 会创建什么名字的文档——在 Asset 里写 `params: { path: "docs/xxx.md" }` 是无效的。 |

### 6.2 正确模型：三层分工

```
Asset（能力声明）              AI Agent（参数具象化）           Engine（执行 + 判定）
──────────────                ──────────────────              ──────────────────────
声明：边界可用哪些 Probe       在 Task 编排时：                  Probe 执行：
                               1. 从可用 Probe 中选择             Infra: 跑命令
                               2. 根据实际执行情况设参数           Kernel: 判定（对 AI 不可见）

                                                                → PASSED / FAILED / INCONCLUSIVE
```

**核心收敛**：

| 层 | 职责 | 不做什么 |
|---|---|---|
| **Asset** | 声明可用 Probe（能力清单） | 不写参数，不写脚本，不写命令 |
| **AI Agent** | 在 Work 里编排 Task 时，从可用 Probe 中选择 + 设具体参数 | 不知道判定标准（信息隐藏） |
| **Engine** | Probe catalog 翻译 semanticName → 可执行；Kernel 判定 | 判定标准对 AI 不可见 |

### 6.3 三类边界的映射

#### Domain invariant —— 声明可用 Probe

```markdown
## Invariants
### 密码不能明文存储
- value: 密码任何时候都不能明文存储
- probes: [no-plaintext-secret, fs-content-match]    # 声明可用 Probe（不写参数）

### 测试通过
- value: 核心业务逻辑必须有测试覆盖
- probes: [test-pass]                                  # 声明可用 Probe
```

Asset 只声明"验证这个 invariant 可以用哪些 Probe"，不写具体参数（查什么词、跑哪类测试）。参数由 AI Agent 在 Task 编排时设——因为 AI Agent 知道自己创建了什么文件、写了什么测试。

#### Stack —— 声明语义名，catalog 映射

```markdown
## Stack
### Runtimes
- typescript          # 语义名 → catalog 映射 → ts-compiles Probe
### Linters
- biome               # 语义名 → catalog 映射 → lint-check Probe
### Testers
- bun-test            # 语义名 → catalog 映射 → test-pass Probe
```

Asset 只声明"用 TypeScript / Biome / bun test"（语义名），Engine 的 Probe catalog 负责映射到可执行 Probe。**命令在 catalog 里，不在 Asset 里。** 换工具改 catalog，不动 Asset。

#### Workflow observe —— 声明 Probe 语义名（现状正确）

```markdown
## Slots
### build
- observe: [ts-compiles, lint-check]    # 声明 Probe 语义名
```

Workflow observe 本来就是语义引用，不是脚本——这部分设计本来就对。observe 声明"这个 slot 应该跑哪些 Probe"，具体参数由 AI Agent 在 Task 里设。

### 6.4 参数具象化示例

以 DocDomain（创建文档的边界）为例：

```
Asset (DocDomain):                         AI Agent 在 Task 里:              Engine:
─────────────────                          ──────────────────              ──────────
## Invariants                              Task: 创建 API 文档              Probe 执行:
### 文档必须存在                              part build:                     fs-exists
  - value: 交付的文档必须存在                    skill_context: 写 API 文档        params:
  - probes: [fs-exists]                                      ↓                     path: docs/api-guide.md
                                             AI 写完文档后设参数:              ↓
                                               probe: fs-exists              Infra: 检查文件存在
                                               params:                       Kernel: judge (隐藏)
                                                 path: docs/api-guide.md      ↓
                                               (AI 知道自己创建了这个文件)     → PASSED
```

**关键**：Asset 声明 `probes: [fs-exists]`（能力），AI Agent 在执行后设 `params: { path: "docs/api-guide.md" }`（具象化），Engine 跑 `fs-exists` 判定。Asset 不知道文档名，AI Agent 知道（它创建的），Engine 判定（标准对 AI 不可见）。

### 6.5 信息隐藏的精确边界

| | AI 可见 | AI 不可见 |
|---|---|---|
| Probe 名（semanticName） | ✅ Asset 声明的可用 Probe 列表 | — |
| Probe 参数 | ✅ AI Agent 自己设的 | — |
| 判定标准（verdict strategy） | ❌ | ✅ Kernel 怎么判 PASS/FAIL（如 `hits >= expected`） |
| Probe 是否执行 | ❌ Blueprint observe 决定 | ✅ observe 自动注入 |

**信息隐藏不变**：AI 知道"会用 `fs-exists` 检查某个路径"（因为 Asset 声明了且 AI 自己设了参数），但不知道"`fs-exists` 的判定逻辑是 `hits >= expected`"（Kernel 内部）。AI 能预判"文件存在应该 PASS"，但不能精确到判定算法级别去钻空子。

### 6.6 为什么这个模型解决了所有问题

| 问题 | 怎么解决 |
|---|---|
| 注入风险 | Asset 里只有 Probe 名（字符串），没有可执行代码 |
| Asset 与 Engine 耦合 | Asset 不写命令，命令在 catalog 里；换工具改 catalog 不动 Asset |
| AI 无法区分边界问题 vs 执行问题 | FAIL 来自 `fs-exists`（语义明确"文件不存在"），不是来自"脚本报错" |
| 动态参数（执行时才产生的值） | Asset 不写参数，AI Agent 在 Task 里根据实际执行设参数 |
| 信息隐藏 | AI 设参数（知道查什么），但不知道判定标准（Kernel 怎么判 PASS/FAIL） |

### 6.7 实现路径

| 改动 | 说明 | 对应缺口 |
|---|---|---|
| Domain invariant 改用 `probes` 字段 | Asset 声明可用 Probe 列表，删除 `script` 字段 | 替代缺口 2 的修复方式 |
| Stack 改用语义名 + catalog 映射 | Stack 声明 `typescript` / `biome` / `bun-test`，catalog 映射到 Probe | 缺口 1 |
| Workflow observe 自动注入 | Work create 时从 observe 自动生成 Task 的 Probe 声明（不含参数，参数由 AI 填） | 缺口 3 |
| Probe catalog 扩展 | 新增 `no-plaintext-secret` 等业务语义 Probe | 支撑 Domain invariant |
| Task 模板支持 Probe 参数占位 | Task 生成时 Probe 声明留 params 空位，AI Agent submit 时填 | 支撑参数具象化 |
