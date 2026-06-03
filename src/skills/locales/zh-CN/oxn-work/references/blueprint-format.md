# Blueprint 格式参考（oxn-work 用）

> **基于统一 OXN DSL（`src/oxn-dsl/langium/oxn.langium`）**。语法跟 mvp / reference 任一时代的"旧版"都不兼容——请按本文档为准。

## 蓝图结构

```oxn
blueprint "<name>" {
  version = 1                          // 必填（推荐）
  description = "<一句话描述>"          // 推荐

  // 可选：蓝图级 AI 上下文（mvp 扩展）
  context {
    goal = "...";
    constraints = ["...", "..."];
    loop_policy { max_iterations = 5; }
  }

  // 可选：蓝图级参数
  prop "<name>" { type = string; default = "dev" }

  // 必填：≥1 个 slot
  slot "<stage-1>" { deps = [] }
  slot "<stage-2>" { deps = ["<stage-1>"] }

  // 可选：跨 part 验证
  expectation "<name>" {
    probe = "<probe-ref-string>"
    params = { command = "npm test" }
    err_msg = "测试必须通过"
  }

  // 可选：蓝图级约束规则
  rule "<name>" {
    condition = prop.<name> != "prod"
    err_msg = "生产环境..."
  }
}
```

## Slot 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `slot "name"` | ✅ | Slot 名称（kebab-case 推荐） |
| `deps = ["other"]` | 否 | 依赖的其他 slot 列表（不填 = 无依赖） |
| `observe = ["ShellExec"]` | 否 | 该 slot 关注的探针名（运行时 `submit --run-probes` 触发） |

## 创建 Blueprint 的三种方式

### 1. 用 CLI 生成骨架（推荐）

```bash
oxn blueprint new my-blueprint --slots build,test,deploy
# 生成 .openxenon/blueprints/my-blueprint.oxn
oxn blueprint validate my-blueprint
oxn work new --work-id my-work --blueprint my-blueprint
```

### 2. 手写

```bash
$EDITOR .openxenon/blueprints/my-blueprint.oxn
```

最小模板：

```oxn
blueprint "tiny" {
  version = 1
  description = "tiny test"
  slot "alpha" { deps = [] }
  slot "beta" { deps = ["alpha"] }
}
```

### 3. 派生 builtin

```bash
cp src/builtin/blueprints/verify-pipeline.oxn .openxenon/blueprints/mine.oxn
$EDITOR .openxenon/blueprints/mine.oxn
```

`src/builtin/blueprints/*.oxn` 已经用统一 grammar 写就。

## 验证 + 驱动

```bash
oxn blueprint validate my-blueprint          # 语法检查
oxn work new --work-id my-work --blueprint my-blueprint  # 启动状态机
oxn leader submit --work-name my-work         # 推进
oxn leader status --work-name my-work        # 读状态
```

## ❌ 常见错误

1. **使用 reference 时代的"type 字段"或"part slot"语法**
   ```oxn
   # 错误（reference 语法）
   blueprint "X" type "task" { part slot "y" { } }

   # 正确（统一语法）
   blueprint "X" { slot "y" { } }
   ```

2. **使用旧的"fs_match / shell_exec"等 probe type 名字**
   ```
   # 错误：探针不存在
   type: fs_match
   type: shell_exec

   # 正确：探针通过 align + ref 引用，不是 type 字段
   probe "my-probe" align "ShellExec" ref "@oxn/probes/shell_exec" { ... }
   ```

3. **使用 `@prj/...` 引用 scheme（参考时代但从未实现）**
   ```
   # 错误
   ref = "@prj/blueprints/my-bp"

   # 正确
   ref = "@oxn/blueprints/my-bp"
   ```
