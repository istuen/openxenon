---
entity: skeleton
target-entity: rfc
id: RFC-XXXX
theme: stack-operation-referent
status: Draft
date: 2026-08-07
promote-target: rfc
created-from: draft-skeleton-fork@0.1.0
synced-at: 2026-08-07
---

# RFC-XXXX: Stack Operation 参照系

> 把 `bun test` / `bun build` 等确定性命令从 Blueprint slot 的 observe（验证参照）分离为 operate（执行参照），让 AI Agent 在 Task 内零推理拿到应运行的命令。

## 决策要点

- **Operation** = Stack Tool 的命名调用声明（name + command template + desc），住进 Stack Tool 的 `## operations` 子段
- **Blueprint slot** 新增 `operate: [op-name...]` 数组，与 `observe: [probe-name...]` **正交**（设计上独立，实践中常成对）
- **operate = 参照**（告诉 AI 该跑什么，不强制）；**observe = 门禁**（OXN 跑 Probe 验证，PlanLock 锁）
- **确定性到 command 级别** — AI 知道跑 `bun test` 就够；参数 AI 自己填
- **PlanLock 随 Blueprint 已有** — 不新增 hash；drift 由现有 `blueprintsHash` 检测
- **运行时注入只到 operation 名** — AI 从 Stack 自取 command；注入路径与 RFC-0022 P6 `stackTools` 平行
- **名冲突 lock 期消歧** — 不可解析 → `IAP_INTENT_OPERATION_NOT_FOUND`；多 tool 重名 → `IAP_INTENT_OPERATION_AMBIGUOUS`（要求 `tool:operation` 限定名）

## 影响范围

- **Asset 层**
  - `.openxenon/assets/stacks/*.md` — 每 Tool 新增 `operations` 子段
  - `.openxenon/assets/blueprints/*.md` — slot 新增 `operate` 数组 + Context Template 加 `operations:` 行
- **Domain 层**
  - `.openxenon/assets/domains/oxn-asset-domain.md` — 新增 `Operation` term + `inv-27: operate-⊆-stack-operations` + `inv-28: operation-disambiguation`
  - `.openxenon/assets/domains/oxn-work-domain.md` — 新增 `operate` term + `inv-36: operate-is-reference-not-gate`
- **Engine 层**
  - `kernel/contracts/probe-port.ts` — `StackToolInfo` 加 `operations?: StackOperationInfo[]`
  - `oxl/md-pipeline/transformers/blueprint.ts` — `BlueprintBoundary` 加 `operate: string[]`；`extractBoundary()` 加 operate 解析
  - `oxl/md-pipeline/oxn-serializer.ts` — 加 operate 序列化
  - `Work/work-context-builder.ts` — `parseStackTools()` 加 operations 子段解析；`renderContextHuman()` 加 Operations 段
  - `Work/work-validator.ts` — lock 期 operate 校验
- **RFC / ADR**
  - `docs/rfc/zh-cn/RFC-0023-stack-operation-referent.md` — 本 RFC promote 目标
  - `docs/adrs/0091-stack-operation-as-execution-referent.md` — 决策记录

## 相关术语

- **Operation**（oxn-asset-domain 新增）— Stack Tool 的命名调用声明
- **operate**（oxn-work-domain 新增）— Blueprint slot 内执行参照数组
- **Observe / Probe**（已有）— 验证参照，OXN 自跑
- **StackToolInfo**（kernel/contracts/probe-port.ts）— Stack tool 运行时快照，新增 operations 子字段
- **StackTool**（oxn-stack.md ## Tools）— 工具实体声明
- **BlueprintBoundary**（oxl/md-pipeline/transformers/blueprint.ts）— 编排单元，新增 operate 字段

## 相关决策

- **ADR-0054** 三边界框架 — Stack = 实现边界，本次扩展其 `## Tools` 段语义
- **ADR-0072** Referent 模型 — 六个参照锚点之一"CLI 调用参照动作"，本次落地
- **ADR-0084** 协作边界分层 — Asset 暴露调用契约 ≠ 代码修改（Operation 符合此原则）
- **RFC-0022** 理想态数据流 — D5/P6 stackTools 注入 ProbeRunner，本次 operate 注入 Task context 与之平行
- **design-blueprint-context-template** Draft（2026-08-06）— Context Template 设计，本次 Task Context 加 `operations:` 行与之对称

## Errata

<!-- status: Draft → 经 grilling → Accepted 后冻结,仅可追加 errata 段,version bump patch -->

---

## 附录 A：Grilling Session 决策记录（5 轮 13 项）

### 第一轮：核心张力（术语 / 归属 / Probe 关系）

| # | 决策 | 选项 |
|---|---|---|
| D1 | 术语 = **Operation**（操作） | 复用 Referent 模型"动作"锚点；与 Probe（传感器参照）对称 |
| D2 | 归属 = **Stack 内新段 + Blueprint slot 引用** | 不新增 6th AssetKind（守住 inv-1 五类白名单） |
| D3 | 与 Probe = **可独立，可选配对** | 设计正交，实践常成对 |

### 第二轮：observe/operate 冗余 + operate 语义 + Stack 结构

| # | 决策 | 选项 |
|---|---|---|
| D4 | operate/observe 冗余 = **设计上正交，实践中常成对** | AI 跑 Operation 是工作流（先自检），OXN 跑 Probe 是独立证据 |
| D5 | operate 语义 = **参照+验证门禁分层** | operate = 参照（声明不强制），observe = 门禁（PlanLock 锁）；与 ADR-0066/0067 一致 |
| D6 | Stack 结构 = **Tool 内嵌子段** | 不增 `## Operations` H2 段，每个 Tool 下挂 `operations:` 子段 |

### 第三轮：数据流 + 命名 + 参数化

| # | 决策 | 选项 |
|---|---|---|
| D7 | 运行时注入 = **只注入名，AI 自取 command** | 轻量；与 stackTools 注入路径平行；AI 跨层查找但不推理 |
| D8 | 命名 = **各自独立命名，语义不同** | Operation 用动词原形（test/lint/build）；Probe 用结果态（test-pass/lint-check） |
| D9 | 参数化 = **Stack 声明模板 + AI 运行时填** | command 模板带 `$VAR`；AI 读代码自行填值 |

### 第四轮：确定性深度追问

| # | 决策 | 选项 |
|---|---|---|
| D10 | 确定性级别 = **到 command 级就够** | AI 知道跑 `bun test` 即可；参数是其专业能力 |
| D11 | PlanLock = **随 Blueprint 被锁（已有）** | 无新 hash；drift 由现有 `blueprintsHash` 检测 |
| D12 | Context Template = **Task Context 加 operations 行** | 与 `acceptance:` 对称；AI 同时看到要跑什么 + 要过什么 |

### 第五轮：边界 case + Domain 归属 + 落地形态

| # | 决策 | 选项 |
|---|---|---|
| D13 | git/外部命令 = **先放 oxn-stack**（未来独立 git-stack） | Blueprint 当前只支持单 stack ref；多 stack ref 待后续 RFC |
| D14 | 名冲突 = **lock 期消歧校验** | IAP_INTENT_OPERATION_AMBIGUOUS → 要求 `tool:operation` 限定名 |
| D15 | 落地 = **Draft → RFC + ADR** | 走 design-blueprint-context-template 同路径 |

---

## 附录 B：数据流示意

```
Stack ## Tools
  ### bun-test
    - command: "bun test"
    - operations:
      - test: "bun test" — 全量测试
      - test-filtered: "bun test --filter $PATTERN" — 按过滤器跑
        ↓
Blueprint ## Boundaries
  ### verify
    - operate: [lint, typecheck, test]              ← 🆕 执行参照
    - observe: [lint-check, ts-compiles, test-pass] ← 已有 验证门禁
        ↓
work-context-builder.ts (lock 期)
  → BlueprintIR.boundaries[].operate 解析
  → 匹配 Stack tool.operations
  → WorkContextResult.slotOperations: ["lint", "typecheck", "test"]
        ↓
Task context (AI Agent 看到)
  ## Operations to run
  - lint → biome: `bun run check`
  - typecheck → typescript: `bun run typecheck`
  - test → bun-test: `bun test`
  ## Acceptance (OXN will verify)
  - lint-check, ts-compiles, test-pass
```

## 附录 C：开放问题（待 RFC 阶段 / 后续 RFC 处理）

1. **多 Stack ref**：Blueprint 当前只支持单一 stack ref；git 命令暂放 oxn-stack，未来独立 `git-stack` 需 Blueprint 支持多 stack ref（待后续 RFC）
2. **Stack OXL transformer 升级**：当前 Stack 解析走 `parseStackTools` 轻量 regex（work-context-builder.ts:313），不走 OXL md-pipeline transformer。operations 子段是否需要升级为正式 Stack transformer？（与 RFC-0022 P2 Domain regex→mdast 切换同类问题）
3. **Skill 层联动**：`/oxn-work` Skill instruction 是否需要教 AI "看到 operate 列表时去 Stack 取 command"？（Skill 维护流：改 instruction → `oxn init -f`）
4. **Token 预算**：Task context 加 Operations 段会增加多少 token？需类似 RFC-0022 §5.1 的预算评估

## 附录 D：参考资料

- RFC-0022 §2.3（D5 决策 + P6 落地）：Stack.tools 注入 Probe runtime
- RFC-0018 附录 A：R&N 32 术语对照（action 选择函数 vs OXN 被动响应）
- ADR-0072：OXN Engine = 确定性参照系，不是智能体
- ADR-0084：协作边界分层（Asset 暴露调用契约 ≠ 代码修改）
- ADR-0089：项目消费者 onboarding 5 起手 Asset
- design-blueprint-context-template Draft：Context Template 设计先例
- `[grilling session 2026-08-07]`：本文档来源