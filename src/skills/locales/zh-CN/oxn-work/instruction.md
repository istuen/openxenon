# /oxn-work — 发起 + 驱动 OpenXenon Work

## 目标

依据 Blueprint 创建一个 **Work + 至少一个 Task** 的工作区：
- `work.oxn` — workspace 编排器（声明 ref 池 + task DAG）
- `tasks/<name>/task.oxn` — 单 blueprint 执行 + 显式 align

本 Skill 覆盖 work + task 的**完整生命周期**（创建 + 状态机驱动）。v0.1 hard-switch 之后，原 `oxn-leader` 已并入 `oxn work`，无独立 leader skill。

> **状态机驱动**：用 `oxn work run / submit / status / context` — 一站式。

## 前置条件

- 已在 OXN 项目根目录
- 项目已 `oxn init` 初始化（存在 `.openxenon/` 边界）
- 必须有 Blueprint（位于 `.openxenon/blueprints/<name>.oxn`），用 `oxn blueprint create` 创建
- **可选**：有 DDD Domain（位于 `.openxenon/domains/<kebab>.oxn`），用 `oxn domain create` 创建

## Intent-Align 范式提醒

- **Domain** = 业务 Intent（term/ban/invariant）
- **Blueprint** = 技术 Intent（slot 拓扑）
- **Work** = Align 编排器（声明 ref 池）
- **Task** = Align 执行单元（align 1 blueprint + N domains）

## 创建 Work + Task（五步）

### 步骤 1：创建 Domain（可选）

```bash
oxn domain create --name MemberContext
# 编辑 .openxenon/domains/member-context.oxn 填写 term/ban/invariant
oxn domain validate MemberContext
```

### 步骤 2：创建 Work 编排

```bash
# 用 work create 从 blueprint 生成 work.oxn 骨架（推荐）
oxn work create --work-id <work-name> --blueprint <bp>
# 编辑 .openxenon/works/<work>/work.oxn
```

或手写：

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }

  domain "MemberContext"   ref "@prj/domains/MemberContext";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "step1" {
    domain "MemberContext";
    blueprint "dev-workflow";

    part "build" { skill_context = "..." }
    deps = [];
  }
}
```

### 步骤 3：创建至少一个 Task

```bash
oxn work add-task \
  --work <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  [--domain <DomainName>]
```

会做：
- 校验 `--blueprint` 必须出现在 work.oxn 的 blueprint ref 列表（fail-fast）
- 校验 `--domain` 必须出现在 work.oxn 的 domain ref 列表（fail-fast）
- 生成 `works/<w>/tasks/<t>/task.oxn` 骨架

### 步骤 4：编辑 task 内容

```bash
# 改 skill_context（直接编辑 task.oxn）
# 或用 oxn work task-edit 添加约束
oxn work task-edit \
  --work <w> --task <t> \
  --add-constraint "use_kebab_case" \
  --add-constraint "no_plaintext_password"
```

### 步骤 5：驱动状态机

```bash
oxn work run --work-file <work>/work.oxn --json
oxn work submit --work-name <w> --task <t> --json
oxn work status --work-name <w> --json
```

## 参考命令

| 想做什么 | 命令 |
|---|---|
| 初始化项目边界 | `oxn init` |
| 创建一个 Blueprint 骨架 | `oxn blueprint create <name> [--slots <list>]` |
| 创建一个 Domain 骨架 | `oxn domain create --name <Name>` |
| 验证 Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| 列出所有 Domain | `oxn domain list` |
| 创建 work 骨架（含 task 块） | `oxn work create --work-id <w> --blueprint <bp>` |
| 列出 work 下所有 task | `oxn work list-tasks --work <w>` |
| 查看 task 状态 | `oxn work task-status --work <w> --task <t>` |
| 获取 AI 上下文（**全量隔离**） | `oxn work context --work <w> --task <t>` |
| 启动 work 状态机 | `oxn work run --work-file <work.oxn>` |
| 推进 task 内 part | `oxn work submit --work-name <w> --task <t>` |
| 查询 work 状态 | `oxn work status --work-name <w>` |

## 反模式

- **不要先 submit 后 run** — `work run` 是 setup，`submit` 是 advance
- **不要跳过 task 创建** — `work run` 会 fail-fast 拦截（`OXN_TASK_OXN_MISSING`）
- **不要在 work.oxn 引用 task.oxn 不存在的 task 名** — `work run` 校验失败
- **不要把 ref 与 align 混为一谈** — `domain "X" ref "..."` 是 work 级声明，task 内 `domain "X"` 是 align
- **不要在 task 块外加 `part` 字段** — part 必须嵌套在 task 块内
- **不要写 `task "X" align "Y.Z"`** — 已废弃，改为 `task "X" { blueprint "Y"; part "Z" }`
- **不要写 `inject "X"`** — 已废弃，改为 task 内 `domain "X"`
- **不要在 Domain 用 `noun`/`verb`/`domain_rules`** — 改为 `term`/`ban`/`invariant`
- **不要在 Blueprint 加 `expectation`/`rule` 块** — 已删除，验证由 Probe 承担
- **不要写 `work "X" ref "@oxn/blueprints/Y"`** — 已废弃，改为 `blueprint "Y" ref "...";` 声明
- **不要写 `oxn work new`** — 改用 `oxn work create`
- **不要试图 `oxn part new` / `oxn probe new`** — Part / Probe 没有 CLI 入口
