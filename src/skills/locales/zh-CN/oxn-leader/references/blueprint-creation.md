# OXN Blueprint 创建指南

Blueprint 是定义 **part 拓扑**（slot 列表 + 依赖关系 + 探针）的声明性文件，位于 `.openxenon/blueprints/<name>.oxn`。

## 最简模板

```oxn
blueprint "tiny" {
  version = 1
  description = "tiny test blueprint"
  slot "alpha" { }
  slot "beta" { deps = ["alpha"] }
}
```

## 完整模板（带 skill + part bodies + 探针）

参考 `src/oxn-dsl/examples/blueprint-example.oxn`：

```oxn
blueprint "oxn-example" {
  description = "示例 Blueprint"
  version = 1
  prop "env" { type = string; default = "dev" }

  slot "build" {
    deps = []
  }
  slot "develop" {
    deps = ["build"]
  }
  slot "test" {
    deps = ["build"]
    observe = ["ShellExec"]
  }

  // 可选：跨 part 验证
  expectation "must-pass-tests" {
    probe = "@oxn/probes/shell_exec"
    params = { command = "npm test" }
    err_msg = "测试必须通过才能提交"
  }

  // 可选：约束规则
  rule "prod_requires_ha" {
    condition = prop.env != "prod"
    err_msg = "生产环境必须开启 HA"
  }
}
```

## 三种创建方式

### 方式 1: 手写 `.oxn` 文件（最直接）

```bash
mkdir -p .openxenon/blueprints
$EDITOR .openxenon/blueprints/my-blueprint.oxn
oxn validate --work-file .openxenon/blueprints/my-blueprint.oxn --json
```

### 方式 2: 用 `/oxn-forge` skill（自然语言生成）

在 OpenCode chat 里调用 `/oxn-forge`，描述你想做什么：

> 帮我创建一个 blueprint 叫 `deploy-pipeline`，含 3 个 slot：build、test、deploy，
> build 不依赖任何东西，test 依赖 build，deploy 依赖 test；
> test slot 用 ShellExec 探针跑 `npm test`。

`oxn-forge` 会自动生成 `.oxn` 文件。

### 方式 3: 从现成 Blueprint 派生

```bash
# 看有哪些 builtin blueprint
ls src/builtin/blueprints/

# 复制一个作为模板
cp src/builtin/blueprints/verify-pipeline.oxn .openxenon/blueprints/my-thing.oxn
$EDITOR .openxenon/blueprints/my-thing.oxn
```

## Blueprint 字段速查

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` (STRING) | ✅ | Blueprint 名称，会被 work.oxn 的 `ref` 引用 |
| `version` (NUMBER) | 推荐 | 语义版本号，CLI 默认 1 |
| `description` (STRING) | 否 | 人类可读说明 |
| `prop "name" { ... }` | 否 | Blueprint 级参数（提供 `prop.<name>` 访问） |
| `slot "name" { ... }` | ✅ (≥1) | Part 槽位（生成 work.oxn 的 part 引用） |
| `expectation "name" { ... }` | 否 | 跨 part 验证规则 |
| `rule "name" { ... }` | 否 | Blueprint 级约束（condition + err_msg） |

### Slot 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `slot "name"` | ✅ | Slot 名称（与 work.oxn 里的 `part "name"` 对应） |
| `deps = ["other"]` | 否 | 依赖的其他 slot 列表 |
| `observe = ["ShellExec"]` | 否 | 该 slot 关注的探针名列表 |

## 验证 Blueprint

```bash
oxn validate --work-file .openxenon/blueprints/my-blueprint.oxn --json
```

成功应返回 `ok: true`。失败会显示 DSL 解析错误或结构错误。

## 用 Blueprint 生成 Work

```bash
# 默认从 .openxenon/blueprints/<name>.oxn 找
oxn leader new --name my-work --json

# 显式指定
oxn leader new --name my-work --blueprint-file path/to/bp.oxn --json
```

生成 work.oxn 后，编辑其中的 `TODO:` 占位符（goal/constraints/per-part skill）即可 `oxn leader run`。
