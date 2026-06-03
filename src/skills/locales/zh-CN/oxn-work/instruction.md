# /oxn-work — 发起 OpenXenon Work

## 目标
依据 Blueprint 创建一个 Work，驱动其状态机（leader）逐个 Part 推进，直到所有 Part 完成并产出 `frozen.json`。

> **本 Skill 是 OpenXenon 唯一保留的工作流 Skill。** 旧的 `oxn-task` / `oxn-explore` / `oxn-plan` / `oxn-leader` 已被废除（task / explore / plan 是 reference 时代双层 task/work 模型产物，leader 已并入本 skill）。请勿调用 `oxn task *` / `oxn leader *` 等历史命令。

## 前置条件
- 必须在 OXN 项目根目录下执行
- 项目已经 `oxn init` 初始化（存在 `.openxenon/` 边界）
- 必须有 Blueprint（位于 `.openxenon/blueprints/<name>.oxn`），可以用 `oxn blueprint new` 创建

## Work 状态机三阶段

### 阶段 1: `new` — 启动 work 状态机

```bash
# 默认从 .openxenon/blueprints/<name>.oxn 找 blueprint
oxn work new --work-id my-work --json
# 或显式指定
oxn work new --work-id my-work --blueprint my-blueprint --json
# 指定类型
oxn work new --work-id my-work --type task --blueprint my-blueprint --json
```

**`--work-id` 必填**（kebab-case），其它可选。

读取响应中的 `data.skillContext` 和 `data.parts`：
- `data.skillContext.overallGoal` — work 目标
- `data.skillContext.constraints` — 硬约束（**必须遵守**）
- `data.loopPolicy` — 最大迭代次数
- `data.parts[].stepSkillContext` — 每个 part 的 objective / acceptance / guidance

### 阶段 2: Act — 执行当前 part

按 `data.parts[currentPart].stepSkillContext.objective` 描述执行（读文件、写代码、跑命令）。**严格遵守 `data.skillContext.constraints`**。

如果需要探针验证（reference 风格的人机对齐），用 `oxn leader submit --run-probes`，CLI 会自动执行该 part 在 `observe = [...]` 中声明的探针。

### 阶段 3: `submit` — 推进状态机

```bash
# 基础推进
oxn leader submit --work-name my-work --json

# 带探针执行（reference 风格验证）
oxn leader submit --work-name my-work --run-probes --json
```

读取响应 `data.skillContext.currentFocus` 看下一个 part，或 `data.overallStatus` 看是否已 `passed`。

**循环直到**：
- `data.overallStatus === "passed"` → 任务完成，`data.frozen` 含 frozen.json 路径
- `data.loopMeta.iteration >= data.loopMeta.maxIterations` → 达到用户定义的循环上限
- `data.overallStatus === "failed" | "error"` → 不可恢复

## 参考命令（统一 CLI 实际行为）

| 想做什么 | 命令 |
|----------|------|
| 初始化项目边界 | `oxn init` |
| 创建一个 Blueprint 骨架 | `oxn blueprint new <name> [--slots <list>]` |
| 验证 Blueprint 语法 | `oxn blueprint validate <name>` |
| 列出所有 Blueprint | `oxn blueprint list` |
| 创建一个新 Work | `oxn work new --work-id X [--blueprint Y] [--type T]` |
| 推进 Work 状态机 | `oxn leader submit --work-name X [--run-probes]` |
| 读 Work 当前状态 | `oxn leader status --work-name X` |
| 读 work.oxn 总结 | `oxn work summary --work-name X` |
| 列出所有 work | `oxn work list` |

## work.oxn 模板（统一 OXN DSL）

```oxn
work "my-work" ref "@oxn/blueprints/my-blueprint" {
  context {
    goal = "一句话目标";
    constraints = ["约束1", "约束2"];
    loop_policy { max_iterations = 5; }
  }
  part "stage-1" align "Stage1" { }
  part "stage-2" align "Stage2" { }
}

part "stage-1" align "Stage1" {
  skill {
    lifecycle = "code";
    objective = "做什么";
    acceptance = ["可验收的产出"];
    guidance = "给 AI 的额外提示";
  }
}
```

## 完成标准

`data.overallStatus === "passed"` 时，**停下来告诉用户 `data.frozen` 路径**，让 ta 审查。

你是 AI agent，不是验证者。探针由 kernel 跑，你只负责 submit。
