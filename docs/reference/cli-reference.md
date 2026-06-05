# CLI 命令参考

> OpenXenon v0.1 完整 CLI 命令参考。所有命令以 `oxn` 为入口。

## 1. 全局选项

| 选项 | 描述 |
|---|---|
| `-v, --verbose` | 详细输出 |
| `-j, --json` | JSON 格式输出 |
| `--yaml` | YAML 格式输出 |
| `--html` | HTML 格式输出 |
| `--md` | Markdown 格式输出 |
| `--help` | 帮助 |

## 2. 项目级 vs 全局

| 范围 | 前缀 | 作用 |
|---|---|---|
| 项目级 | `oxn <command>` | 操作当前项目的 `.openxenon/` |
| 全局 | `oxn global <command>` | 操作 `~/.openxenon/`（跨项目共享） |

> 全局命令主要为工程师使用；AI agent 应使用项目级命令。

## 3. 核心命令

### oxn init
初始化项目，创建 `.openxenon/` 边界。

```bash
oxn init
```

### oxn config
管理 `.oxnrc` 配置（leader 模式等）。

```bash
oxn config show
oxn config set leaderMode reference|mvp
```

### oxn get-context
获取 AI 可见上下文（**全量隔离**）。

```bash
# Task 级（隔离，只看 align 到的 domain）
oxn get-context --work <name> --task <name> --json
oxn get-context --work <name> --task <name> --emit-md

# Work 级（不隔离，看 work 完整资源池）
oxn get-context --work <name> --json
```

### oxn leader
驱动 Work 状态机（run / submit / status / new）。

```bash
# 从 blueprint 生成 work 骨架
oxn leader new --name <work> [--blueprint-file <bp.oxn>]

# 启动 workspace 状态机
oxn leader run --work-file <work.oxn> --json

# 推进 task（v0.1: --task 必填）
oxn leader submit --work-name <w> --task <t> [--run-probes] --json

# 查询进度
oxn leader status --work-name <w> --json

# 列出内置 ldr-*.oxn 模板
oxn leader list
```

### oxn work
Work 生命周期（v0.1 双层：work + task）。

```bash
# 创建 work 骨架
oxn work new --work-id <id> [--blueprint <bp>]

# 列出所有 work
oxn work list

# 验证 work 文件
oxn work validate <path>

# 任务管理（v0.1）
oxn work task new    --work-name <w> --task-name <t> --blueprint <bp> [--domain <d>]
oxn work task status --work-name <w> --task-name <t>
oxn work task list   --work-name <w>
oxn work task edit   --work-name <w> --task-name <t> [--objective ...] [--add-constraint ...]
oxn work task delete --work-name <w> --task-name <t> --force
oxn work task submit --work-name <w> --task-name <t> [--run-probes]

# 旧 work.oxn 迁移（v0.0.x → v0.1）
oxn work migrate [--dry-run]
```

### oxn blueprint
Blueprint 资产管理。

```bash
oxn blueprint new <name> [--slots <list>]
oxn blueprint validate <name>
```

### oxn domain
Domain 资产管理（v0.1 新增）。

```bash
oxn domain new --name <DomainName>
oxn domain validate --name <DomainName>
oxn domain list
```

### oxn arsenal
Arsenal 资产管理（v0.0.x 兼容）。

```bash
oxn arsenal list [DRAFT|CANONICAL]
oxn arsenal inspect <type>/<name>
oxn arsenal promote <type>/<name>
oxn arsenal fork     <type>/<name> --into <new-name>
oxn arsenal extract  <type>/<name>
```

### oxn forge
从 YAML 生成 Draft 资产（v0.0.x 兼容）。

```bash
oxn forge probe    --save '<yaml>' --name <n>
oxn forge part     --save '<yaml>' --name <n>
oxn forge blueprint --save '<yaml>' --name <n>
```

### oxn install-skill
把内置 Skill 镜像到 `.opencode/skills/`。

```bash
oxn install-skill
```

### oxn hall
打开工程师工作台（Web UI，🔜 v0.2）。

```bash
oxn hall [--open]
```

## 4. 错误码速查

| Code | 含义 | 修复 |
|---|---|---|
| `OXN_NO_PROJECT` | 项目未初始化 | `oxn init` |
| `OXN_INVALID_NAME` | 名称格式错误 | 用 kebab-case / PascalCase |
| `OXN_TASK_OXN_MISSING` | work 声明了 task 但 task.oxn 缺 | `oxn work task new` |
| `OXN_TASK_NOT_FOUND` | submit 时 task 未启动 | 先 `oxn leader run` |
| `OXN_BLUEPRINT_NOT_IN_WORK` | work.oxn 没 ref 该 blueprint | 改 work.oxn |
| `OXN_DOMAIN_NOT_IN_WORK` | work.oxn 没 ref 该 domain | 改 work.oxn |
| `OXN_DSL_PARSE_FAILED` | .oxn 语法错 | 看错误信息修正 |
| `OXN_WORK_ALREADY_EXISTS` | 重复 run | 用 `status` 看现有 |
| `OXN_WORK_NOT_FOUND` | submit/status 找不到 work | 确认 work 名 |
| `OXN_OUTPUT_FILE_EXISTS` | 文件已存在 | 用 `--force` |

## 5. 典型工作流

```bash
# 0. 初始化
oxn init

# 1. 定义业务上下文（可选）
oxn domain new --name MemberContext
# 编辑 .openxenon/domains/member-context.oxn
oxn domain validate --name MemberContext

# 2. 准备蓝图
oxn blueprint new dev-workflow --slots build,test
# 编辑 .openxenon/blueprints/dev-workflow.oxn

# 3. 创建 work
oxn leader new --name onboarding
# 编辑 .openxenon/works/onboarding/work.oxn，添加 domain ref

# 4. 创建 task
oxn work task new --work-name onboarding \
  --task-name register-member \
  --blueprint dev-workflow --domain MemberContext

# 5. 获取 AI 上下文（全量隔离）
oxn get-context --work onboarding --task register-member --json

# 6. AI 执行
# (在 AI 助手软件中读取上下文，写代码)

# 7. 推进状态
oxn leader run    --work-file .openxenon/works/onboarding/work.oxn --json
oxn leader submit --work-name onboarding --task register-member --json
oxn leader status --work-name onboarding --json

# 8. 审查 frozen.json
cat .openxenon/works/onboarding/tasks/register-member/frozen.json
```

## 6. 下一章

- [OXN DSL 参考](./oxn-dsl.md) — 完整语法
- [Probe 类型参考](./probe-types.md)
- [State Schema 参考](./state-schema.md)
