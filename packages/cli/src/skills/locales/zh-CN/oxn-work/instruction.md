# /oxn-work — Drive Work v1.1

## 目标
建 **Work + ≥1 Task** 走 8 阶段：`create → add-task → validate → lock → run → submit → finalize`（`migrate?` 可选）

## 硬规则
- `validate`→`lock`→`run` 严格；无 `--force`
- lock 后漂移 = `HASH_MISMATCH`；OXN 不 commit/push
- Part/Probe 内联于 `task { part { probe {} } }`

## 范式
D=业务 Intent | B=技术 Intent | W=Align 编排 | T=Align 执行

## 蓝图选择
| 需求 | 模板（.md 含 OXN 代码块）→ Blueprint |
|---|---|
| 摸清/报告 | `assets/work-explore.md` → `explore-analyze-report` |
| 单域开发 | `assets/work-develop.md` → `dev-workflow` |
| bug 修复 | `assets/work-fix.md` → `fix-issue` |
| 跨域 | `assets/work-onboarding.md` → `dev-workflow` (多 domain) |
| **MD 文档编写**（v0.7+ ADR-0089）| — → `md-author-blueprint` |

> v0.7+：Work 不再有 mode（task/explore/edit）；行为差异由 Blueprint slots/observe 承载。
> v0.7+：MD 文档编写场景用 `md-author-blueprint`（5 起手 Asset 之一）。

## 执行（v0.7+ AssetMap-driven Asset 选取）

1. **前置**：项目已 `oxn init`，所需 Asset 已就绪 — 若需创建/修改 Asset，**触发 `oxn-asset` Skill**。
2. **首次接入项目（v0.7+ ADR-0089）**：项目未 bootstrap 5 起手 Asset 时，触发 `oxn onboard` 流程：
   - 跑 `oxn onboard --detect --json` 探测项目状态
   - 解析探测结果 → 列 3 选项卡片（`A` 新项目 / `B1` 存量-Proof-First / `B2` 存量-探索建 Asset）
   - **等工程师确认选项** → 执行对应 `oxn onboard --new` / `--existing --proof-first` / `--existing --bootstrap`
   - Bootstrap 完成后（`.openxenon/.bootstrap-done` 标记存在），进入正常 Work 流程
3. **查 AssetMap 确定可用 Asset**（人机主动，非自动推荐）：
   - `oxn assetmap show <map> --scene <scene>` — 列出 scene 下的 Domain / Blueprint / Stack（`<map>` 默认 `oxn-system`；项目消费者可新建 `<project>-system`）
   - `oxn assetmap suggest --goal "<goal>" --scene <scene>` — 按关键词 jaccard 排序的候选
4. **人机分析，从 suggest 结果挑选**：
   - **Blueprint** — 1..N 个 pipeline（通常 1 个；多 blueprint 用于跨阶段不同流水线）
   - **Domain** — 1..N 个（Work 级声明，提供全局词汇；Task 级只能选其中 1 个）
   - **Stack** — 0..N 个（Work 级声明技术栈约束；不进 Task 层）
5. **fork 模板 + 改 work.md**（或用 `oxn work create` 直传）：
   ```bash
   oxn work create <name> \
     --blueprint <bp> \
     [--blueprint <bp2>] \
     --domain <d1> --domain <d2> \
     [--stack <s1>] \
     --goal "<goal>" \
     [--constraints "c1" "c2"]
   ```
   或手动 `fork assets/work-{explore,develop,fix,onboarding}.md → work.md` 自编辑 `## Refs` + `## Context`。
6. **走 8 阶段**：`references/8-phase-detail.md`
7. **报错**：`references/error-codes.md`

## 多 Asset 与 Tasks 的关系

- **Work 级 `## Refs`**：声明 domain[] + blueprint[] + stack[] ref 池（多个）
- **Task 级**：每个 task 在 `task.oxn` 内**单选** 1 blueprint + 1 domain（Work 级 ref 池的子集）
- **新增 task 校验**：task 选的 blueprint/domain **必须**在 Work 级 ref 池内（`add-task` 报错 `not declared in work`）
- **planLock 影响**：work 级多 ref 让 `domains.json` / `blueprints.json` slim 索引含 N 条 entry；hash 算法不变（hash 整个 .json）

## 错误
`LOCK_NOT_FOUND`/`HASH_MISMATCH` → YIELD | `TASK_OXN_MISSING` → `add-task` | `ROUND_ALREADY_PASSED` → `work finalize`

## 禁止
跳 validate+lock；锁后改 `.oxn`；废弃语法（`align|inject|noun|verb|new`）。

## v0.7+ Onboarding 触发规则（ADR-0089 D6）

**触发条件**：用户输入包含以下任一关键词时，先走 onboard 流程再决定下一步：
- "用 OXN 引导"、"OXN 引导"、"onboard me"、"set up OXN"、"use OXN"
- "5 分钟上手"、"quickstart"、"getting started"
- "在项目里用 OXN"、"add OXN to my project"

**Skill 内部执行流程**：
```
1. 调 `oxn onboard --detect --json`（detection，无副作用）
2. 解析返回数据：
   - projectType: 'new' | 'existing-empty' | 'existing-initialized' | 'existing-completed'
   - recommendation.path: 'A' | 'B1' | 'B2'
3. 在 UI 列出 3 选项卡片 + 当前 recommendation
4. **必须等工程师确认**（不能擅自决定）
5. 执行工程师选择的子命令：
   - 'A' → `oxn onboard --new`
   - 'B1' → `oxn onboard --existing --proof-first`
   - 'B2' → `oxn onboard --existing --bootstrap`
6. Bootstrap 完成后，进入正常 Work 流程
```

**禁止**：跳过 detect 直接选路径；擅自做工程师决策。
