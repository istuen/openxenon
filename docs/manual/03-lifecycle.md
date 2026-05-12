# 3. 完整生命周期

## 0.1 实际流程

0.1 是 CLI-direct 模式，不依赖 Daemon。以下是完整的任务执行周期：

```
1. oxn init              # 初始化项目围栏
       │
       ▼
2. oxn forge probe      # 获取元 Forge 约束
       │
       ▼
3. AI 生成 Draft YAML    # 根据约束生成资产
       │
       ▼
4. oxn forge probe --save # 保存 Draft 资产
       │
       ▼
5. oxn arsenal promote   # Draft → CANONICAL
       │
       ▼
6. oxn task submit --blueprint <file>  # 提交任务
       │
       ▼
7. oxn task next --task-id <id>  # 获取下一个 Stage
       │
       ▼
8. AI 执行 Stage 工作    # 写代码、跑命令
       │
       ▼
9. oxn task verify --task-id <id> --stage-id <id>  # 验证
       │
       ▼
10. 重复 7-9 直到所有 Stage 通过
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

# 提交任务
oxn task submit --blueprint my-task.yaml
# 获取任务 ID，假设是 abc123
oxn task next --task-id abc123
# AI 执行工作...
oxn task verify --task-id abc123 --stage-id build
# 重复 next + verify 直到完成
```

## 0.2 目标：Daemon 长驻模式

以下为 0.2 目标架构，当前尚未实现：

- Daemon 长驻进程持有 DAG 状态
- 自动超时检测
- 任务队列和并发控制
- `oxn daemon start` 启动后可通过 `oxn arsenal search` 搜索全局资产

0.1 阶段所有核心功能（forge、task submit/verify、arsenal）均通过 CLI 直连可用，不依赖 Daemon。

## 项目目录结构

```
<project>/
├── .openxenon/           # 项目围栏
│   ├── config.json       # 项目配置
│   ├── arsenals/         # 项目级资产
│   │   ├── probes/
│   │   └── stages/
│   └── tasks/
│       └── <task_id>/
│           ├── blueprint.yaml      # 任务蓝图
│           ├── step-manifest.json # AI 舱单（AI 写入）
│           └── task-trace.yaml   # 执行记录（追加写入）
└── src/                  # 业务代码
```

全局目录 (`~/.openxenon/`) 在 0.1 仅用于 Daemon 相关文件，CLI 直连模式不依赖它。

## 下一章

下一章将介绍 [CLI 命令参考](./04-cli-ref.md)。
