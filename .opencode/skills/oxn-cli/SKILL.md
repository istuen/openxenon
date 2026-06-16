---
name: oxn-cli
description: 统一的 OpenXenon CLI 操作入口，把自然语言翻译成 oxn 命令并执行
---
# /oxn-cli — OpenXenon CLI 入口

> 这个 skill 教你怎么调用 OpenXenon 的 `oxn` 命令行工具（v0.1 hard-switch 后的 8 顶层命令）。

## 何时用

当你需要：
- 初始化项目（`oxn init`）
- 校验 .oxn 文件
- 获取 AI 工作上下文（`oxn work context`）
- 查询项目状态
- **创建 Intent（Domain / Blueprint 骨架）** — 详见本 skill 末尾的「Intent 创作最佳实践」

## 全局选项

所有命令支持：
- `-j, --json` — JSON 输出
- `-v, --verbose` — 详细输出
- `--help` — 帮助

## 常用命令

### 项目初始化

```bash
oxn init                 # 创建 .openxenon/ 边界
oxn config show          # 查看项目配置
```

### Domain 管理

```bash
oxn domain create <DomainName>          # 生成 Domain 骨架
oxn domain validate <DomainName>        # 校验 Domain
oxn domain list                                 # 列出所有 Domain
```

### Blueprint 管理

```bash
oxn blueprint create <name> [--slots a,b,c]   # 生成 Blueprint 骨架
oxn blueprint validate <name>                 # 校验 Blueprint
oxn blueprint list                            # 列出所有 Blueprint
```

### Work / Task 生命周期

```bash
oxn work create <w> --blueprint <bp> # 从 Blueprint 生成 work 骨架（含 task 块）
oxn work add-task --work <w> --task-name <t> --blueprint <bp> [--domain <d>]
oxn work list-tasks --work <w>
oxn work task-status --work <w> --task <t>
oxn work run --work-file <work.oxn>            # 启动状态机
oxn work submit --work-name <w> --task <t>     # 推进 task
oxn work status --work-name <w>                # 查询进度
```

### 获取 AI 上下文（**全量隔离**）

```bash
# Task 级：只看 task 注入的 domain
oxn work context --work <w> --task <t> --json

# Work 级：看 work 完整资源池（不隔离）
oxn work context --work <w> --json
```

### Dev 工具（DSL 内部）

```bash
oxn dev compile <file.oxn>             # OXL → AssemblyIR
oxn dev validate                        # 校验 .oxn 语法
oxn dev migrate-yaml <file>             # YAML → OXL
```

### Token 可观测（v0.2.2+）

每完成一个 task part 后调用 `oxn token ingest` 上报本轮 AI 模型 Token 消耗：

```bash
oxn token ingest --input-json '{
  "source": "opencode",
  "sessionID": "<当前会话ID>",
  "workRef": "<work名>",
  "taskRef": "<task名>",
  "modelID": "<模型标识>",
  "providerID": "<提供商标识>",
  "timestamp": 1718500000000,
  "tokens": {"input": 1200, "output": 800},
  "cost": 0.03
}'
```

- `source`: `opencode` / `claude` / `manual`
- `tokens.input` / `tokens.output`: 本轮的 prompt 与 completion token 消耗
- `cost`: 本轮费用（美元）
- `timestamp`: Unix 毫秒时间戳

---

## 反模式

- 不要在 AI 助手软件中跑 `oxn init`（已 init 过）
- 不要直接编辑 `.openxenon/works/<w>/state.json`（Core 独占）
- 不要在 Domain 内引用 asset（破坏 Asset Independence）
- 不要用 YAML/JSON 写 Blueprint（v0.1 起 OXL 单一权威）
- 不要调用 `oxn task *` / `oxn arsenal *` / `oxn leader *` / `oxn get-context` / `oxn add-probe` — **已彻底删除**
- 不要调用 `oxn work new` — 改用 `oxn work create`
- 不要调用 `oxn work task *` — 改用 `oxn work add-task` / `list-tasks` / `task-status` / `task-edit` / `task-delete`
- **不要试图 `oxn part new` / `oxn probe new`** — Part / Probe **不是独立资产**（设计上如此），它们在 `work create` 之后**内联**在 `work.oxn` / `task.oxn` 的 `task { part { ... } }` / `part { probe { ... } }` 块里写
- **不要用 `--name <X>` 命名参数** — 域/蓝图/work create 与 validate 都用 **positional `<name>`**（OXL 与 CLI 1:1 映射）
- **不要设计 `oxn domain append-term` / `oxn blueprint add-prop`** — Intent 资产用 `$EDITOR` 编辑，CLI 只提供脚手架（详见「Intent-Align CLI 哲学」）

---

## Intent 创作最佳实践

> **CLI 只生成「空骨架」**，Intent 的实际内容（DDD 词汇、slot 拓扑、prop schema、skill_context 文案）由 AI 填写。本节是填写指南。

### 1. Domain 创作（业务 Intent）

骨架（`oxn domain create` 产出）只有 TODO 占位。**好的 Domain 写法**（参考 `.openxenon/domains/work-context.oxn`）：

```oxn
domain "MemberContext" {
  description = "会员限界上下文：管理注册、认证、会员等级"

  term {                              // ✅ 必填 ≥3 个核心实体
    "Member":     "注册会员实体"
    "Account":    "会员的登录凭证"
    "Membership": "会员等级与权益记录"
  }

  ban { "User", "Customer", "AccountHolder" }  // ✅ 必填 ≥2 个禁词

  invariant {                              // ✅ 必填 ≥1 个不变量。写法决策见下方「invariant 写法决策树」
    "密码任何时候都不能明文存储"
    "同一邮箱在同一上下文内不可重复注册"
  }
}
```

**反模式**：
- ❌ term 只有 1 个词（粒度太粗）
- ❌ ban 列表为空（没有约束力）
- ❌ description 写「TODO: 描述业务边界」（CLI 占位，必须替换）

**口诀**：term 列实体，ban 列禁词，invariant 列硬规则；写法按下方「invariant 写法决策树」3 步反问（1 条→单块单条 / 同主题→单块多条 / 异主题→多块），IR 等价。

#### invariant 写法决策树

> 三种写法 IR 压平后等价（`OxnDomainIR.invariant: OxnInvariantDecl[]`）。
> AI 写新 Domain 时，**先问自己 3 步**，不要无脑拆多块。

**反问自己（3 步）**：
1. 只有 1 条不变量吗？→ 用**单块单条**：`invariant { "r1" }`
2. 多条不变量需要 `// ── <主题> ──` 注释分组（≥2 个不同主题）吗？→ 用**多块**（案例 A）
3. 否则？→ 用**单块多条**（案例 B，IR 等价、紧凑优先）

**案例 A — 多块（按主题分组）**：

```oxn
// ───── 字典收敛硬约束 ─────
invariant { "IAPError 字典 v1.0.2 收敛为 5 个" }
invariant { "OXNCrash 字典 v1.0.2 收敛为 3 个" }

// ───── 通道与进程契约 ─────
invariant { "IAPError 走 stdout JSON 通道" }
invariant { "OXNCrash 走 stderr stack 通道" }
```

**案例 B — 单块多条（同主题紧凑）**：

```oxn
invariant {
  "Work 的运行时类型必须与 Blueprint.type 强一致"
  "frozen.json 生成后不可修改"
  "work-trace.jsonl 只能追加写"
  "同一 part 只能被提交一次"
  "Artifact 路径必须落在 Work 沙盒内"
}
```

**边界情况**：
- 1 条超长（>100 字）→ 单块单条独占，不混
- >5 条无主题 → 单块多条（避免视觉噪声）
- git diff 需要单条独立可见 → 多块

**反模式**：
- ❌ 只有 1 条还拆多块（`invariant {} invariant {}`）— 纯噪声
- ❌ 5+ 条无主题硬塞多块（reader 找不到分组线索）
- ❌ 同一文件混用单块多条/多块风格没有明显原因（破坏视觉一致性）

### 2. Blueprint 创作（技术 Intent）

骨架（`oxn blueprint create --slots`）默认生成**线性 slot DAG**：`a → b → c`。

**slot DAG 4 大模式**：

| 模式 | 适用场景 | 写法 |
|---|---|---|
| **linear pipeline** | 顺序执行 | `a → b → c`（CLI 默认） |
| **fan-out** | 一个起点并行 N | `split → { a, b }` |
| **fan-in** | N 合一 | `{ a, b } → merge` |
| **parallel + final** | 通用 | `build → { test, lint } → release` |

fan-out 例子：
```oxn
slot "split" { deps = [] }
slot "a"     { deps = ["split"] }
slot "b"     { deps = ["split"] }
slot "merge" { deps = ["a", "b"] }
```

**prop 设计模式**（蓝图级参数，注入到所有 part）：

```oxn
blueprint "dev-workflow" {
  prop "env"      { type = string; default = "dev" }
  prop "timeout"  { type = number; default = 30000 }
  prop "branches" { type = list<string>; required = true }

  slot "develop" { deps = []; observe = ["lint-check", "type-check"] }
  slot "test"    { deps = ["develop"]; observe = ["test-runner"] }
  slot "verify"  { deps = ["test"] }
}
```

**observe 引用 builtin 探针**（`@oxn/...` 命名空间）：

| builtin 名 | 用途 |
|---|---|
| `@oxn/probes/shell_exec` | 跑 shell 命令（返回 exit_code/stdout/stderr） |
| `@oxn/probes/fs_exists` | 检查文件/目录是否存在 |
| `@oxn/probes/lint-check` | 跑 linter |
| `@oxn/probes/test-runner` | 跑测试套件 |
| `@oxn/probes/type-check` | 跑类型检查 |

**反模式**：
- ❌ 永远线性 chain（哪怕分支更合理）— CLI 默认的诱惑
- ❌ slot 名用 PascalCase — 必须 kebab-case
- ❌ deps 里有 cycle — `oxn blueprint validate` 会拒绝

### 3. Part 内联创作（在 task 块 / work 块内）

> Part **没有独立文件**，**内联**在 `task "..." { part "..." { ... } }` 里。

**Part 字段语义**：

| 字段 | 必填 | AI 视角 |
|---|---|---|
| `lifecycle` | 可选 | `code` / `test` / `design` / `refactor`（默认 `code`） |
| `objective` / `skill_context` | ✅ 必填 | **做什么**（AI 第一句要读） |
| `acceptance` | ✅ 必填 | **可验收的产出**（AI 写完自检） |
| `guidance` | 可选 | **额外提示**（坑 / 约束 / 参考资料） |

**内联示例**：

```oxn
task "register-member" {
  blueprint "dev-workflow"
  domain "MemberContext"

  part "develop" {                          // 名字与 blueprint slot 对齐
    skill_context = "实现 Member 注册 API；密码必须 hash 存储"  // objective
    acceptance = [
      "POST /api/members 接收 {username, email, password}",
      "密码用 bcrypt（cost≥12）hash 后入库",
      "已写 OpenAPI schema"
    ]
    guidance = "参考 .openxenon/domains/member-context.oxn 的 ban 列表"
  }

  part "test" {
    skill_context = "为 Member 注册写单测"
    acceptance = ["≥80% 行覆盖", "边界用例：弱密码 / 重复邮箱 / 注入"]
  }
}
```

**反模式**：
- ❌ skill_context 只写"实现"（太抽象，AI 不知道要什么）
- ❌ acceptance 用模糊词（"好"/"完成"）— 必须可机器验证
- ❌ part 名与 blueprint slot 不对齐

### 4. Probe 内联创作（在 part 块内）

> Probe **没有独立文件**，**内联**在 `part "..." { probe "..." { ... } }` 里。

**场景 A：引用 builtin 探针**（推荐）：

```oxn
slot "verify" {
  deps = ["test"]
  observe = ["shell-exec", "fs-exists"]   // 引用 builtin 名
}
```

**场景 B：内联自定义探针**（builtin 不够用时）：

```oxn
part "verify" {
  skill_context = "校验密码强度"

  probe "check-password-strength" {        // 内联在 part 块内
    prop "password"   { type = string; required = true }
    prop "min-length" { type = number; default = 8 }
    output { ok = boolean; score = number }
  }
}
```

**Probe 字段语义**：

| 字段 | 必填 | 含义 |
|---|---|---|
| `description` | 推荐 | 探针做什么 |
| `prop "<name>"` | 按需 | 输入参数：`type` 必填；可加 `required` / `default` |
| `output` | 必填 | 输出字段：`name = type` 形式 |

**反模式**：
- ❌ 用 builtin 能解决却自己造轮子
- ❌ probe 没 output（kernel 不知道如何判定 pass/fail）
- ❌ prop 缺 `type`（语法报错）

### 5. work.oxn 完整填空示例

`oxn work create my-feature --blueprint dev-workflow` 生成：

```oxn
work "my-feature" {
  context { goal = "TODO"; constraints = ["TODO"]; loop_policy { max_iterations = 3 } }
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "develop" {
    blueprint "dev-workflow"
    part "slot-name" { skill_context = "TODO" }
  }
}
```

**AI 填空**：

```oxn
work "my-feature" {
  context {
    goal = "实现新会员注册功能"
    constraints = [
      "必须用 MemberContext.term.Member，不能用 User/Customer",
      "密码必须 hash 后存储"
    ]
    loop_policy { max_iterations = 5 }
  }
  blueprint "dev-workprint" ref "@prj/blueprints/dev-workflow";

  task "develop" {
    blueprint "dev-workflow"
    domain "MemberContext"
    part "develop" {                  // ← 改成与 blueprint slot 对齐
      skill_context = "实现 Member 注册 API，密码用 bcrypt hash 存储"
      acceptance = [
        "POST /api/members 接口可用",
        "密码 hash 存储，无明文"
      ]
    }
  }
}
```

### 6. 校验流程

写完一个 Intent 后**永远跑这三步**：

```bash
oxn domain validate <name>
oxn blueprint validate <name>
oxn work validate --path <work.oxn>
```

**详细参考**：`src/oxl/examples/works/` 下有 4 个完整范例（explore-dsl / develop-member / fix-issue / onboarding），可作模板直接仿写。

## 详细参考

- [CLI 命令参考](../../../docs/reference/cli-reference.md)
- [OXL 参考](../../../docs/reference/oxl.md)
- [Blueprint 格式参考（含 slot DAG 4 模式）](../../../docs/reference/blueprint-format.md)
- [work.oxn 4 大模式](../../../docs/architecture/work-and-task.md)

