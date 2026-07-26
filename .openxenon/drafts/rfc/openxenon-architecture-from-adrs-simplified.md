# OpenXenon 完整架构（从激活 ADR 提取 · 简化版）

> **日期**：2026-07-18
> **状态**：📝 Draft（基于 30 条 Adopted + 5 条 Partially Adopted ADR 整理）
> **来源**：`.openxenon/docs/adrs/` INDEX.md 50 条 ADR（30 Adopted / 5 Partial / 9 Proposed / 6 Superseded）
> **目的**：从架构决策记录反向提取完整架构图景，作为 architecture.md 的补充参考
> **约定**：每节标注来源 ADR 编号，可追溯
> **相对原版 `openxenon-architecture-from-adrs.md` 的差异**：
> - 剥离过时机制：Taint 干扰标记体系、Work V1 沙盒布局、Insight Pool 5 池体系、三模式 AI 执行、Supersession Chain
> - 词汇简化：公证人 → 事实记录者；审计链 → 事后追溯；兰姆达真空 → 纯逻辑内核；四层确定性 → 四层保障；最小信任闭环 → 初版信任闭环

---

## 0. 信任链——OpenXenon 的核心（ADR-0057 / ADR-0058）

> **信任链是 OpenXenon Engine 的"能源"**。没有信任链，OXN 只是任务跟踪器，不是信任协作工具。

### 0.1 三方拓扑（ADR-0057）

```
         工程师                    AI Agent
        (确定性主体)              (概率性主体)
            │                        │
            │  不确定性的协作          │
            │  ← 不可信任 →           │
            │                        │
            ▼                        ▼
         OpenXenon（确定性层）
         ┌─────────────────────┐
         │  Asset (确定性边界)  │
         │  Work (确定性结构)   │
         │  Kernel (确定性验证) │
         │  Proof (确定性证据)  │
         └─────────────────────┘
            │                        │
            ▼                        ▼
    工程师信任 OXN               AI 信任 OXN
    "OXN 出示证据，               "OXN 提供确定性
     告知 AI 执行了什么，           Asset/Work/Kernel，
     哪些在边界内，                我能获取反馈，
     哪些在边界外"                 推理方向是否在边界内"
            │
            ▼
    工程师通过 OXN 信任 AI
```

**核心原则**：

1. 工程师与 AI 原本是两个点协作，协作充满不确定性导致不可信任
2. OpenXenon 加入后分别跟两者建立信任协作
3. 工程师通过 OpenXenon 信任 AI（间接信任链）
4. AI 是否跨越边界是 AI 自己的概率决策；OXN 记录并呈现证据，不阻止

### 0.2 四层保障（ADR-0058）

v0.6.1 = 初版信任闭环——四层保障就位：

| 保障层 | 模块 | 信任职责 | 对应 ADR |
|---|---|---|---|
| **确定性边界** | OXL + Asset | 工程师确定性地定义"可靠" | 0054, 0055, 0056 |
| **确定性验证** | Kernel + Proof | OXN 给出真实验证结果 | 0008, 0031 |
| **确定性证据** | Proof | 不可篡改的执行事实记录 | 0011, 0024 |
| **确定性记录** | Proof + Work | OXN 确定性地记录边界违反 | 0012 |

---

## 1. 四结构实体 E1-E4（ADR-0020）

> **E1-E4 是 OpenXenon 的理念骨架**。E1-E4 定义 OXN 的哲学边界，L0-L3 描述代码的依赖方向。

### 1.1 实体总览（ADR-0020）

| 实体 | 性质 | 主导权 | 对应代码模块 |
|---|---|---|---|
| **E1 Asset** | 静态资产边界 | 工程师 | `packages/engine/src/Asset/` |
| **E2 Work** | 动态协作（IAP 三阶段 + Round） | 工程师 ↔ AI | `Intent/` + `Align/` + `Proof/` |
| **E3 Engine** | 核心引擎 | OXN | L0-L2 全部 |
| **E4 Insight** | 涌现机制 | AI 推理 | `packages/engine/src/Insight/` |

**映射关系**：

| ADR-0020 矩阵 | 职责 |
|---|---|
| Blueprint = Intent | 定义"该做什么" |
| Work = Align | 执行"怎么做" |
| Engine = 记录 | 证明"做了什么" |
| Insight = 反哺 | 涌现"还该做什么" |

### 1.2 E1 Asset——三边界框架（ADR-0054）

E1 Asset 的边界类型明确为 **3 个正交维度**：

| 边界类型 | 约束内容 | IAP 角色 | 引用方式 |
|---|---|---|---|
| **Domain** | 词汇表（term）/ 禁用词（ban）/ 不变量（invariant） | 业务边界（语义约束） | Work 级多选，Task 级单选 |
| **Workflow** | slots / deps / observe | 执行边界（结构约束） | Blueprint `## Refs` 引用 |
| **Stack** | runtimes / linters / testers | 实现边界（环境约束） | Work 级声明，不进 Task |

**kind-isolation 原则**：

- 每种边界类型只引用同类型
- Blueprint 是唯一的跨类型组合实体
- Roadmap 是跨类型的导航索引（meta 层）

### 1.3 E1 Asset——Blueprint 组合模板（ADR-0055）

Blueprint 从"执行模板"提升为**组合模板**——E1 Asset 内的隔离层：

```
3 边界 → Blueprint → Work
（单向依赖层级，变更单向传播）
```

- Work 只引用 Blueprint（单 ref），不再直接引用 3 边界
- Blueprint 通过 `## Refs` 引用 Domain + Workflow + Stack + 其他 Blueprint
- BirthCert `{ blueprints: [...] }`（原 `{ domains, blueprints, stacks }`）
- PlanLock `blueprintsHash` 包含 Blueprint + 3 边界的 composite hash

### 1.4 E1 Asset——AssetKind（v0.6.1）

```ts
type AssetKind = 'domain' | 'workflow' | 'stack' | 'blueprint' | 'roadmap'
```

| 资产 | 定义 | 约束硬度 |
|---|---|---|
| Domain | 业务词汇表（term）、禁令（ban）、不变量（invariant） | parse + term/ban 强校验 |
| Workflow | 执行模板（slot 拓扑 + Probe 标准）——原 Blueprint | DAG 无环校验 + slot 对齐 |
| Stack | 技术环境约束（language/runtime/linter/test） | Proof 阶段直接断言 |
| Blueprint | 组合模板——引用 Domain + Workflow + Stack | `## Refs` 校验（kind-isolation） |
| Roadmap | 跨类型导航索引（meta 层） | scene 表校验 |

### 1.5 E1 Asset——External inline 收敛（ADR-0056）

External 从 Asset 类型降级为边界类型内的 `## Externals` H2 category：

- 仅 Domain/Workflow/Stack 可声明 External（Blueprint 不支持）
- `url`（网络）或 `path`（本地）二选一（互斥）
- `kind` enum：`rest-api | webhook | documentation | library | config | service`
- 状态存储：`.openxenon/.cache/external-status.json`（gitignore）
- 4 种状态：`available | unavailable | stale | unknown`
- 不阻断 Work 执行（仅记录，工程师决定）

### 1.6 E1 Asset——Asset Paper 结构（ADR-0051）

Asset schema 扩展论文结构字段：

```yaml
abstract: |              # 论文摘要
  本文档定义支付核心领域的边界。
references:              # 引用其他 Asset（依赖 DAG 出边）
  - asset: stack-nodejs
citations: 3             # 被引用次数（自动维护）
auditTrail:              # 版本历史
  - version: 1.2.0
    date: 2026-10-15
    author: engineer-X
    changes: 新增 §3.4 幂等性约束
```

### 1.7 E2 Work——IAP 三阶段（ADR-0020）

```
Work (一次完整 IAP 周期)
├── Intent 阶段 (工程师定意图)
│   ├── 创建 work.md
│   ├── 分析需要哪些 Asset 作为边界
│   └── 选择引用 Asset (ref @prj/assets/...)
│
├── Align 阶段 (AI Agent 跑对齐) — Round 多轮
│   ├── Round 1: 拆 N 个 Tasks → 执行 → Proof → verdict
│   ├── verdict fail? → 回到 Intent 调整 → Round 2
│   └── ...
│
├── Proof 阶段 (OXN Engine 出证明)
│   ├── 跑探针 (Probe) — 记录客观事实
│   ├── 产出 verdict（PASSED / FAILED / INCONCLUSIVE）
│   └── 工程师基于 Asset + Proof 决定合格与否
│
└── work finalize → 写 frozen.json → 可供 E4 Insight 消费
```

### 1.8 E2 Work——关键机制

| 机制 | ADR | 说明 |
|---|---|---|
| partId 主键 + atomic-write | 0024 | partId (UUID) 作为 state.json 主键；写入通过 tmp+rename 保证原子性 |
| Work/context.md | 0049 | 替代 .openxenon/memory/，生命周期绑定 Work finalize |
| Starter Work 引导 | 0050 | oxn init 自动创建 Work，通过 IAP 循环产出 starter Assets |

### 1.9 E3 Engine——只记录不评判（ADR-0031）

**Proof = 事实记录者 ≠ 评判者**：

- ✅ 记录发生了什么（exitCode、stdout、stderr）
- ✅ 证明数据完整性（content_hash、planLock）
- ❌ 不评判代码质量
- ❌ 不预测风险
- ❌ 不替 AI 执行

### 1.10 E4 Insight——涌现层（ADR-0015 / ADR-0017）

| 维度 | 说明 |
|---|---|
| 四实体证据链 | Domain / Blueprint / Work / Task 四维度证据收集 |
| 不评判代码质量 | 仅输出工程师决策所需的协作态势信号 |

---

## 2. 工程实现 L0-L3（ADR-0005 / ADR-0009 / ADR-0010 / ADR-0013 / ADR-0037）

### 2.1 分层架构

```
┌────────────────────────────────────────────────────────┐
│  L3: Tools & Applications (工具与应用层)                │
│      CLI (oxn) + Skills (oxn-work) + Daemon            │
│      物理: packages/cli/src/ + .opencode/skills/       │
├────────────────────────────────────────────────────────┤
│  L2: Engine Core Logic (引擎核心业务层)                  │
│      E1-E4 全部实现在此（DDD 模块化）                    │
│      Asset / Intent / Align / Proof / Insight / Pool   │
│      物理: packages/engine/src/<Domain>/               │
├────────────────────────────────────────────────────────┤
│  L1: OXL + Infra (操作基座与语言层)                     │
│      OXL: MD-native DSL 编译器                         │
│      Infra: 文件系统/探针/Socket/OS 操作                │
│      物理: packages/engine/src/oxl/ + infra/           │
├────────────────────────────────────────────────────────┤
│  L0: Kernel (逻辑内核层)                                 │
│      纯逻辑零 IO: Schema / Contract / Verdict          │
│      物理: packages/engine/src/kernel/                 │
└────────────────────────────────────────────────────────┘
```

**依赖规则**：L3 → L2 → L1 → L0（单向，不可反向）

### 2.2 L0 Kernel——纯逻辑内核

Kernel 是纯逻辑内核，零副作用：

| 禁止 | 原因 |
|---|---|
| `fs` / `net` / `child_process` | L0 不可有 IO 副作用 |
| `process.env` / `process.std*` | L0 不可依赖运行环境 |
| `EventEmitter` | L0 不可有状态订阅 |
| Langium 类型（ADR-0013） | L1 contracts 不导出 Langium 类型 |

### 2.3 L0-L1 关键不变量

| 不变量 | ADR | 说明 |
|---|---|---|
| 运行期隔离 | 0003 | frozen.json 是唯一运行期合法产物；Engine 不感知源格式 |
| ProbeObservation vs Verdict | 0008 | 物理事实（L1）与业务判定（L0）严格分离 |
| Trace-before-State | 0009 | 写 state.json 前必须先 append trace.jsonl |
| PathPort 注入 | 0010 | L0 不直接调 path.join；所有路径通过 Port 注入 |
| 证据链三件套 | 0011 | frozen.json + trace.jsonl + state.json |
| L1 无 Langium 泄露 | 0013 | L1 contracts 不导出 Langium 类型 |
| part-resolver 在 L2 | 0037 | 依赖 Arsenal 业务逻辑，从 L0 迁到 L2 |

### 2.4 L1 OXL——MD-native 语法（ADR-0052）

v0.7.0 后 `.md` 是唯一 canonical 格式：

- `.oxn` (Langium) 格式已废弃
- 语法：H1 实体 / H2 分类 / H3 实例 / 嵌套列表子结构
- 编译器：`domain-compiler.ts` / `workflow-compiler.ts` / `blueprint-compiler.ts` / `stack-compiler.ts`
- `@md/` 前缀锁（v0.6.1 PR-2）

### 2.5 L3 Tools

| 组件 | 物理位置 | 职责 |
|---|---|---|
| CLI | `packages/cli/src/commands/` | 薄组合调用层：parse args → 调 L2 → format output |
| Skills | `packages/cli/src/skills/locales/` | AI 助手指令：/oxn-work 统一入口 |
| Daemon | `src/daemon/` | 守护进程：文件监听 + Work 追踪 |

---

## 3. AI 协作哲学（ADR-0012 / ADR-0032）

### 3.1 事后追溯（ADR-0012）

> **"OpenXenon 不生产代码，只生产信任"**

```
Engine (OXN) — Main Agent
   ↓ 调 Sub Agent（AI）执行 Align
Sub Agent (AI)
   ↓ 写 trace.jsonl / state.json（自描述）
   ↓ Engine 记录（不评判对错，只记录"发生了什么"）
```

**与传统"沙箱"的区别**：

| 维度 | 传统沙箱 | OXN 事后追溯 |
|---|---|---|
| 约束时机 | 预防（pre-emptive） | 事后（post-hoc） |
| 失败处理 | 拒绝执行 | 记录并继续 |
| 哲学 | "不该做的不能做" | "做了什么都被记住" |
| AI 自主性 | 低（被约束） | 高（被信任 + 可追溯） |

### 3.2 信息隐藏（ADR-0012 + ADR-0058）

> **AI 只看"该做什么"，不看"该满足什么"**——对抗性设计

| 信息 | 谁可见 |
|---|---|
| Asset term / ban / invariant | AI 可见 |
| Blueprint slot | AI 可见 |
| Part 内 Probe 验证标准 | AI **不可见** |
| frozen.json | AI **不可写** |
| state.json | AI **不可写** |

---

## 4. 关键不变量汇总

### 4.1 架构级不变量

| # | 不变量 | ADR | 层级 |
|---|---|---|---|
| 1 | **运行期隔离**：Engine 只看 frozen.json，不感知源格式 | 0003, 0005 | L0-L1 |
| 2 | **Kernel 纯逻辑**：零 IO、零 Langium、零 fs/net/child_process | 0008, 0010, 0013 | L0 |
| 3 | **证据链顺序**：Trace-before-State（trace 先于 state 写入） | 0009, 0024 | L0-L2 |
| 4 | **证据链三件套**：frozen.json + trace.jsonl + state.json | 0011 | L0-L2 |
| 5 | **事后追溯**：AI 行为留痕可查，不预先限制 | 0012, 0031 | E2-E3 |
| 6 | **@ 寻址纪律**：统一 @ 命名空间，-> 伪指针否决 | 0023 | L1 |
| 7 | **三边界正交**：Domain/Workflow/Stack 互不引用 | 0054 | E1 |
| 8 | **Blueprint 隔离**：唯一跨类型组合实体 | 0055 | E1 |
| 9 | **四层保障**：边界/验证/证据/记录 | 0057, 0058 | 全局 |

### 4.2 依赖方向不变量

```
L3 → L2 → L1 → L0（单向，无循环）

E1 Asset ← ref ← E2 Work → submit → E3 Engine → 反哺 → E4 Insight
                                                    ↑
                                              E4 Insight 涌现
```

---

## 5. 版本路线与架构演进

| 版本 | 架构角色 | 核心 ADR |
|---|---|---|
| **v0.6.1** | 信任链就位 | 0054, 0055, 0056, 0057, 0058 |
| **v0.7** | 信任链效率层 | 0007, 0028 (Daemon + Insight + Token + Hook) |
| **v0.8** | 信任链外部扩展 | Skill Registry + Probe marketplace |
| **v0.9** | 自组织 | 自适应 Blueprint + AI 多样性 |
| **v1.0** | 临界点 | CAS 完整化 + Engine 独立发布 |

---

## → 参考

- [ADR INDEX](../../.openxenon/docs/adrs/INDEX.md) — 50 条 ADR 完整索引
- [三边界框架 RFC](../rfcs/three-boundary-blueprint-elevation-rfc.md) — Domain/Workflow/Stack + Blueprint 提升
- [版本统一 RFC](../rfcs/version-unification-rfc.md) — 信任链叙事 + v0.6.1 初版信任闭环
- [core-concepts.md](../../docs/zh-cn/core-concepts.md) — E1-E4 + L0-L3 完整概念
- [architecture.md](../../docs/zh-cn/architecture.md) — 现有架构文档（E1-E4 + L0-L3 分层）
