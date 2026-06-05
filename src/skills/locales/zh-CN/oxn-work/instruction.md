# /oxn-work — 发起 OpenXenon Work

## 目标

依据 Blueprint 创建一个 **Work + 至少一个 Task** 的工作区：
- `work.oxn` — workspace 编排器（声明 ref 池 + task DAG）
- `tasks/<name>/task.oxn` — 单 blueprint 执行 + 显式 align

本 Skill 覆盖 work + task 的创建流程；状态机三阶段（run/submit/status）请参见 `/oxn-leader`。

> **与 `/oxn-leader` 的关系**：本 skill 教 AI 怎么 **创建** work + task。`/oxn-leader` 教 AI 怎么 **驱动** work 状态机。两者互补。

## 前置条件

- 已在 OXN 项目根目录
- 项目已 `oxn init` 初始化（存在 `.openxenon/` 边界）
- 必须有 Blueprint（位于 `.openxenon/blueprints/<name>.oxn`），用 `oxn blueprint new` 创建
- **可选**：有 DDD Domain（位于 `.openxenon/domains/<kebab>.oxn`），用 `oxn domain new` 创建

## Intent-Align 范式提醒

- **Domain** = 业务 Intent（term/ban/invariant）
- **Blueprint** = 技术 Intent（slot 拓扑）
- **Work** = Align 编排器（声明 ref 池）
- **Task** = Align 执行单元（align 1 blueprint + N domains）

## 创建 Work + Task（五步）

### 步骤 1：创建 Domain（可选）

```bash
oxn domain new --name MemberContext
# 编辑 .openxenon/domains/member-context.oxn 填写 term/ban/invariant
oxn domain validate --name MemberContext
```

### 步骤 2：创建 Work 编排

```bash
# 用 leader new 模板生成 work.oxn 骨架
oxn leader new --name <work-name>
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
oxn work task new \
  --work-name <work-name> \
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
# 或用 oxn work task edit 添加约束
oxn work task edit \
  --work-name <w> --task-name <t> \
  --add-constraint "use_kebab_case" \
  --add-constraint "no_plaintext_password"
```

### 步骤 5：交给 leader 驱动

```bash
oxn leader run --work-file <work>/work.oxn --json
oxn leader submit --work-name <w> --task <t> --json
oxn leader status --work-name <w> --json
```

## 参考命令

| 想做什么 | 命令 |
|---|---|
| 初始化项目边界 | `oxn init` |
| 创建一个 Blueprint 骨架 | `oxn blueprint new <name> [--slots <list>]` |
| 创建一个 Domain 骨架 | `oxn domain new --name <name>` |
| 验证 Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| 列出所有 Domain | `oxn domain list` |
| 创建 work 骨架 | `oxn leader new --name <work>` |
| 列出 work 下所有 task | `oxn work task list --work-name <w>` |
| 查看 task 状态 | `oxn work task status --work-name <w> --task-name <t>` |
| 获取 AI 上下文（**全量隔离**） | `oxn get-context --work <w> --task <t>` |
| 驱动状态机 | `/oxn-leader` skill |

## 反模式

- **不要先 submit 后 run** — leader run 是 setup，submit 是 advance
- **不要跳过 task 创建** — leader run 会 fail-fast 拦截
- **不要在 work.oxn 引用 task.oxn 不存在的 task 名** — leader run 校验失败
- **不要把 ref 与 align 混为一谈** — `domain "X" ref "..."` 是 work 级声明，task 内 `domain "X"` 是 align
- **不要在 task 块外加 `part` 字段** — part 必须嵌套在 task 块内
- **不要写 `task "X" align "Y.Z"`** — 已废弃，改为 `task "X" { blueprint "Y"; part "Z" }`
- **不要写 `inject "X"`** — 已废弃，改为 task 内 `domain "X"`
- **不要在 Domain 用 `noun`/`verb`/`domain_rules`** — 改为 `term`/`ban`/`invariant`
- **不要在 Blueprint 加 `expectation`/`rule` 块** — 已删除，验证由 Probe 承担
