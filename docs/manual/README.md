# OpenXenon 使用手册

OpenXenon 是一个面向大语言模型的工程化控制引擎，通过"综合集成研讨厅"模式实现人机协同。

## 目录

- [1. 系统介绍](./01-intro.md) - OpenXenon 简介和核心价值
- [2. 核心概念](./02-concepts.md) - Blueprint、Arsenal、Stage、Proof
- [3. CLI 命令参考](./03-cli.md) - 所有命令的完整用法
- [4. Arsenal 资产生成](./04-arsenal.md) - /oxn-forge → Draft → CANONICAL 流程
- [5. 故障排查](./05-troubleshooting.md) - 常见问题解答

## 快速开始

```bash
# 1. 初始化项目
oxn init

# 2. 创建任务
oxn task new my-task

# 3. 提交任务
oxn task submit my-task

# 4. 查看任务状态
oxn task status my-task
```

## 核心命令

| 命令 | 描述 |
|------|------|
| `oxn init` | 初始化项目 |
| `oxn task new <name>` | 创建新任务 |
| `oxn task submit <id>` | 提交任务到 Core |
| `oxn arsenal list` | 列出标准资产 |
| `oxn arsenal promote <path>` | 将 Draft 资产转正 |

详细用法请参阅各章节文档。