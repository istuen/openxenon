---
entity: rfc
id: RFC-0004
theme: work-asset
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0004: docs/adrs/0004-arsenal-resolver-priority-chain.md
  - ADR-0005: docs/adrs/0005-strategic-correction-running-time-isolation.md
  - ADR-0024: docs/adrs/0024-partid-primary-key-atomic-write.md
  - ADR-0025: docs/adrs/0025-task-sandbox-local-vs-namespace.md
  - ADR-0035: docs/adrs/0035-catalog-json-probe-excluded.md
  - ADR-0049: docs/adrs/0049-work-context-md-replaces-memory.md
  - ADR-0050: docs/adrs/0050-onboarding-via-starter-work.md
  - ADR-0051: docs/adrs/0051-asset-paper-citation-network.md
  - ADR-0054: docs/adrs/0054-three-boundary-framework.md
  - ADR-0055: docs/adrs/0055-blueprint-as-composition-template.md
  - ADR-0056: docs/adrs/0056-external-inline-and-status.md
  - ADR-0061: docs/adrs/0061-data-flow-contract.md
  - ADR-0075: docs/adrs/0075-round-loop-as-ai-search-record.md
  - ADR-012: docs/adrs/012-runtime-adapter.md
synced-at: 2026-07-27
---

# RFC-0004: Work / Asset 体系——三边界框架 + Blueprint 组合 + 数据流契约

> **类型**：RFC（OpenXenon 规范）
> **主题**：work-asset
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

OXN 的 Work / Asset 体系总政策——**ArsenalResolver 优先级链**（`@prj/` > `@gbl/` > `@oxn/`）+ **运行期隔离宪法**（Engine 只看 `frozen.json`）+ **三边界框架**（Domain/Workflow/Stack 正交维度）+ **Blueprint 组合模板**（Work 只引 Blueprint，3 边界通过 Blueprint 间接）+ **Asset Paper 4→3 字段**（abstract + references + citations）+ **Blueprint→Work→Task 数据流契约**（7 项决策 P0-P8 全落地 v0.7.3 GA）+ **Round loop AI 搜索行为记录**（maxIterations 软反馈）+ **partId 主键 + atomic-write**（trace-before-state 物理基础）+ **Task 沙箱 + namespace 纪律**（`.` vs `@` 三前缀）+ **Work/context.md 取代 Memory L1**（KV Cache 优化）+ **Onboarding via Starter Work**（init → starter-work IAP 闭环）+ **catalog.json + Probe-excluded**（AI 盲区保护）+ **External inline 收敛**（`## Externals` H2 category）。

## 决策要点

### D1：ArsenalResolver 优先级链（ADR-0004）

资产解析优先级（高到低）：

```
Project (@prj/...)  >  Global (@gbl/...)  >  Builtin (@oxn/...)
```

- 项目级资产可覆盖 builtin
- 工程师可渐进式替换 builtin 实现
- `BUILTIN_*` 常量驻留 L2（不污染 L0/L1）

### D2：运行期隔离宪法（ADR-0005）

Engine / Kernel 严禁感知：
- 源文件格式（YAML / OXN / MD）
- LSP / 编辑器
- CLI / Daemon

**Engine 只看 `frozen.json`**——这是不可妥协的架构边界（不可妥协）。

### D3：partId 主键 + atomic-write（ADR-0024）

Work / Task 状态的主键是 **`partId`**（UUID），不是 `partName`。改 partName 不破坏索引。

**Atomic Write**：
```ts
// ❌ 禁止
fs.writeFileSync(statePath, JSON.stringify(state))

// ✅ 必须
fs.writeFileSync(`${statePath}.tmp`, JSON.stringify(state))
fs.renameSync(`${statePath}.tmp`, statePath)
```

进程崩溃/断电时 tmp → rename 保证要么旧文件完整，要么新文件完整——**无半成品**。

### D4：Task 沙箱豁免 + namespace 纪律（ADR-0025）

`works/<w>/task.oxn` 允许包含本地 Part/Probe 定义（不强制全部从 Arsenal 引用）。

| 前缀 | 含义 |
|---|---|
| `./` | Work 沙箱内本地 |
| `@oxn/` | builtin |
| `@prj/` | 项目级 |
| `@gbl/` | 用户全局 |

**禁止** `@task/` 前缀（避免 namespace 膨胀）。`task.oxn` 是 **patch**（继承 Blueprint，本地覆写优先），OXL 编译时合并。

### D5：catalog.json + Probe-excluded（ADR-0035）

- **catalog.json 而非 catalog.md**：JSON 便于机器解析（CI / Skill 自动校验）；位于 `.openxenon/assets/catalog.json`（不入 git）
- **Probe 不入 catalog**：Probes 是"AI 盲区"（不应让 AI 看见全部 Probe 再选择性调用），仅 Asset（Domain / Blueprint / Stack）入 catalog
- **`oxn arsenal list`**：CLI 必须提供列出当前可见的 Asset 集合

### D6：Work/context.md 取代 Memory L1（ADR-0049）

`works/<work-id>/context.md` 是 Work 内的"短期记忆"——v0.7.x Memory RFC 反弹后的承载方案：

```
[1. System Instruction]              ← Stable
[2. assets/* (Stable Prefix)]       ← Stable per-project
[3. works/<id>/context.md (Stable per-Work)]   ← Stable per-Work
[4. Loop Tail (Dynamic)]             ← 每轮追加
```

context.md Work 周期内稳定（仅关键节点变化）→ KV Cache 优化：Stable Prefix。Work finalize 后 context.md 冻结。

**反模式**：
- ❌ context.md 回写项目级 Asset 内容（破坏 KV Cache 前缀稳定）
- ❌ context.md 包含完整 Loop 全文（Token 爆炸）
- ❌ context.md 包含时间戳等易变元数据到前缀部分

### D7：Onboarding via Starter Work（ADR-0050）

新项目引导通过 **starter-work**（一个 Asset 模式 Work）自动产出 starter Asset：

```bash
$ oxn init --ai opencode
# → .openxenon/ 创建
# → 自动创建 starter-work: w-onboarding-<timestamp>
# → Work 类型: asset (--type asset)
# → Work intent: "生成项目 starter Asset"

# AI 跑 IAP 闭环
# Intent: 生成 starter Asset
# Align: 1. read_file(README.md) → 推断项目类型
#        2. read_file(package.json) → 推断 tech stack
#        3. 生成 3 个 starter Asset（domain + blueprint + stack）
# Proof: → oxn domain/blueprint/stack validate
```

不走 5 步交互向导，Onboarding 走标准 Work 流程（IAP 闭环）。

### D8：Asset Paper 4→3 字段（ADR-0051，auditTrail 部分被 ADR-0071 废除）

| 字段 | 含义 | 自动维护 |
|---|---|---|
| `abstract` | Asset 的 Intent 摘要 | 工程师手动 |
| `references[]` | 引用其他 Asset（依赖 DAG 出边） | 工程师手动 |
| `citations` | 被引用次数 | ✅ 自动（静态扫） |

`auditTrail` 已废除（ADR-0071 合并入 RFC-0008），版本历史归 git。

**引用计数 + DAG 校验**（v0.7.1 优化）：
- 静态扫：`oxn asset validate` 触发 → computeCitations
- 动态监听：Asset 新增/修改/删除触发增量重算
- DAG 校验：循环引用检测（A → B → A 抛 `IAPError INFRA_FAIL`）

### D9：三边界框架（ADR-0054）

**E1 Asset 的边界类型明确为 3 个正交维度**：

| 边界类型 | 约束内容 | IAP 角色 |
|---|---|---|
| **Domain** | term / ban / invariant | 业务边界（语义约束） |
| **Workflow** | slots / deps / observe | 执行边界（结构约束） |
| **Stack** | runtimes / linters / testers | 实现边界（环境约束） |

**约束**：每种边界类型只引用同类型（kind-isolation）；Blueprint 是唯一的跨类型组合实体；Roadmap 是跨类型的导航索引（meta 层）。

### D10：Blueprint 组合模板（ADR-0055）

**新 Blueprint = 组合模板**（E1 Asset 类型）：

```markdown
## Refs
- domain: payment-core
- workflow: ci-pipeline
- stack: nodejs
- blueprint: shared-qa-gate    # 嵌套组合
```

**Work 引用简化**：
- Work `## Refs` 只声明 `blueprint: <bp>`（一个 ref）
- BirthCert `{ blueprints: [...] }`（原 `{ domains, blueprints, stacks }`）
- PlanLock `blueprintsHash` 包含 Blueprint + 3 边界的 composite hash
- 单向依赖层级：`3 边界 → Blueprint → Work`

### D11：External inline 收敛（ADR-0056）

External 从 Asset 类型降级为边界类型内的 `## Externals` H2 category：

```markdown
## Externals
- name: payment-gateway
  url: https://api.stripe.com
  kind: rest-api
  status: available
  reason: "Production dependency"
```

**规则**：仅 Domain/Workflow/Stack 可声明 External（Blueprint 不支持——组合层不应有外部依赖）；`url`（网络）或 `path`（本地）二选一；`kind` enum 6 值。

**状态管理**：存储 `.openxenon/.cache/external-status.json`（gitignore）；4 种状态 `available | unavailable | stale | unknown`；不阻断 Work 执行（仅记录）。

### D12：Blueprint → Work → Task 数据流契约（ADR-0061）

ADR-0061 7 项决策 D1-D7 全部 runtime 落地（v0.7.3 GA）：

| Decision | 含义 | Phase |
|---|---|---|
| **D1** | Task.domain 主/背景视角（保留单值字段，语义升级） | P3 alpha.3 |
| **D2** | 多 Domain 同名 term 块状 + `[Domain]` 标注 | P3 alpha.3 |
| **D3** | Boundary.observe vs Task.probes lock-check（`IAP_INTENT_PROBE_OUT_OF_BOUNDARY`） | P4 alpha.3 |
| **D4** | Workflow.slot DAG vs Task.deps DAG 闭包校验 | P5 beta.1 |
| **D5** | Stack.tools 注入 Probe runtime（自动 `bun` 前缀） | P6 beta.1 |
| **D6** | `## Refs` legacy `kind: domain` 软警告（v0.8.0 hard cut） | P7 GA |
| **D7** | PlanLock hash 公式不动 + work-context-builder 读 blueprints.json | P1 alpha.2 |

### D13：Round loop 是 AI 搜索行为（ADR-0075）

**Round loop 定位修订**——从 OXN 强制机制改为 AI 搜索行为记录：

| 维度 | 原设计（被修订） | 本 ADR |
|---|---|---|
| 搜索主体 | OXN（通过 Round 机制） | AI Agent |
| OXN 角色 | 控制循环（maxIterations 硬限） | 记录 + 提供反馈 |
| Round 触发 | OXN 强制（`next-round` CLI） | AI 决定（OXN 记录之） |
| 终止判据 | maxIterations 硬限 + verdict PASSED | AI 认为目标完成（OXN 记录 verdict 事实） |

**maxIterations 从硬限改为 Blueprint 配置 + 软反馈**：
- Blueprint `loopPolicy.maxIterations`（工程师定义建议上限）
- AI 自行决定是否遵守，OXN 不强制阻断
- 超限写反馈信号到 trace + state（LLM 推理异常信号）

**与审计链哲学一致性**：Round loop 记录不强制（ADR-0012/0068/0066/0067 同一设计哲学延续）。

### D14：Runtime 适配层——Node 18+ 兜底 + Bun 加速（ADR-012，历史）

**Runtime 双轨策略**：

| Runtime | 角色 | 加速特性 |
|---|---|---|
| **Node 18+** | 兜底（fallback） | 标准 npm 兼容，所有用户可直接 `npx` |
| **Bun** | 加速（primary） | 启动快 4x / 安装快 25x / 内置 TypeScript |

#### 选型理由

1. **兜底必要**：用户可能在没装 Bun 的 CI 环境用 Node 跑 `npx oxn`，OXN 必须能跑
2. **Bun 加速**：开发态跑 `bun run oxn` 比 `node dist/cli.js` 快 4x 启动，Bun 内置 TS/JSX
3. **隔离 L0 / L1 Runtime**：Kernel 真空约束（RFC-0002 D1）禁 IO，L0 代码 runtime-agnostic；L1-Infra 提供 Node / Bun 双实现（RFC-0002 D10）

#### 适配层结构

```
packages/
├── engine/                 # L0 + L1（runtime-agnostic Kernel + 双实现 Infra）
├── cli/                    # L3 CLI（Bun 编译为单文件 binary）
└── shared/                 # L0 共享 schema/contract
```

#### Runtime 检测路径

```ts
// packages/cli/src/runtime/index.ts
const runtime = process.versions.bun ? 'bun' : 'node'
const fs = runtime === 'bun' ? new BunFsPort() : new NodeFsPort()
```

#### 落地状态

- ✅ CLI 双 runtime 兼容（`bun build --target=node` + Bun-native 两种 build 路径）
- ✅ L1-Infra 提供 Node / Bun 双实现（NodeFsPort + BunFsPort）
- ✅ Kernel runtime-agnostic（`bun scripts/validate-dependencies.ts` 守 L0 禁 fs/net/child_process）
- ✅ Lockfile `bun.lock`（Bun 官方推荐）+ `package.json` engines 声明

**与 RFC-0002 D1 LambdaVacuum 一致**：Kernel 不感知 runtime，L1-Infra 适配 runtime，CLI 选择 runtime。

## 影响范围

- ✅ 13 ADR 全 Accept（ADR-0071 部分 Superseded 已合并入 RFC-0008）
- ✅ v0.6.1-alpha.4 三边界框架落地（AssetKind 6→5）
- ✅ v0.7.3 GA Blueprint→Work→Task 数据流契约 P0-P8 全落地
- ✅ catalog.json 已落实；Probe 不入 catalog 已落实
- ✅ ArsenalResolver 优先级链在 `src/builtin/` + `.openxenon/assets/` 已落实
- ✅ partId 主键 + atomic-write + Trace-before-State 全栈统一
- ✅ Runtime 适配层 Node 18+ 兜底 + Bun 加速已落实（ADR-012 历史决策）
- 📝 v0.8.0 `kind: domain` deprecation hard cut
- 📝 `dual-state-exec.ts` maxIterations 软反馈改造

## 相关术语

- [Asset](/glossary/zh-cn/asset-terms.html#asset) — E1 静态边界
- [Work](/glossary/zh-cn/work-terms.html#work) — E2 动态协作
- [Blueprint](/glossary/zh-cn/asset-terms.html#blueprint) — 跨 AssetKind 组合模板
- [Domain](/glossary/zh-cn/core-terms.html#domain) — 业务边界
- [Probe](/glossary/zh-cn/proof-terms.html#probe) — 验证传感器
- [Part](/glossary/zh-cn/work-terms.html#part) — Task 内执行单元
- [PlanLock](/glossary/zh-cn/asset-terms.html#planlock) — Asset 创建后强校验卡
- [Built-in Asset](/glossary/zh-cn/project-terms.html#built-in-asset) — `@oxn/` scope 内置

## 相关决策

- [ADR-0004](../../adrs/0004-arsenal-resolver-priority-chain.md) — ArsenalResolver 优先级链（2026-05-26）
- [ADR-0005](../../adrs/0005-strategic-correction-running-time-isolation.md) — 运行期隔离宪法（2026-05-21）
- [ADR-0024](../../adrs/0024-partid-primary-key-atomic-write.md) — partId 主键 + atomic-write（2026-05-21）
- [ADR-0025](../../adrs/0025-task-sandbox-local-vs-namespace.md) — Task 沙箱豁免（2026-05-22）
- [ADR-0035](../../adrs/0035-catalog-json-probe-excluded.md) — catalog.json + Probe-excluded（2026-05-28）
- [ADR-0049](../../adrs/0049-work-context-md-replaces-memory.md) — context.md 取代 Memory（2026-07-05）
- [ADR-0050](../../adrs/0050-onboarding-via-starter-work.md) — Onboarding via Starter Work（2026-07-05）
- [ADR-0051](../../adrs/0051-asset-paper-citation-network.md) — Asset Paper 4→3 字段（2026-07-05）
- [ADR-0054](../../adrs/0054-three-boundary-framework.md) — 三边界框架（2026-07-10）
- [ADR-0055](../../adrs/0055-blueprint-as-composition-template.md) — Blueprint 组合模板（2026-07-10）
- [ADR-0056](../../adrs/0056-external-inline-and-status.md) — External inline（2026-07-10）
- [ADR-0061](../../adrs/0061-data-flow-contract.md) — 数据流契约 P0-P8（2026-07-17）
- [ADR-0075](../../adrs/0075-round-loop-as-ai-search-record.md) — Round loop AI 搜索行为（2026-07-23）
- [ADR-012](../../adrs/012-runtime-adapter.md) — Runtime 适配层 Node 18+ 兜底 + Bun 加速（2026-05-08，历史 ADR → RFC D14 记录双轨策略）

## Errata

### v1.0.1 (2026-07-26)

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

### 2026-07-27 errata

- **新增 D14 Runtime 适配层**：ADR-012（历史）内容已并入 RFC 正文。Node 18+ 兜底 + Bun 加速的双轨策略与 L0 LambdaVacuum 一致——Kernel 不感知 runtime，L1-Infra 适配 runtime，CLI 选择 runtime。
- **frontmatter related 增补**：ADR-012。
- **影响范围段**：增补 Runtime 适配层落地声明。

> 本段用于后续追加修正说明。核心决策自 RFC-0004 Accepted 起冻结。