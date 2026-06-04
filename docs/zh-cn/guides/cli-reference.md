# CLI 命令参考

本文档提供 OpenXenon CLI 的完整命令参考。

## 全局选项

| 选项 | 描述 |
|------|------|
| `-v, --verbose` | 启用详细输出 |
| `-j, --json` | 以 JSON 格式输出 |

## 命令作用域

CLI 命令分为 **项目级** 和 **全局** 两种作用域：

| 作用域 | 前缀 | 描述 |
|--------|------|------|
| 项目级 | `oxn <command>` | 操作当前项目 `.openxenon/` 下的资产 |
| 全局 | `oxn global <command>` | 操作全局 Arsenal（`~/.openxenon/`），供所有项目共享 |

**典型场景**：

- `oxn arsenal list` - 查看当前项目的标准资产
- `oxn global arsenal list` - 查看全局可复用的标准资产

> 全局命令仅供工程师使用，AI 代理应使用项目级命令。

## oxn init

初始化项目，在当前目录创建 `.openxenon` 围栏。

```bash
oxn init
```

**输出**：

```
✓ Created .openxenon/
✓ Created .openxenon/config.json
✓ Project initialized
```

## oxn forge

锻造 Draft 标准资产。

### 查看元 Forge 约束

```bash
# 查看所有元 Forge 约束
oxn forge

# 查看 Probe 元 Forge 约束
oxn forge probe

# 查看 Part 元 Forge 约束
oxn forge part

# 查看 Blueprint 元 Forge 约束
oxn forge blueprint
```

### 保存 Draft 资产

```bash
oxn forge <type> --save '<yaml>' --name <name>
```

**参数**：

| 参数 | 必需 | 描述 |
|------|------|------|
| `<type>` | 是 | 资产类型：probe、part、blueprint |
| `--save <yaml>` | 是 | YAML 内容 |
| `--name <name>` | 是 | 资产名称 |
| `--global` | 否 | 保存到全局 Arsenal（0.2） |

**示例**：

```bash
oxn forge probe --save '
type: fs_exists
description: "检查文件是否存在"
parameters:
  - name: pattern
    type: string
    required: true
' --name check-file
```

## oxn arsenal

标准资产管理命令。

### oxn arsenal list

列出标准资产。

```bash
oxn arsenal list [DRAFT|CANONICAL]
```

**输出示例**：

```
## PROBES
  [FORMAL] fs_exists
  [FORMAL] fs_match
  [DRAFT] check-file

## PARTS
  [FORMAL] build

Total: 4 assets
```

### oxn arsenal inspect

查看资产内容。

```bash
oxn arsenal inspect <type>/<name>
```

**示例**：

```bash
oxn arsenal inspect probes/check-file
```

### oxn arsenal promote

将 DRAFT 资产转正为 FORMAL。

```bash
oxn arsenal promote <type>/<name>
```

**示例**：

```bash
oxn arsenal promote probes/check-file
```

**输出**：

```
✓ Asset promoted
  Name: check-file
  Type: probes
  New State: FORMAL
```

### oxn arsenal render

预览 Blueprint DAG 拓扑图。

```bash
oxn arsenal render <blueprint-name>
```

## oxn work

Work 管理命令（新，替代 task 命令）。

### oxn work new

使用 Blueprint 创建新 Work。

```bash
oxn work new <work-id> --type task --blueprint <blueprint-name>
```

**参数**：

| 参数 | 必需 | 描述 |
|------|------|------|
| `<work-id>` | 是 | Work ID（kebab-case） |
| `--type <type>` | 是 | Work 类型：task、plan、explore 或自定义 |
| `--blueprint <name>` | 否 | 引用的 Blueprint 名称 |
| `--name <name>` | 否 | 显示名称 |

**输出**：

```
Work created: my-work
Type: task
Path: .openxenon/work/task/my-work.oxn
```

### oxn work resume

获取下一个待执行的 Part。

```bash
oxn work resume <work-id>
```

**输出**：

```
Part: develop
Target: 在 src/ 目录下实现功能
Action: 根据规范编写代码
```

### oxn work complete

标记 Work 完成。

```bash
oxn work complete <work-id>
```

**输出**：

```
Work: my-work
Status: COMPLETED
Parts passed: 3/3
```

### oxn work list

列出所有 Work。

```bash
oxn work list
```

### oxn work validate

验证 Work 文件语法。

```bash
oxn work validate <path-to-work.oxn>
```

## oxn domain 🌟 v0.1 新增

DDD 限界上下文管理命令。在 `.openxenon/domains/` 下创建、校验、列出 Domain 文件。

### oxn domain new

生成一个新的 Domain 骨架。

```bash
oxn domain new --name <DomainName>
```

**参数**：

| 参数 | 必需 | 描述 |
|------|------|------|
| `--name` | 是 | Domain 名称（PascalCase，如 `MemberContext`） |
| `-f, --force` | 否 | 覆盖已存在的文件 |

**示例**：

```bash
oxn domain new --name MemberContext
# Created domain MemberContext at .openxenon/domains/member-context.oxn
```

### oxn domain validate

解析并校验 Domain 文件。

```bash
oxn domain validate --name <DomainName>
oxn domain validate --name X --file-path .openxenon/domains/x.oxn
```

**输出示例**：

```
Domain MemberContext ✓ valid
  Language: 2 nouns, 2 verbs, 3 banned
  Rules: 2
  Context Map: 1 imports
```

### oxn domain list

列出所有已注册的 Domain。

```bash
oxn domain list
oxn domain list --json
```

**输出示例**：

```
Registered domains:
  - MemberContext (member-context.oxn)
      会员限界上下文：管理注册、认证、会员等级
  - OrderContext (order-context.oxn)
      订单限界上下文
  - MarketingContext (marketing-context.oxn)
      营销限界上下文
```

## oxn work task 🌟 v0.1 新增

Workspace 内 Task 生命周期管理。在 `.openxenon/works/<work>/tasks/<task>/` 下创建 task.oxn。

### oxn work task new

在指定 work 下创建新的 task.oxn，绑定一份 Blueprint + 注入若干 Domain。

```bash
oxn work task new --work <W> --task <T> --blueprint <B> [--inject D1,D2]
```

**参数**：

| 参数 | 必需 | 描述 |
|------|------|------|
| `--work` | 是 | Work 名称 |
| `--task` | 是 | Task 名称 |
| `--blueprint` | 是 | Blueprint 名（必须出现在 work.oxn 的 use_blueprint 列表中） |
| `--inject` | 否 | 注入的 Domain 列表（必须出现在 work.oxn 的 use_domain 列表中） |
| `-f, --force` | 否 | 覆盖已存在文件 |

**示例**：

```bash
oxn work task new --work onboarding --task register-member \
  --blueprint dev-workflow --inject MemberContext
```

### oxn work task list

列出 work 下所有 task。

```bash
oxn work task list --work <W>
```

### oxn work task status

查看 task 状态。

```bash
oxn work task status --work <W> --task <T>
```

## oxn work migrate 🌟 v0.1 新增

v0.1 硬迁移工具。把旧的 `.openxenon/work/task/<name>.oxn` 改造为新的 `works/<name>/work.oxn` 格式，把单层 state.json 拆为双层。

```bash
oxn work migrate [--dry-run] [--work-name X] [-f]
```

**示例**：

```bash
# 预览
oxn work migrate --dry-run
# [DRY-RUN] Detected 1 potential actions:
#   [pending] legacy-work: migrate work.oxn (dry-run)

# 实际迁移
oxn work migrate
# Migration completed. 1 actions done, 0 skipped, 0 errors.
```

## oxn get-context 🌟 v0.1 新增

返回 AI 可见的 task 工作上下文。**全量隔离**——只返回 task 自己 inject 的 domain。

```bash
oxn get-context --work <W> --task <T> [--emit-md <path>]
oxn get-context --work <W>                       # work 级（无隔离）
```

**参数**：

| 参数 | 必需 | 描述 |
|------|------|------|
| `--work` | 是 | Work 名称 |
| `--task` | 否 | Task 名称（不传则返回 work 级上下文） |
| `--state-path` | 否 | 可选，state.json 路径（用于 currentFocus） |
| `--emit-md` | 否 | 把摘要写到指定 .md 路径 |

**输出示例**：

```
# Context for onboarding / register-member

Blueprint: dev-workflow
Current part: develop
Status: pending

## Injected Domains (isolated)
### MemberContext
会员限界上下文：管理注册、认证、会员等级
Nouns: Member, Account

## Allowed Language
Nouns (must use): Member, Account

## 本 task 只能看到 inject 列表中的 domain，work 中其他 domain 一律不可见。
```

## oxn task (legacy)

> **v0.1 状态**：保留旧 `oxn task` 命令以兼容既有工作流（指向 `.openxenon/tasks/<id>/`）。
> 新工作流请使用 `oxn work task`（指向 `works/<work>/tasks/<task>/`）。

### oxn task submit (legacy)

```bash
oxn task submit --blueprint <file>
```

### oxn task next (legacy)

```bash
oxn task next --task-id <id>
```

### oxn task verify (legacy)

```bash
oxn task verify --task-id <id> --stage-id <id>
```

### oxn task status (legacy)

```bash
oxn task status --task-id <id>
```

## oxn export

导出 task-trace.yaml。

```bash
oxn export
```

## oxn gc

清理已完成任务的旧资产。

```bash
oxn gc
```

## oxn daemon

管理 Daemon 进程（0.2 目标）。

```bash
oxn daemon start   # 启动 daemon
oxn daemon stop    # 停止 daemon
oxn daemon status  # 查看状态
```

> 0.1 阶段所有核心命令均通过 CLI 直连可用，不依赖 Daemon。

## oxn hall

打开研讨厅 (Hall)，查看项目状态和待办。

```bash
oxn hall
oxn hall --open
```

**参数**：

| 选项 | 描述 |
|------|------|
| `--open` | 在浏览器中打开 Hall |

**输出**：

```
Hall 路径: /path/to/project/.openxenon/hall/index.html

使用 --open 在浏览器中打开
```

**功能说明**：

- 扫描项目 `.openxenon/` 目录下的 tasks 和 forges
- 生成静态 HTML 页面展示：
  - 任务统计（总数、运行中、已完成、失败）
  - 待审查的 Draft 资产列表
  - 任务列表（可点击查看详情）
- 每个项目有独立的 Hall 视图，物理隔离不互相覆盖

**详情弹窗显示**：

- Part DAG 拓扑图
- 各 Part 的执行状态
- 探针执行结果（PASSED/FAILED）
- probe 输出和错误信息
