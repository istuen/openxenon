# Blueprint 详解

> Blueprint 是 OpenXenon v0.1 的**技术流水线模板**——只声明 slot 拓扑（DAG），不包含业务/验证语义。

> **代码物理归属**：Blueprint 解析/校验位于 L1 OXL（`src/oxl/`）；完整 L0-L3 分层与依赖规则见 [L0-L3 宪法](./l0-l3-constitution.md)。

## 1. 定位

**Blueprint = 技术 Intent**

Blueprint 是"slot 怎么排 + slot 怎么依赖"的纯技术模板。它：
- **不**包含业务语义（noun/verb/invariant 等都在 Domain）
- **不**包含验证标准（expectation/rule 已被删除，由 Probe 承担）
- **不**包含具体执行内容（skill_context 在 Part 端）

## 2. 完整结构

```oxn
blueprint "<name>" {
  description = "<一句话技术定位>"
  version     = 1

  prop "<name>" { type = <type>; default? = <value> }

  slot "<name>" {
    deps    = ["<other-slot-name>", ...]
    observe = ["<SignalType>", ...]
  }
}
```

## 3. 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `description` | 否 | 一句话技术定位 |
| `version` | 否 | 版本号（默认 1；Promote 时 _version 单调递增） |
| `prop` | 否 | Blueprint 参数声明。`type` 可选 `string`/`number`/`boolean`/`enum(A,B,C)`；可声明 `default` |
| `slot` | **是** | Blueprint 最小拓扑节点。可重复 |

### Slot 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | **是** | slot 唯一名（kebab-case，Work 内的 Part 通过 name align） |
| `deps` | 否 | 依赖的其他 slot 名列表（构成 DAG） |
| `observe` | 否 | 物理观测信号列表（如 `ShellExec`）；v0.1 仅文档化，v0.2 接入 Probe |

## 4. DAG 编排

```oxn
blueprint "ci-pipeline" {
  description = "CI 流水线"
  version = 1

  slot "build"   { deps = [] }
  slot "test"    { deps = ["build"] }
  slot "lint"    { deps = ["build"] }                  # 与 test 并行
  slot "deploy"  { deps = ["test", "lint"] }            # 等待 test + lint
}
```

```
build ─┬─→ test  ─┐
       └─→ lint  ─┴─→ deploy
```

Core 通过 DAG 拓扑排序决定执行顺序，**确保依赖满足后再执行下游**。

## 5. 参数化（Prop）

```oxn
blueprint "deploy-service" {
  prop "env"    { type = enum("dev", "staging", "prod"); default = "dev" }
  prop "region" { type = string; default = "us-west" }
  prop "replicas" { type = number; default = 3 }
}
```

Prop 是 Blueprint 的"输入参数"。在 Work 编排时通过 `part` 块的属性赋值（v0.2 引入）覆盖。

## 6. 物理位置

```
.openxenon/
└── blueprints/
    ├── dev-workflow.oxn
    ├── fix-issue.oxn
    ├── explore-analyze-report.oxn
    └── add-summary-cmd.oxn
```

**命名约定**：Blueprint 名 kebab-case（如 `dev-workflow`）。

## 7. Work 怎么 align Blueprint

```oxn
work "Onboarding" {
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";

  task "RegisterMember" {
    blueprint "dev-workflow";          // align 到这个 blueprint
    part "build" { skill_context = "..." }   // align 到 slot "build"
    part "test"  { skill_context = "..." }   // align 到 slot "test"
  }
}
```

详见 [Work + Task 详解](./work-and-task.md)。

## 8. v0.1 删除的字段（**不要使用**）

| 旧字段 | 状态 | 替代 |
|---|---|---|
| `expectation { ... }` | **已删除** | 由 Part 内的 Probe 承载（v0.2 接入） |
| `rule { ... }` | **已删除** | 由 Domain invariant + Probe 校验 |
| `observe = probe` | **已删除** | `observe = ["SignalType"]`（数组） |
| `stage` 概念 | **已删除** | 改称 `slot` |
| `target` / `action` / `spec` / `execution` | **已删除** | `skill_context` 移到 Part 端 |

## 9. 完整示例

```oxn
blueprint "dev-workflow" {
  description = "开发工作流：构建 → 测试 → 验证"
  version = 1

  prop "env" { type = string; default = "dev" }

  slot "build"  { deps = [] }
  slot "test"   { deps = ["build"] }
  slot "verify" { deps = ["test"] observe = ["ShellExec"] }
}
```

## 10. v0.1 限制

- `observe` 仅文档化，**未接 Probe**（v0.2 引入 `language-ban-checker`）
- `prop` 仅有类型/默认值，**无 Slot 契约**（v0.2 引入 inputs/outputs）

## 11. 下一章

- [Work + Task 详解](./work-and-task.md) — 怎么 align 到 Blueprint
- [State 详解](./state.md) — 运行时双层 state
- [OXN DSL 参考](../reference/oxl.md) — 完整语法
