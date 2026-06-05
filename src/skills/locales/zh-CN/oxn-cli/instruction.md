# /oxn-cli — OpenXenon CLI 入口

> 这个 skill 教你怎么调用 OpenXenon 的 `oxn` 命令行工具（v0.1 hard-switch 后的 8 顶层命令）。

## 何时用

当你需要：
- 初始化项目（`oxn init`）
- 校验 .oxn 文件
- 获取 AI 工作上下文（`oxn work context`）
- 查询项目状态

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
oxn domain create --name <DomainName>          # 生成 Domain 骨架
oxn domain validate --name <DomainName>        # 校验 Domain
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
oxn work create --work-id <w> --blueprint <bp> # 从 Blueprint 生成 work 骨架（含 task 块）
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
oxn dev compile <file.oxn>             # OXN DSL → AssemblyIR
oxn dev validate                        # 校验 .oxn 语法
oxn dev migrate-yaml <file>             # YAML → OXN DSL
```

## 反模式

- 不要在 AI 助手软件中跑 `oxn init`（已 init 过）
- 不要直接编辑 `.openxenon/works/<w>/state.json`（Core 独占）
- 不要在 Domain 内引用 asset（破坏 Asset Independence）
- 不要用 YAML/JSON 写 Blueprint（v0.1 起 OXN DSL 单一权威）
- 不要调用 `oxn task *` / `oxn arsenal *` / `oxn leader *` / `oxn get-context` / `oxn add-probe` — **已彻底删除**
- 不要调用 `oxn work new` — 改用 `oxn work create`
- 不要调用 `oxn work task *` — 改用 `oxn work add-task` / `list-tasks` / `task-status` / `task-edit` / `task-delete`
- 不要试图 `oxn part new` / `oxn probe new` — Part / Probe 没有 CLI 入口，手写 `.oxn` 文件

## 详细参考

- [CLI 命令参考](../../../docs/reference/cli-reference.md)
- [OXN DSL 参考](../../../docs/reference/oxn-dsl.md)
