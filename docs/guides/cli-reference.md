# CLI 命令参考

本文档提供 OpenXenon CLI 的完整命令参考。

## 全局选项

| 选项 | 描述 |
|------|------|
| `-v, --verbose` | 启用详细输出 |
| `-j, --json` | 以 JSON 格式输出 |

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

# 查看 Stage 元 Forge 约束
oxn forge stage

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
| `<type>` | 是 | 资产类型：probe、stage、blueprint |
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
  [CANONICAL] fs_exists
  [CANONICAL] fs_match
  [DRAFT] check-file

## STAGES
  [CANONICAL] build

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

将 DRAFT 资产转正为 CANONICAL。

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
  New State: CANONICAL
```

### oxn arsenal render

预览 Blueprint DAG 拓扑图。

```bash
oxn arsenal render <blueprint-name>
```

## oxn task

任务管理命令。

### oxn task submit

提交 Blueprint 创建任务。

```bash
oxn task submit --blueprint <file>
```

**参数**：

| 参数 | 必需 | 描述 |
|------|------|------|
| `--blueprint <file>` | 是 | Blueprint YAML 文件路径 |

**输出**：

```
Task created: task_abc123
Blueprint compiled to frozen.yaml
```

### oxn task next

获取下一个待执行的 Stage。

```bash
oxn task next --task-id <id>
```

**输出**：

```
Stage: create-user-model
Target: 在 src/models/ 目录下创建 User 模型
Action: 使用 Prisma ORM 创建 User 模型，包含 id、name、email 字段
```

> 注意：返回内容仅包含 target + action，隐藏 spec + probes。

### oxn task verify

提交 Stage 验证。

```bash
oxn task verify --task-id <id> --stage-id <id>
```

**参数**：

| 参数 | 必需 | 描述 |
|------|------|------|
| `--task-id <id>` | 是 | 任务 ID |
| `--stage-id <id>` | 是 | Stage ID |

**输出**：

```
Stage: create-user-model
Status: PASSED
Probes:
  ✓ fs_exists: src/models/user.ts
  ✓ fs_match: @prisma/client
```

### oxn task status

获取任务状态。

```bash
oxn task status --task-id <id>
```

**输出**：

```
Task: task_abc123
Status: IN_PROGRESS
Stages:
  ✓ create-user-model (PASSED)
  ○ run-tests (PENDING)
```

### oxn task render

生成任务执行 HTML 报告。

```bash
oxn task render --task-id <id>
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
