---
entity: rfc
id: RFC-0024
theme: stack-operation-referent
status: Accepted
date: 2026-08-07
accepted: 2026-08-07
supersedes: []
superseded-by: ~
related:
  - ADR-0091: docs/adrs/0091-stack-operation-as-execution-referent.md
  - ADR-0072: docs/adrs/0072-referent-model.md
  - ADR-0084: docs/adrs/0084-collaboration-boundary-layering.md
  - RFC-0022: docs/rfc/zh-cn/RFC-0022-ideal-data-flow.md
  - RFC-0018: docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md
promoted-from: .openxenon/drafts/design-stack-operation-referent.md
synced-at: 2026-08-07
---

# RFC-0024: Stack Operation 参照系

> 把 `bun test` / `bun build` 等确定性命令从 Blueprint slot 的 observe（验证参照）分离为 operate（执行参照），让 AI Agent 在 Task 内零推理拿到应运行的命令。

## 决策要点

- **Operation** = Stack Tool 的命名调用声明（name + command template + desc），住进 Stack 文件 `## Tools ### <tool>` 下的 `operations` 子段
- **Blueprint slot** 新增 `operate: [op-name...]` 数组，与 `observe: [probe-name...]` **正交**（设计上独立，实践中常成对）
- **operate = 参照**（告诉 AI 该跑什么，不强制）；**observe = 门禁**（OXN 跑 Probe 验证，PlanLock 锁）
- **确定性到 command 级别** — AI 知道跑 `bun test` 就够；参数 AI 自己填
- **PlanLock 随 Blueprint 已有** — 不新增 hash；drift 由现有 `blueprintsHash` 检测
- **运行时注入只到 operation 名** — AI 从 Stack 自取 command；注入路径与 RFC-0022 P6 `stackTools` 平行
- **名冲突 lock 期消歧** — 不可解析 → `IAP_INTENT_OPERATION_NOT_FOUND`；多 tool 重名 → `IAP_INTENT_OPERATION_AMBIGUOUS`（要求 `tool:operation` 限定名）

## 影响范围

### Asset 层

- `.openxenon/assets/stacks/*.md` — 每 Tool 新增 `operations` 子段
- `.openxenon/assets/blueprints/*.md` — slot 新增 `operate` 数组 + Context Template 加 `operations:` 行

### Domain 层

- `.openxenon/assets/domains/oxn-asset-domain.md` — 新增 `Operation` term + `inv-27: operate-subset-stack-operations` + `inv-28: operation-disambiguation`
- `.openxenon/assets/domains/oxn-work-domain.md` — 新增 `operate` term + `inv-36: operate-is-reference-not-gate`

### Engine 层

- `kernel/contracts/probe-port.ts` — `StackToolInfo` 加 `operations?: StackOperationInfo[]`；新增 `StackOperationInfo` 类型
- `oxl/md-pipeline/transformers/blueprint.ts` — `BlueprintBoundary` 加 `operate: string[]`；`extractBoundary()` 加 operate 解析
- `oxl/md-pipeline/oxn-serializer.ts` — 加 operate 序列化
- `Work/per-work-blueprints-merger.ts` — `SlotSlimSchema` 加 operate 字段；`.md` 与 `.oxn` 解析都加 operate
- `Work/work-context-builder.ts` — `parseStackTools()` 加 operations 子段解析；新增 `loadSlotOperationsFromBlueprint()`；`renderContextHuman()` 加 Operations 段；WorkContextResult 加 `slotOperations` 字段

### RFC / ADR

- `docs/rfc/zh-cn/RFC-0024-stack-operation-referent.md` — 本 RFC（Accepted 2026-08-07）
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
- **design-stack-operation-referent** Draft（2026-08-07）— 本 RFC 来源

## Grilling Session 决策记录（5 轮 13 项）

### 第一轮：核心张力（术语 / 归属 / Probe 关系）

| # | 决策 |
|---|---|
| D1 | 术语 = **Operation**（操作）— 复用 Referent 模型"动作"锚点；与 Probe（传感器参照）对称 |
| D2 | 归属 = **Stack 内新段 + Blueprint slot 引用** — 不新增 6th AssetKind（守住 inv-1 五类白名单） |
| D3 | 与 Probe = **可独立，可选配对** — 设计正交，实践常成对 |

### 第二轮：observe/operate 冗余 + operate 语义 + Stack 结构

| # | 决策 |
|---|---|
| D4 | operate/observe 冗余 = **设计上正交，实践中常成对** — AI 跑 Operation 是工作流（先自检），OXN 跑 Probe 是独立证据 |
| D5 | operate 语义 = **参照+验证门禁分层** — operate = 参照（声明不强制），observe = 门禁（PlanLock 锁） |
| D6 | Stack 结构 = **Tool 内嵌子段** — 不增 `## Operations` H2 段，每个 Tool 下挂 `operations:` 子段 |

### 第三轮：数据流 + 命名 + 参数化

| # | 决策 |
|---|---|
| D7 | 运行时注入 = **只注入名，AI 自取 command** — 轻量；与 stackTools 注入路径平行 |
| D8 | 命名 = **各自独立命名，语义不同** — Operation 动词原形（test/lint/build）；Probe 结果态（test-pass/lint-check） |
| D9 | 参数化 = **Stack 声明模板 + AI 运行时填** — command 模板带 `$VAR`；AI 读代码自行填值 |

### 第四轮：确定性深度追问

| # | 决策 |
|---|---|
| D10 | 确定性级别 = **到 command 级就够** — AI 知道跑 `bun test` 即可；参数是其专业能力 |
| D11 | PlanLock = **随 Blueprint 被锁（已有）** — 无新 hash；drift 由现有 `blueprintsHash` 检测 |
| D12 | Context Template = **Task Context 加 operations 行** — 与 `acceptance:` 对称 |

### 第五轮：边界 case + Domain 归属 + 落地形态

| # | 决策 |
|---|---|
| D13 | git/外部命令 = **先放 oxn-stack**（未来独立 git-stack） — Blueprint 当前只支持单 stack ref |
| D14 | 名冲突 = **lock 期消歧校验** — IAP_INTENT_OPERATION_AMBIGUOUS → 要求 `tool:operation` 限定名 |
| D15 | 落地 = **Draft → RFC + ADR** — 走 design-blueprint-context-template 同路径 |

## 数据流示意

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
  → WorkContextResult.slotOperations: [{slot: "verify", operations: ["lint", "typecheck", "test"]}]
        ↓
Task context (AI Agent 看到)
  ## Operations to run
  - slot=verify: [lint, typecheck, test]
  ## Stack Tools (含 operations 子段)
  - biome
      · op lint: bun run check
  - typescript
      · op typecheck: bun run typecheck
  - bun-test
      · op test: bun test
  ## Acceptance (OXN will verify)
  - lint-check, ts-compiles, test-pass
```

## 开放问题（待后续 RFC 处理）

1. **多 Stack ref**：Blueprint 当前只支持单一 stack ref；git 命令暂放 oxn-stack，未来独立 `git-stack` 需 Blueprint 支持多 stack ref
2. **Stack OXL transformer 升级**：当前 Stack 解析走 `parseStackTools` 轻量 regex（work-context-builder.ts:354+），不走 OXL md-pipeline transformer。operations 子段是否需要升级为正式 Stack transformer？（与 RFC-0022 P2 Domain regex→mdast 切换同类问题）
3. **Skill 层联动**：`/oxn-work` Skill instruction 是否需要教 AI "看到 operate 列表时去 Stack 取 command"？（Skill 维护流：改 instruction → `oxn init -f`）
4. **Token 预算**：Task context 加 Operations 段会增加多少 token？需类似 RFC-0022 §5.1 的预算评估

---

## 实施：work-validator operate 校验落地（inv-27 + inv-28 Engine 端）

为避免"半截工程"（纸面规范无 runtime 强制），本 RFC 同步落地 Engine 端 lock 期校验。

### 错误码

| 错误码 | 触发条件 | 错误信息字段 |
|---|---|---|
| `IAP_INTENT_OPERATION_NOT_FOUND` | slot.operate[] 项 name 不在 Blueprint 引用 Stack 的 tool.operations 集合内 | `{ slot, missing: name, stackRefs: [...] }` |
| `IAP_INTENT_OPERATION_AMBIGUOUS` | 同一 name 在 Blueprint 引用的 Stack 集合内出现 ≥ 2 次 | `{ slot, ambiguousName, candidates: ['tool1:name', 'tool2:name'] }` |

### 校验算法

```
validateOperateReferences(blueprintIR, stackRefs):
  # Step 1: 加载 Stack IR（union of all referenced Stack tool.operations）
  operationIndex = new Map<opName, Array<{stack, tool, op}>>()
  for stackRef in blueprintIR.stackRefs:
    stackIR = parseStack(stackRef.file)
    for tool in stackIR.tools:
      for op in (tool.operations ?? []):
        operationIndex.get(op.name) ??= []
        operationIndex.get(op.name).push({stack: stackRef.name, tool: tool.name, op})

  # Step 2: 校验每个 slot.operate[] 项
  errors = []
  for slot in blueprintIR.boundaries:
    for opName in slot.operate:
      if isQualifiedName(opName):  # 'tool:operation' 形式直接定位，跳过消歧
        [tool, op] = opName.split(':')
        if not operationIndex.get(op)?.some(c => c.tool === tool):
          errors.push({code: 'IAP_INTENT_OPERATION_NOT_FOUND', slot, missing: opName})
        continue
      candidates = operationIndex.get(opName) ?? []
      if candidates.length == 0:
        errors.push({code: 'IAP_INTENT_OPERATION_NOT_FOUND', slot, missing: opName})
      elif candidates.length > 1:
        errors.push({code: 'IAP_INTENT_OPERATION_AMBIGUOUS', slot, ambiguousName: opName, candidates})

  return errors
```

### 实现位置

- `packages/engine/src/Work/work-validator.ts` — 新增 `validateOperateReferences()` 函数
- `lock()` 入口按顺序调用：`validateDag` → `validateScope` → **`validateOperateReferences`**
- 错误抛出用 `IAPError` 现有契约（YIELD_TO_HUMAN 行动）

### 测试

- `Work/__tests__/work-validator-operate.test.ts` 新增
- 覆盖：单 Stack 单 tool 单 op（通过）/ 单 Stack 多 tool 同名（消歧）/ 跨 Stack 同名（消歧）/ 未声明 op（NOT_FOUND）/ 限定名 tool:op（通过）/ 空 operate[]（通过）

## Errata

<!-- status: Accepted 2026-08-07 -->