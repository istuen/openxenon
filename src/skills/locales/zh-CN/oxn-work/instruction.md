# /oxn-work — 发起 OpenXenon Work（v0.1 双层版）

## 目标

依据 Blueprint 创建一个 **Work + 至少一个 Task** 的工作区：
- `work.oxn` — workspace 编排器（声明 use_domain + use_blueprint + task DAG）
- `tasks/<name>/task.oxn` — 单 Blueprint 执行 + 注入 Domain

本 Skill 覆盖 work + task 的创建流程；状态机三阶段（run/act/submit）请参见 `/oxn-leader`。

> **与 `/oxn-leader` 的关系**：本 skill 教 AI 怎么 **创建** work + task。`/oxn-leader` 教 AI 怎么 **驱动** work 状态机。两者互补，**不是替代**。

> 旧的 `oxn-task` / `oxn-explore` / `oxn-plan` 已被废除（v0.0.x 时代双层 task/work 模型产物）。请勿调用 `oxn task *` 等历史命令。

## 前置条件

- 已在 OXN 项目根目录
- 项目已经 `oxn init` 初始化（存在 `.openxenon/` 边界）
- 必须有 Blueprint（位于 `.openxenon/blueprints/<name>.oxn`），可以用 `oxn blueprint new` 创建
- **可选**：有 DDD Domain（位于 `.openxenon/domains/<kebab>.oxn`），用 `oxn domain new` 创建

## 创建 Work + Task（v0.1 五步）

### 步骤 1：创建 Domain（如果有业务语言要约束）

```bash
# 骨架
oxn domain new --name MemberContext
# 编辑 .openxenon/domains/member-context.oxn 填写 language/rules
# 校验
oxn domain validate --name MemberContext
```

### 步骤 2：创建 Work 编排

```bash
# 用 leader new 模板生成 work.oxn 骨架
oxn leader new --work-name <work-name> --blueprint-file .openxenon/blueprints/<bp>.oxn
# 编辑 works/<work>/work.oxn，加 use_domain 和 task 编排块
```

或手写 `works/<work>/work.oxn`：

```oxn
work "MyFeature" {
  context { goal = "..."; constraints = []; loop_policy { max_iterations = 3 } }
  use_domain "MemberContext"
  use_blueprint "dev-workflow"
  task "step1" align "dev-workflow.develop" { deps = [] }
}
```

### 步骤 3：创建至少一个 Task（v0.1 强制）

```bash
oxn work task new \
  --work-name <work-name> \
  --task-name <task-name> \
  --blueprint <blueprint-name> \
  [--inject <Domain1>,<Domain2>]
```

会做：
- 校验 `--blueprint` 必须出现在 work.oxn 的 `use_blueprint` 列表中（fail-fast）
- 校验 `--inject` 列表必须出现在 work.oxn 的 `use_domain` 列表中（fail-fast）
- 生成 `works/<w>/tasks/<t>/task.oxn` 骨架

### 步骤 4：编辑 task 内容

```bash
# 改 objective / 加 constraint
oxn work task edit \
  --work-name <w> --task-name <t> \
  --objective "实现会员注册" \
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
|----------|------|
| 初始化项目边界 | `oxn init` |
| 创建一个 Blueprint 骨架 | `oxn blueprint new <name> [--slots <list>]` |
| 创建一个 Domain 骨架 | `oxn domain new --name <name>` |
| 验证 Blueprint / Domain | `oxn {blueprint,domain} validate <name>` |
| 列出所有 Domain | `oxn domain list` |
| 列出 work 下所有 task | `oxn work task list --work-name <w>` |
| 查看 task 状态 | `oxn work task status --work-name <w> --task-name <t>` |
| 获取 AI 上下文（**全量隔离**） | `oxn get-context --work <w> --task <t>` |
| 驱动状态机 | `/oxn-leader` skill |

## 反模式

- **不要先 submit 后 run** — leader run 是 setup，submit 是 advance，顺序错会 OXN_WORK_NOT_FOUND
- **不要跳过 task 创建** — v0.1 leader run 会 fail-fast 拦截
- **不要在 work.oxn 引用 task.oxn 不存在的 task 名** — leader run 校验会失败
- **不要把 use_domain 与 task.inject 混为一谈** — use_domain 是 work 级声明，inject 是 task 级筛选
