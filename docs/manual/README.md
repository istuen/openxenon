# OpenXenon 使用手册

OpenXenon 是一个实验性框架，探索如何让工程师与 AI 更有效地协作。

## 目录

- [1. 系统介绍](./01-intro.md) - OpenXenon 简介和核心价值
- [2. 核心概念](./02-concepts.md) - Blueprint、Arsenal、Stage、Proof + 术语表
- [3. 完整生命周期](./03-lifecycle.md) - 交互流程 + Mermaid 流程图
- [4. CLI 命令参考](./04-cli-ref.md) - 所有命令的完整用法
- [5. Arsenal 资产生成](./05-arsenal.md) - /oxn-forge → Draft → CANONICAL 流程
- [6. 故障排查](./06-troubleshooting.md) - 常见问题解答
- [7. 从源码构建](./07-dev.md) - 开发环境配置和贡献指南

## 快速开始

```bash
# 1. 初始化项目
oxn init

# 2. 编写 Blueprint 文件
#    编辑 my-task.yaml 定义 stages 和 proofs

# 3. 提交任务
oxn task submit --blueprint my-task.yaml

# 4. 获取任务 ID，查看状态
#    假设任务 ID 是 abc123
oxn task status --task-id abc123
```

## 核心命令

| 命令 | 描述 |
|------|------|
| `oxn init` | 初始化项目 |
| `oxn task submit --blueprint <file>` | 提交 Blueprint 创建任务 |
| `oxn task next --task-id <id>` | 获取下一个待执行 Stage |
| `oxn task verify --task-id <id> --stage-id <id>` | 提交 Stage 验证 |
| `oxn task status --task-id <id>` | 获取任务状态 |
| `oxn arsenal list` | 列出标准资产 |
| `oxn arsenal promote <path>` | 将 Draft 资产转正 |

详细用法请参阅各章节文档。