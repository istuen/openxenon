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

### oxn work context
获取 AI 可见上下文（**全量隔离**）。

```bash
# Task 级（隔离，只看 align 到的 domain）
oxn work context --work <name> --task <name> --json
oxn work context --work <name> --task <name> --emit-md

# Work 级（不隔离，看 work 完整资源池）
oxn work context --work <name> --json
```

### oxn work（生命周期 + 状态机）

v0.1 hard-switch 之后，唯一的工作流入口。吸收了原 `oxn leader *` 和 `oxn work task *` 全部子命令。

```bash
# 创建（从 blueprint 生成含 task 块的 work.oxn）
oxn work create <id> --blueprint <bp> [--blueprint-file F] [--name N]
oxn work create <id>                                    # 简化骨架模式

# 列出 / 校验
oxn work list
oxn work validate --path <work.oxn>

# 状态机驱动
oxn work run    --work-file <work.oxn> --json
oxn work submit --work <w> --task <t> [--run-probes] --json
oxn work status --work <w> --json

# Task 生命周期（v0.1 扁平化到 work 下）
oxn work add-task     --work <w> --task <t> --blueprint <bp> [--domain <d>] [--force]
oxn work list-tasks   --work <w>
oxn work task-status  --work <w> --task <t>
oxn work task-edit    --work <w> --task <t> [--objective S] [--add-constraint S] [--add-domain D]
oxn work task-delete  --work <w> --task <t> --force [--keep-state]

# 恢复 / 完成 / 迁移
oxn work resume   --work-name <w>
oxn work complete --work-name <w>
oxn work migrate  [--dry-run] [--work-name <w>] [--force]
```

### oxn blueprint
Blueprint 资产管理（Intent 技术层）。

```bash
oxn blueprint create <name> [--slots <list>] [--force]
oxn blueprint validate <name>
oxn blueprint list
```

### oxn domain
Domain 资产管理（Intent 业务层，DDD 限界上下文）。

```bash
oxn domain create <DomainName> [--force]
oxn domain validate <DomainName> [--file-path F]
oxn domain list
```

### oxn dev（DSL 内部工具）

v0.1 把所有底层 DSL 操作收纳到 `oxn dev` 命名空间。

```bash
oxn dev compile      <file.oxn> [-o DIR]
oxn dev unpack       <file.bundle.oxn> [-o DIR] [--force]
oxn dev validate     [--standard]
oxn dev migrate-yaml <file> [--all] [--dir D]
oxn dev promote      <task-dir> [--as-new N] [--force]
```

### oxn install-skill
把内置 Skill 镜像到 `.opencode/skills/`（默认装全部 `oxn-cli` + `oxn-work`）。

```bash
oxn install-skill
oxn install-skill --skill oxn-cli --force
```

### oxn global hall
打开工程师工作台（Web UI，🔜 v0.2）。

```bash
oxn global hall [--open]
```

> 注：`oxn global arsenal *` 已并入 `oxn dev *`（probe/blueprint 资产由手写 .oxn 文件 + `oxn dev validate` 兜底）。

## 4. 错误码速查

| Code | 含义 | 修复 |
|---|---|---|
| `OXN_NO_PROJECT` | 项目未初始化 | `oxn init` |
| `OXN_INVALID_NAME` | 名称格式错误 | 用 kebab-case / PascalCase |
| `OXN_TASK_OXN_MISSING` | work 声明了 task 但 task.oxn 缺 | `oxn work add-task` |
| `OXN_TASK_NOT_FOUND` | submit 时 task 未启动 | 先 `oxn work run` |
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
oxn domain create MemberContext
# 编辑 .openxenon/domains/member-context.oxn
oxn domain validate MemberContext

# 2. 准备蓝图
oxn blueprint create dev-workflow --slots build,test
# 编辑 .openxenon/blueprints/dev-workflow.oxn

# 3. 创建 work
oxn work create onboarding --blueprint dev-workflow
# 编辑 .openxenon/works/onboarding/work.oxn，添加 domain ref

# 4. 创建 task
oxn work add-task --work onboarding \
  --task register-member \
  --blueprint dev-workflow --domain MemberContext

# 5. 获取 AI 上下文（全量隔离）
oxn work context --work onboarding --task register-member --json

# 6. AI 执行
# (在 AI 助手软件中读取上下文，写代码)

# 7. 推进状态
oxn work run    --work-file .openxenon/works/onboarding/work.oxn --json
oxn work submit --work onboarding --task register-member --json
oxn work status --work onboarding --json

# 8. 审查 frozen.json
cat .openxenon/works/onboarding/tasks/register-member/frozen.json
```

## 6. 下一章

- [OXN DSL 参考](./oxn-dsl.md) — 完整语法
- [Probe 类型参考](./probe-types.md)
- [State Schema 参考](./state-schema.md)
