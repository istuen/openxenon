# Blueprint 格式参考（oxn-work 用）

> **基于统一 OXL（`src/oxl/langium/oxn.langium`）**。语法跟 mvp / reference 任一时代的"旧版"都不兼容——请按本文档为准。

## 蓝图结构

```oxn
blueprint "<name>" {
  version = 1                          // 必填（推荐）
  description = "<一句话描述>"          // 推荐

  // 可选：蓝图级参数（注入所有 part）
  prop "<name>" { type = string; default = "dev" }

  // 必填：≥1 个 slot
  slot "<stage-1>" { deps = [] }
  slot "<stage-2>" { deps = ["<stage-1>"] }
}
```

> **v0.1 已删除**：`expectation` / `rule` / `context`（蓝图级 AI 上下文）块。验证由 Probe 承担，蓝图级 AI 上下文放在 work.oxn 的 `context { goal / constraints }` 里。

## Slot 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `slot "name"` | ✅ | Slot 名称（kebab-case 推荐） |
| `deps = ["other"]` | 否 | 依赖的其他 slot 列表（不填 = 无依赖） |
| `observe = ["ShellExec"]` | 否 | 该 slot 关注的探针名（运行时 `submit --run-probes` 触发） |

## Slot DAG 4 大模式

`oxn blueprint create --slots` 默认生成**线性 chain**（`a → b → c`）。但 slot 之间的 deps 可以表达任意 DAG：

### 1. linear pipeline（顺序执行）

```oxn
blueprint "linear" {
  slot "build"  { deps = [] }
  slot "test"   { deps = ["build"] }
  slot "deploy" { deps = ["test"] }
}
```

### 2. fan-out（一分多）

```oxn
blueprint "fan-out" {
  slot "build"  { deps = [] }
  slot "lint"   { deps = ["build"] }
  slot "type-check" { deps = ["build"] }  // build 完成 → lint + type-check 并行
  slot "test"   { deps = ["lint", "type-check"] }  // 两者都过 → test
}
```

### 3. fan-in（多合一）

```oxn
blueprint "fan-in" {
  slot "input-a"  { deps = [] }
  slot "input-b"  { deps = [] }
  slot "merge"    { deps = ["input-a", "input-b"] }
}
```

### 4. parallel + final（通用）

```oxn
blueprint "ci-pipeline" {
  slot "build"   { deps = [] }
  slot "test"    { deps = ["build"] }
  slot "lint"    { deps = ["build"] }
  slot "e2e"     { deps = ["test", "lint"] }
  slot "release" { deps = ["e2e"] }
}
```

**反模式**：
- ❌ 永远线性 chain（哪怕分支更合理）— CLI 默认的诱惑，要克制
- ❌ slot 名用 PascalCase — 必须 kebab-case
- ❌ deps 里有 cycle — `oxn blueprint validate` 会拒绝

## Prop 设计（蓝图级参数）

`prop` 注入到该 blueprint 的**所有 part**（跨 slot 共享）：

```oxn
blueprint "dev-workflow" {
  prop "env"      { type = string; default = "dev" }       // 字符串，默认值
  prop "timeout"  { type = number; default = 30000 }      // 数字，默认值
  prop "branches" { type = list<string>; required = true }  // 列表，必填
  prop "regions"  { type = map<string>; default = {} }   // 映射

  slot "develop" { deps = [] }
  slot "test"    { deps = ["develop"] }
}
```

支持的 `type`：`string` / `number` / `boolean` / `list<T>` / `map<T>` / `any`。

**反模式**：
- ❌ 把 prop 当 part-local 变量（prop 是蓝图级，跨所有 slot 共享）
- ❌ prop 名用大写（必须 kebab-case）

## observe 引用 builtin 探针

```oxn
blueprint "dev-workflow" {
  slot "test" {
    deps = ["develop"]
    observe = ["lint-check", "type-check", "test-runner"]   // 引用 builtin
  }
}
```

builtin 探针（`@oxn/...` 命名空间）：

| builtin 名 | 用途 |
|---|---|
| `@oxn/probes/shell_exec` | 跑 shell 命令（返回 exit_code / stdout / stderr） |
| `@oxn/probes/fs_exists` | 检查文件/目录是否存在 |
| `@oxn/probes/lint-check` | 跑 linter |
| `@oxn/probes/test-runner` | 跑测试套件 |
| `@oxn/probes/type-check` | 跑类型检查 |

**反模式**：
- ❌ 用 builtin 能解决却自己造轮子（增加维护成本）
- ❌ observe 引用 builtin 名拼写错（runtime 触发时报 `probe not found`）

## 创建 Blueprint 的三种方式

### 1. 用 CLI 生成骨架（推荐）

```bash
oxn blueprint create my-blueprint --slots build,test,deploy
# 生成 .openxenon/blueprints/my-blueprint.oxn
oxn blueprint validate my-blueprint
oxn work create my-work --blueprint my-blueprint
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
oxn work create my-work --blueprint my-blueprint  # 启动状态机
oxn work submit --work-name my-work         # 推进
oxn work status --work-name my-work        # 读状态
```

## ❌ 常见错误

1. **使用 reference 时代的"type 字段"或"part slot"语法**
   ```oxn
   # 错误（reference 语法）
   blueprint "X" type "task" { part slot "y" { } }

   # 正确（统一语法）
   blueprint "X" { slot "y" { } }
   ```

2. **使用 `expectation` / `rule` 块（v0.0.x 残留，v0.1 已删除）**
   ```oxn
   # 错误（v0.1 已删除）
   blueprint "X" {
     expectation "..." { probe = "..." }
     rule "..." { condition = ... }
   }

   # 正确：验证由 Probe 承担（在 task.part.probe 块内联）
   ```

3. **使用 `@prj/...` 引用 scheme（参考时代但从未实现）**
   ```
   # 错误
   ref = "@prj/blueprints/my-bp"

   # 正确
   ref = "@oxn/blueprints/my-bp"
   ```

4. **probe / part 写到 `.openxenon/arsenals/{probes,parts}/`（v0.0.x 残留）**
   ```
   # 错误：v0.1 起 probe/part 不是独立资产
   mkdir .openxenon/arsenals/probes/

   # 正确：在 task.oxn 的 part 块内联写
   task "..." {
     part "..." {
       skill_context = "..."
       probe "my-probe" { prop "..." { ... }; output { ... } }
     }
   }
   ```
