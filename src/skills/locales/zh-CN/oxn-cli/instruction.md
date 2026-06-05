# /oxn-cli — OpenXenon CLI 入口

> 这个 skill 教你怎么调用 OpenXenon 的 `oxn` 命令行工具。

## 何时用

当你需要：
- 初始化项目（`oxn init`）
- 校验 .oxn 文件
- 获取 AI 工作上下文（`oxn get-context`）
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

### Domain 管理（v0.1 新增）

```bash
oxn domain new --name <DomainName>          # 生成 Domain 骨架
oxn domain validate --name <DomainName>     # 校验 Domain
oxn domain list                              # 列出所有 Domain
```

### Blueprint 管理

```bash
oxn blueprint new <name> [--slots a,b,c]   # 生成 Blueprint 骨架
oxn blueprint validate <name>               # 校验 Blueprint
```

### Work / Task 生命周期

```bash
oxn leader new --name <work>                # 从 Blueprint 生成 work 骨架
oxn leader run --work-file <work.oxn>       # 启动状态机
oxn leader submit --work-name <w> --task <t>  # 推进 task
oxn leader status --work-name <w>            # 查询进度

oxn work task new --work-name <w> --task-name <t> --blueprint <b> [--domain <d>]
oxn work task list --work-name <w>
oxn work task status --work-name <w> --task-name <t>
```

### 获取 AI 上下文（**全量隔离**）

```bash
# Task 级：只看 align 到的 domain
oxn get-context --work <w> --task <t> --json

# Work 级：看 work 完整资源池（不隔离）
oxn get-context --work <w> --json
```

## 反模式

- 不要在 AI 助手软件中跑 `oxn init`（已 init 过）
- 不要直接编辑 `.openxenon/works/<w>/state.json`（Core 独占）
- 不要在 Domain 内引用 asset（破坏 Asset Independence）
- 不要用 YAML/JSON 写 Blueprint（v0.1 起 OXN DSL 单一权威）

## 详细参考

- [CLI 命令参考](../../../docs/reference/cli-reference.md)
- [OXN DSL 参考](../../../docs/reference/oxn-dsl.md)
