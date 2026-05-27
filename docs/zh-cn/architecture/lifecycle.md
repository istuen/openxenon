# 3. 完整生命周期

## 0.1 实际流程

0.1 是 CLI-direct 模式，不依赖 Daemon。以下是完整的任务执行周期：

```
1. oxn init              # 初始化项目围栏
       │
       ▼
2. oxn work new <work-id> --type task --blueprint <bp-name>  # 创建 Work
       │
       ▼
3. oxn work resume <work-id>  # 获取下一个 Part
       │
       ▼
4. AI 执行 Part 工作    # 写代码、跑命令
       │
       ▼
5. oxn work complete <work-id>  # 完成后完成 Work
       │
       ▼
6. 重复 3-5 直到所有 Part 通过
```

## 典型命令序列

```bash
# 初始化
oxn init

# 查看可用资产
oxn arsenal list

# 锻造新 Probe
oxn forge probe
# AI 根据约束生成 YAML
oxn forge probe --save 'type: fs_exists
description: "检查文件存在"
parameters:
  - name: pattern
    type: string
    required: true' --name check-pkg-json

# 使用 Blueprint 创建 Work
oxn work new my-work --type task --blueprint new-task-flow
# 获取下一个 part
oxn work resume my-work
# AI 执行工作...
oxn work complete my-work
# 重复 resume + complete 直到完成
```

## 0.2 目标：Daemon 长驻模式

以下为 0.2 目标架构，当前尚未实现：

- Daemon 长驻进程持有 DAG 状态
- 自动超时检测
- 任务队列和并发控制
- `oxn daemon start` 启动后可通过 `oxn arsenal search` 搜索全局资产

0.1 阶段所有核心功能（forge、work new/resume/complete、arsenal）均通过 CLI 直连可用，不依赖 Daemon。

## 项目目录结构

```
<project>/
├── .openxenon/           # 项目围栏
│   ├── config.json       # 项目配置
│   ├── arsenal/          # 正式资产库
│   │   ├── blueprints/
│   │   │   └── <name>/   # Blueprint 目录
│   │   ├── parts/
│   │   │   └── <name>.oxn
│   │   └── probes/
│   │       └── <name>.oxn
│   ├── drafts/           # 草稿资产（Forge 产出）
│   │   ├── blueprints/
│   │   ├── parts/
│   │   └── probes/
│   └── work/             # Work 执行单元
│       └── <type>/
│           └── <work-id>/
│               ├── blueprint.frozen.yaml  # 编译后的蓝图
│               └── task-trace.yaml        # 执行记录
└── src/                  # 业务代码
```

类型优先（Blueprint/Part/Probe），状态（drafts/formal）嵌套在类型内部。

全局目录 (`~/.openxenon/`) 在 0.1 仅用于 Daemon 相关文件，CLI 直连模式不依赖它。

## 下一章

下一章将介绍 [CLI 命令参考](../guides/cli-reference.md)。
