# Design: Blueprint Context Template + Scope + PlanLock 5-hash

- **DraftType**: design（设计稿）
- **状态**: draft（grilling session 收束，待 promote 为 RFC）
- **创建日期**: 2026-08-06
- **主题**: 蓝图作为上下文工程元结构 — Work Context / Task Context / Scope 声明 / PlanLock 5-hash
- **关联**: `dev/assets-design-1.md`, `dev/assets-design-2.md`
- **Grilling 来源**: 2026-08-06 `/grilling` session（domain-modeling 技能）

---

## 1. 背景与目标

OpenXenon 当前（v0.6.3）已有 3-hash PlanLock + 蓝图 `## Use` / `## Boundaries` 结构。蓝图承载**聚合 + 结构**（引用哪些 Domain/Workflow/Stack + Slot 拓扑），但 Work 级上下文（context.md）几乎是空壳（只有 goal + max_iterations），Task 级 skill_context 是自由文本，无结构。

工程师给 AI Agent 下达任务时，脑中"显然"的业务规则、架构约束、文件边界**不会自动外化**。AI Agent 必须自己读 Blueprint 引用的所有 Asset 文件、自己拼接上下文、自己判断哪些 Terms/Invariants 与本 Work 相关。这导致：

1. **知识诅咒** — 工程师认为"显然"的上下文，AI Agent 不知道
2. **上下文不稳定** — 同一 Blueprint 的 N 个 Work，AI Agent 写出的 context.md 结构各异
3. **无文件边界** — Scope（允许/禁止修改的文件）当前完全没有 Blueprint 级声明，靠 PlanLock 事后 hash 检测

本文设计 **Blueprint = 上下文工程元结构**，让 Work/Task Context 在 PlanLock 保护下保持结构稳定、目标聚焦。

---

## 2. 核心设计

### 2.1 Blueprint 扩展 2 个新段

| 段 | 职责 | 谁写 |
|---|---|---|
| `## Use` | 聚合 — 引用哪些 Domain/Workflow/Stack | 工程师（已有） |
| `## Boundaries` | 结构 — Slot 拓扑 + observe + deps | 工程师（已有） |
| `## Scope` 🆕 | 声明允许/禁止修改的文件目录（glob） | 工程师 |
| `## Context Template` 🆕 | 上下文组装指令 — 告诉 AI Agent 如何从 Use refs 组装 Work/Task Context | 工程师（可覆写默认） |

### 2.2 关键原则（来自 Q1-Q3 决议）

- **Blueprint 不复制 Asset 内容** — 只声明"去哪取"
- **Work Context 由 AI Agent 编写** — Engine 不自动填充（避免 LLM 上下文污染 + 保持 Blueprint 纯净）
- **混合注入** — Engine 输出 Blueprint 关联 Asset 的路径（轻量 JSON），AI Agent 读取 Asset 内容后自己编写上下文

### 2.3 Work 目录设计（方案 C 全独立）

```
works/<id>/
├── work.md                ← Index/声明（瘦身：移除 skill_context）
├── context.md             ← 🆕 Work Context（AI Agent 写，纳入 PlanLock）
├── memory.md              ← 🆕 动态记忆（Phase 2 实现，不纳入 PlanLock）
├── .work                  ← BirthCert（planLock 3-hash → 5-hash）
├── blueprints.json        ← Blueprint IR（Domain/Stack refs 补 file 字段）
├── .run/                  ← 不变
└── tasks/<name>/
    ├── task.md            ← 声明 + 🆕 ## Artifacts（预期产物路径）
    ├── context.md         ← 🆕 Task Context（纳入 PlanLock）
    ├── memory.md          ← 🆕 Phase 2
    └── *.md               ← Artifacts
```

### 2.4 PlanLock 5-hash 结构

```typescript
interface PlanHash {
  workMdHash: string | null          // work.md（不变）
  workContextHash: string | null     // 🆕 works/<w>/context.md
  blueprintsHash: string | null      // blueprints.json（不变）
  tasksHash: string | null           // tasks/*/task.md 组合（不变）
  taskContextsHash: string | null    // 🆕 tasks/*/context.md 组合
  allHash: string | null             // 5 个的稳定聚合
  missing: string[]
}
```

`allHash` 公式（稳定排序）：
```
sha256(
  "work.md=" + workMdHash + "\n" +
  "context.md=" + workContextHash + "\n" +
  "blueprints.json=" + blueprintsHash + "\n" +
  "tasks=" + tasksHash + "\n" +
  "taskContexts=" + taskContextsHash
)
```

### 2.5 Scope 验证机制（不新增 Probe）

- Blueprint `## Scope` 声明 allow/forbid 文件 glob
- Task `## Artifacts` 声明预期产物路径列表（path + type）
- lock 时 Engine 校验：每个 Artifact path ⊆ Scope.allow AND ∩ Scope.forbid = ∅
- 违反 → `IAP_INTENT_SCOPE_VIOLATION` (YIELD_TO_HUMAN)
- run 时已有 `fs-exists` / `fs-no-exists` Probe 验证 Artifact 实际存在

### 2.6 CLI 注入 3-flag 设计

```bash
# Work 级注入
oxn work show <name> --paths          # 返回三件套路径（轻量 JSON）
oxn work show <name> --context        # 返回 context.md 内容（Markdown，非 JSON）
oxn work show <name> --memory         # 返回 memory.md 内容（Markdown；Phase 2 前返回 null）

# Task 级注入（同理）
oxn work show <name> --task <t> --paths
oxn work show <name> --task <t> --context
oxn work show <name> --task <t> --memory
```

**为什么不返回 JSON 全量结构？**
- Token 成本：JSON 引号/括号/键名膨胀
- LLM 解析成本：Markdown 是 LLM 原生格式，零解析开销
- 真正的上下文工程实践：语义内容用 Markdown，元数据用 JSON

### 2.7 Blueprint Context Template 默认结构

当 Blueprint 不写 `## Context Template` 时，Engine 用以下默认：

```markdown
### Work Context
- business:        从 ## Use 引用的 Domains 提取术语 + invariants，表达 Work Goal 的业务语义
- implementation:  从 ## Use 引用的 Stacks 提取工具 + 约束，表达实现边界
- process:         从 ## Use 引用的 Workflows + ## Boundaries 提取 slot 拓扑，表达执行流程
- goal:            工程师在 Work create 时声明的 intent + constraints

### Task Context
- unit:        以 ## Boundaries 的每个 Slot 为单元
- split:       把 Work Goal 按 Slot 拆分为独立 Task
- carry:       每个 Task 携带 Work Context 中与该 Slot 相关的子集
- acceptance:  从该 Slot 的 observe 数组提取验证标准
```

Blueprint 可通过写自己的 `## Context Template` 覆写默认（如 bug-fix-blueprint 可在 diagnose 段加"证据落盘"指令）。

---

## 3. IAP 流程变化

```
Intent:
  1. oxn work create → work.md + dir structure
  2. oxn work add-task (N 次) → tasks/<t>/task.md（含 ## Artifacts 声明）
  3. AI Agent 读 Blueprint ## Context Template + ## Use refs
  4. AI Agent 读引用的 Domain/Workflow/Stack 文件
  5. AI Agent 写 work context.md + tasks/*/context.md
  6. oxn work validate → 校验 refs + 🆕 Artifacts ⊆ Scope.allow
  7. oxn work lock → PlanLock（含 work.md + context.md + blueprints.json + tasks + task contexts）

Align:
  8. AI Agent 跑 oxn work show <name> --paths → 拿三件套路径
  9. AI Agent 跑 oxn work show <name> --context → 拿 Work Context
  10. Task 切换时跑 --task <t> --context → 拿 Task Context
  11. 执行 Task → 产出 Artifacts
  12. observe: fs-exists 验证 Artifacts 存在

Proof:
  13. submit + finalize → frozen.json
```

修改 context.md 流程：`oxn work unlock` → 编辑 → `validate` → `lock`（unlock 已存在）。

---

## 4. 影响范围

### 4.1 Domain 层（术语权威源）

- `oxn-work-domain.md`:
  - 新增 Terms: **WorkContext**, **TaskContext**, **WorkMemory**, **TaskMemory**, **ContextTemplate**, **Scope**, **ArtifactDeclaration**
  - 新增 Invariants: inv-32 至 inv-35
  - 修订 Terms: `context.md` 改名 → `memory.md`（原定义映射）
- `oxn-asset-domain.md`:
  - 新增 Invariants: inv-25 (blueprint-scope-declarative), inv-26 (blueprint-context-template-optional)
- `oxn-engine-domain.md`:
  - 修订 PlanHash 引用（3-hash → 5-hash）

### 4.2 Engine 层

- `packages/engine/src/Work/plan-hash.ts` — PlanHash 扩展 5-hash；hashWorkPlan 新增 context 字段
- `packages/engine/src/Work/birth-cert.ts` — PlanLockSchema 扩展 5 字段；verifyPlanLock 新增 drift 检测
- `packages/engine/src/Work/dual-state-io.ts` — 新增 getWorkContextPath + getTaskContextPath
- `packages/engine/src/Work/work-validator.ts` — validateAndWriteArtifacts 新增 Scope 校验
- `packages/engine/src/kernel/schemas/` — Blueprint schema 新增 ## Scope + ## Context Template 解析
- `packages/engine/src/kernel/schemas/types/artifact.ts` — 区分 Artifact 声明型（path + type）与运行时型（含 hash）

### 4.3 CLI 层

- `packages/cli/src/commands/work.ts` — 新增 `show` 子命令（或扩展 `status`）支持 --paths / --context / --memory / --task flag
- `blueprints.json` 输出 — Domain/Workflow/Stack refs 补 `file` 字段（真实路径）

### 4.4 Asset 层

- `.openxenon/draft-skeletons/asset-blueprint.md` — skeleton 新增 ## Scope + ## Context Template 段
- 现有 4 个 Blueprint（oxn-blueprint / bug-fix-blueprint / promote-target-aware-workflow / draft-promote-router）按新结构迁移（走 `oxn asset evolve`）

### 4.5 Skill 层

- `.opencode/skills/oxn-work/SKILL.md` — 新增上下文注入指令（4 步：--paths → --context → 读 Assets → --task --context）

---

## 5. 新增 / 修订术语

### 5.1 新增 Terms（oxn-work-domain.md）

- **WorkContext** — Work 级上下文（AI Agent 按 Blueprint Context Template 从 Assets 组装）；纳入 PlanLock 5-hash；lock 前写完
- **TaskContext** — Task 级上下文（AI Agent 从 WorkContext 按 Slot 拆分）；纳入 PlanLock 5-hash
- **WorkMemory** — Work 级动态记忆（Loop History + Observations + Key Notes）；不纳入 PlanLock；Phase 2 实现
- **TaskMemory** — Task 级动态记忆；不纳入 PlanLock；Phase 2 实现
- **ContextTemplate** — Blueprint 内上下文组装指令段；可选，缺省用 Engine 内置默认模板
- **Scope** — Blueprint 内文件范围声明段（allow/forbid glob）；静态锁定，PlanLock 保护
- **ArtifactDeclaration** — Task 内声明的预期产物路径列表；lock 时 Engine 校验 ⊆ Blueprint Scope.allow

### 5.2 修订 Terms（oxn-work-domain.md）

- **context.md** → **memory.md**（改名）
  - 原定义：Work 内短期记忆文件（Intent + Roadmap + LoopHistory + KeyObservations 结构）
  - 新定义：Work 级动态记忆（Loop History + Observations + Key Notes）；不纳入 PlanLock
  - 新定义引用：ADR-0049（v0.7.x Memory L1 取代），但实体名改为 memory.md

### 5.3 新增 Invariants

**oxn-work-domain.md**:
- **inv-32: context-md-in-planlock** — context.md 纳入 PlanLock 5-hash（workContextHash）；lock 后漂移 → HASH_MISMATCH
- **inv-33: context-written-before-lock** — context.md 必须在 lock 前写完；lock 时 context.md 不存在 → IAP_INTENT_CONTEXT_MISSING (YIELD_TO_HUMAN)
- **inv-34: task-context-in-planlock** — tasks/*/context.md 纳入 taskContextsHash；lock 后漂移 → HASH_MISMATCH
- **inv-35: artifacts-within-scope** — Task expectedArtifacts ⊆ Blueprint Scope.allow AND ∩ Scope.forbid = ∅；违反 → IAP_INTENT_SCOPE_VIOLATION (YIELD_TO_HUMAN)

**oxn-asset-domain.md**:
- **inv-25: blueprint-scope-declarative** — Blueprint `## Scope` 声明 allow/forbid 文件 glob；静态锁定，PlanLock 保护
- **inv-26: blueprint-context-template-optional** — Blueprint `## Context Template` 可选；缺省用 Engine 内置默认模板（基于 Use refs + Boundaries + Goal 推导）

---

## 6. 待决 / Phase 2 项

| 项 | 描述 | 实现阶段 |
|---|---|---|
| `memory.md` 实际实现 | 当前 Plan 2 — Round 切换时由 AI Agent 追加 Loop History + Observations | v0.7+ |
| Engine 内置默认 Context Template 推导逻辑 | Blueprint 无 `## Context Template` 时从 Use refs + Boundaries + Goal 自动推导 | v0.7+ |
| `--memory` flag 实际返回 memory.md 内容 | 当前 Plan 2 — memory.md 未实现时返回 null + 提示 | v0.7+ |
| 现有 Blueprint 迁移 | 4 个 Blueprint（oxn / bug-fix / promote-target-aware / draft-promote-router）走 `oxn asset evolve` 补 ## Scope + ## Context Template | v0.7+ |

---

## 7. 关键决策与权衡

| 决策 | 备选 | 选择 | 理由 |
|---|---|---|---|
| PlanLock 5-hash | (A) 5-hash 独立 vs (B) tasksHash 吸收 task contexts | A | 原子边界清晰，drift 检测可精确定位 |
| 目录方案 | A 单文件 vs B 两层 vs C 全独立 | C | 职责清晰；memory 暂后实现，前 3 个文件足以 |
| CLI 注入形态 | JSON 全量 vs 文件路径自读 vs Markdown 拼接 | 3-flag + Markdown | 语义内容用 Markdown（LLM 原生）；元数据用 JSON |
| context.md 入 PlanLock | (α) 纳入 vs (β) 不纳入 | α | 保障"同一 Blueprint 的 N 个 Work 上下文结构一致" |
| Scope 验证 | 新增 scope-check Probe vs 用 Artifact 声明 + lock 校验 | 后者 | 不新增 Probe；lock 时一次性校验，避免 runtime 重复 |
| Blueprint 改 Asset 内容 | (A) 扩展 ## Use 段 vs (B) 新增 ## Context Assembly 段 vs (C) Blueprint 仅声明 refs | C + Context Template 指令 | 避免 inv-26 违反（Domain 与 Blueprint 互不写内容）；AI Agent 按 Goal 自己判断取什么 |

---

## 8. 关联

- `dev/assets-design-1.md` — Asset 作为知识边界资产；Blueprint slot 分解跳跃
- `dev/assets-design-2.md` — Blueprint 模板结构 + Work/Task Context 逐级细化
- ADR-0049 — v0.7.x Memory L1 取代（context.md 引用源头；本设计改名 memory.md）
- ADR-0066 / 0067 — OXN 验证事实不评判质量（Proof 原则）
- ADR-0072 — OXN Engine 是确定性参照系，非智能体
- ADR-0084 — Collaboration Boundary Layering（Channel-only tracking）

---

## 9. Promote 路径

本 Draft 经工程师审核后，通过 `oxn work create context-template-v1 --type design` 走 IAP 闭环升格为 RFC，落地步骤：

1. 创建 RFC：`docs/rfcs/zh-cn/RFC-XXXX-context-template.md`
2. 更新 Domain：`oxn-work-domain.md` + `oxn-asset-domain.md`
3. 更新 CONTEXT-MAP.md 术语索引
4. 更新 draft-skeleton
5. 更新 Skill
6. Engine 实现（PlanLock 5-hash + Scope 校验）
7. CLI 实现（3-flag 注入）
8. 现有 Blueprint 迁移

<!-- 已迁移：v0.7 CONTEXT-MAP.md 退役，详见 RFC-0028。文件中 CONTEXT-MAP 原文引用保留作为历史考古链，失效链接请用 git blame 追溯或参考对应 Domain / RFC。-->
