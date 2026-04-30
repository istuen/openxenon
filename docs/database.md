# Xenonix 数据库设计

## 概述

Xenonix 使用 SQLite 作为数据持久化引擎，采用双层数据库架构。

**核心理念**：文件系统即真理源。任务状态存储在文件系统中，数据库仅用于存储元数据和配置。

## 文件变更说明

> **重要更新**：2026-04-30 起，任务状态从 SQLite 迁移到文件系统。
>
> 原 `project.db` 中的 tasks、blueprints、stages、escape_logs、proof_logs 表已废弃。
> 现任务状态存储在 `.openxenon/tasks/{task_id}/task-trace.yaml` 中。

## 全局数据库 (core.oxn)

### 位置

`~/.xenonix/core.oxn`

### 表结构

#### projects 表

全局项目注册表，存储所有已注册项目的元数据。

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,               -- 项目 UUID
  path TEXT UNIQUE NOT NULL,         -- 项目绝对路径
  name TEXT,                         -- 项目名称
  status TEXT DEFAULT 'active',       -- active | archived
  last_heartbeat INTEGER,             -- 最后心跳时间戳
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 项目唯一标识符 (UUID) |
| path | TEXT | 项目绝对路径 (唯一约束) |
| name | TEXT | 项目名称 (可选) |
| status | TEXT | 项目状态：active 或 archived |
| last_heartbeat | INTEGER | 最后心跳时间 (Unix 时间戳) |
| created_at | INTEGER | 创建时间 (Unix 时间戳) |
| updated_at | INTEGER | 更新时间 (Unix 时间戳) |

#### daemon_config 表

守护进程配置表，存储 Core 引擎的配置。

```sql
CREATE TABLE daemon_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

## 项目数据库 (project.oxn)

### 位置

`<project>/.openxenon/project.oxn`

### WAL 模式

项目数据库启用 WAL (Write-Ahead Logging) 模式：

```sql
PRAGMA journal_mode=WAL;
```

**优势**：
- 支持并发读写
- 无锁读取
- 更好的写入性能

### 表结构

#### config 表

项目配置表，存储项目级配置。

```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## 已废弃的表

以下表已废弃，任务状态现在存储在文件系统中。

### tasks 表 (已废弃)

```
位置: project.oxn
状态: 已废弃 (2026-04-30)
迁移: 任务状态现在存储在 .openxenon/tasks/{task_id}/task-trace.yaml
```

**原 schema**：
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  active_blueprint_id TEXT,
  created_at INTEGER,
  updated_at INTEGER
);
```

### blueprints 表 (已废弃)

```
位置: project.oxn
状态: 已废弃
迁移: Blueprint 现在存储在 .openxenon/tasks/{task_id}/blueprint.yaml
```

### stages 表 (已废弃)

```
位置: project.oxn
状态: 已废弃
迁移: Stage 信息现在嵌入在 blueprint.yaml 中
```

### escape_logs 表 (已废弃)

```
位置: project.oxn
状态: 已废弃
迁移: Escape 日志现在存储在 task-trace.yaml 中
```

### proof_logs 表 (已废弃)

```
位置: project.oxn
状态: 已废弃
迁移: Probe 结果现在存储在 task-trace.yaml 的 probes 数组中
```

## 任务文件系统结构

任务数据存储在 `.openxenon/tasks/{task_id}/` 目录中：

```
.openxenon/
└── tasks/
    └── {task_id}/
        ├── blueprint.yaml      # 任务蓝图定义
        ├── step-manifest.json   # AI 写入的状态管道
        └── task-trace.yaml      # 任务执行轨迹（状态真理源）
```

### task-trace.yaml 结构

```yaml
taskId: "uuid"
taskName: "任务名称"
status: "RUNNING"  # PENDING | RUNNING | COMPLETED | FAILED | ESCAPED
startedAt: "2026-04-30T03:00:00.000Z"
completedAt: null
stages:
  - stageId: "stage-1"
    stageName: "阶段名称"
    status: "PASSED"  # PENDING | RUNNING | PASSED | FAILED
    probes:
      - probeType: "fs_exists"
        result: "PASSED"
        output: "File found"
        executedAt: "2026-04-30T03:01:00.000Z"
    executedAt: "2026-04-30T03:00:30.000Z"
    completedAt: "2026-04-30T03:01:00.000Z"
```

## 数据关系图

```
┌─────────────────┐         ┌─────────────────┐
│   projects       │         │     config       │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ key (PK)        │
│ path            │         │ value           │
│ name            │         └─────────────────┘
│ status          │
│ last_heartbeat  │
└─────────────────┘

任务数据 (文件系统):
.openxenon/tasks/{task_id}/
├── blueprint.yaml      ← 任务蓝图
├── step-manifest.json   ← AI 状态更新
└── task-trace.yaml      ← 执行轨迹 (状态真理源)
```

## 备份策略

### core.oxn 备份

```bash
cp ~/.xenonix/core.oxn ~/.xenonix/core.oxn.backup
```

### project.oxn 备份

```bash
sqlite3 .openxenon/project.oxn ".backup .openxenon/project.oxn.backup"
```

### 任务目录备份

```bash
cp -r .openxenon/tasks/{task_id} .openxenon/tasks/{task_id}.backup
```