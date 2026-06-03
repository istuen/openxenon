# /oxn-work — 发起 OpenXenon Work

## 目标
依据 Blueprint 创建一个 Work 文件（`work.oxn`），并把它交由 **`/oxn-leader` 驱动状态机** 推进。本 Skill 只覆盖 "如何创建 work"；状态机三阶段（run/act/submit）请参见 `/oxn-leader`。

> **与 `/oxn-leader` 的关系**：本 skill 教 AI 怎么 **创建** work（`work new`）。`/oxn-leader` 教 AI 怎么 **驱动** work 的状态机（run/submit/status）。两者互补，**不是替代**。

> 旧的 `oxn-task` / `oxn-explore` / `oxn-plan` 已被废除（reference 时代双层 task/work 模型产物）。请勿调用 `oxn task *` 等历史命令。

## 前置条件
- 必须在 OXN 项目根目录下执行
- 项目已经 `oxn init` 初始化（存在 `.oxn/` 边界）
- 必须有 Blueprint（位于 `.openxenon/blueprints/<name>.oxn`），可以用 `oxn blueprint new` 创建

## 创建 Work

```bash
# 默认从 .openxenon/blueprints/<name>.oxn 找 blueprint
oxn work new --work-id my-work --json
# 或显式指定
oxn work new --work-id my-work --blueprint my-blueprint --json
```

**`--work-id` 必填**（kebab-case），其它可选。

读取响应中的 `data.skillContext` 和 `data.parts`：
- `data.skillContext.overallGoal` — work 目标
- `data.skillContext.constraints` — 硬约束（**必须遵守**）
- `data.loopPolicy` — 最大迭代次数
- `data.parts[].stepSkillContext` — 每个 part 的 objective / acceptance / guidance

**创建 work 后立即调用 `/oxn-leader`**，进入 `oxn leader run` 阶段。

## 参考命令（统一 CLI 实际行为）

| 想做什么 | 命令 |
|----------|------|
| 初始化项目边界 | `oxn init` |
| 创建一个 Blueprint 骨架 | `oxn blueprint new <name> [--slots <list>]` |
| 验证 Blueprint 语法 | `oxn blueprint validate <name>` |
| 列出所有 Blueprint | `oxn blueprint list` |
| **创建一个新 Work** | `oxn work new --work-id X [--blueprint Y]` |
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
