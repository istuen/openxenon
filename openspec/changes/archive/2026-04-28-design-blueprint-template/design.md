## Context

Blueprint 模板需要解决两个问题：
1. 统一 Task Blueprint 的格式和存放位置
2. 简化数据库架构，在 Core 的 `core.oxn` 中统一管理任务

当前状态：
- `space.oxn` 存在于每个项目目录下，包含任务相关数据
- 缺乏标准的 Blueprint 模板格式

## Goals / Non-Goals

**Goals:**
- Blueprint 模板存放于 src 代码中
- `oxn task new` 时由 Core 在项目 `.openxenon/tasks/<task-id>/` 下创建 Blueprint 文件
- Core 的 `core.oxn` 的 tasks 表统一管理所有项目的任务进度
- CLI 支持 task new / list / show / submit 命令

**Non-Goals:**
- 不修改现有 Stage/Proof 执行逻辑
- 不实现 Blueprint 可视化界面
- 不实现 AI 自动填充逻辑

## Decisions

### Decision 1: Blueprint 模板存放位置

**决定**: 模板存放于 `src/templates/blueprint.yaml`，作为代码的一部分

```yaml
# Task Information
task:
  id: "{{TASK_ID}}"
  name: "{{TASK_NAME}}"
  description: "{{TASK_DESCRIPTION}}"
  createdAt: "{{CREATED_AT}}"

# Stage Selection
stages:
  available:
    - name: Build
      description: 构建阶段
    - name: Test
      description: 测试阶段
    - name: Deploy
      description: 部署阶段
  selected: []

# Stage Definitions
stageDefinitions: {}
```

**理由**:
- 模板是代码资产，应该版本化管理
- 便于 Core 启动时加载模板

### Decision 2: 任务目录结构

**决定**: 项目目录下创建 `.openxenon/tasks/<task-id>/`

```
.openxenon/
  tasks/
    <task-id>/
      blueprint.yaml    # 任务的 Blueprint 文件
  project.oxn          # 项目本地数据库（不含 space）
```

**理由**:
- 每个任务一个目录，便于管理
- 与 .openxenon 现有结构保持一致

### Decision 3: Core tasks 表

**决定**: 在 `core.oxn` 中新增 tasks 表

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  blueprint_path TEXT NOT NULL,
  status TEXT DEFAULT 'CREATED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**理由**:
- 统一在 Core 管理所有任务进度
- 移除项目对 space.oxn 的依赖
- 便于跨项目查询和追踪

### Decision 4: 移除 space.oxn

**决定**: 移除项目下的 space.oxn 数据库

- 删除 `src/core/space.ts`
- 删除 `src/db/operations/space.ts`
- 迁移 space 中的任务数据到 core tasks 表

**理由**:
- 简化架构，避免数据库分散
- Core 统一管理所有状态

### Decision 5: CLI 命令

```bash
oxn task new <name> [--template <template-id>]   # 创建新任务（生成 Blueprint）
oxn task list [--project <path>]                 # 列出任务
oxn task show <task-id>                           # 查看 Blueprint
oxn task submit <task-id>                         # 提交到 Core 追踪
```

**理由**:
- 覆盖完整工作流
- 与现有命令风格一致

## Risks / Trade-offs

[风险] 移除 space.oxn 可能影响现有数据
→ **缓解**: 提供迁移脚本，将 space 数据迁移到 core tasks 表

[风险] 任务目录创建失败
→ **缓解**: 校验项目路径合法性，确保 .openxenon 目录可写

## Open Questions

1. space.oxn 中的其他数据（如有）如何处理？
2. 是否需要任务删除命令？