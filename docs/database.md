# Xenonix 数据库设计

## 概述

Xenonix 使用 SQLite 作为数据持久化引擎，采用双层数据库架构：
- **core.db**: 全局元数据数据库
- **project.db**: 项目状态数据库

## 全局数据库 (core.db)

### 位置

`~/.xenonix/core.db`

### 表结构

#### projects 表

全局项目注册表，存储所有已注册项目的元数据。

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,               -- 项目 UUID
  path TEXT UNIQUE NOT NULL,         -- 项目绝对路径
  name TEXT,                         -- 项目名称
  status TEXT DEFAULT 'active',      -- active | archived
  last_heartbeat INTEGER,            -- 最后心跳时间戳
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

## 项目数据库 (project.db)

### 位置

`<project>/.xenonix/project.db`

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

#### tasks 表

任务表，存储任务的基本信息。

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,               -- 任务 ID
  name TEXT NOT NULL,                -- 任务名称
  playbook TEXT NOT NULL,            -- Playbook JSON
  status TEXT DEFAULT 'pending',     -- pending | running | completed | failed
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 任务唯一标识符 |
| name | TEXT | 任务名称 |
| playbook | TEXT | Playbook JSON 序列化字符串 |
| status | TEXT | 任务状态：pending, running, completed, failed |
| created_at | INTEGER | 创建时间 |
| updated_at | INTEGER | 更新时间 |

#### steps 表

步骤状态表，存储每个步骤的执行状态。

```sql
CREATE TABLE steps (
  id TEXT PRIMARY KEY,               -- 步骤 ID
  task_id TEXT NOT NULL,             -- 所属任务 ID
  name TEXT NOT NULL,                -- 步骤名称
  spec TEXT NOT NULL,                -- 执行规范
  proof TEXT NOT NULL,               -- 验证探针
  status TEXT DEFAULT 'pending',     -- pending | running | passed | failed
  started_at INTEGER,                -- 开始时间
  completed_at INTEGER,              -- 完成时间
  last_heartbeat INTEGER,            -- 最后心跳时间
  manifest_snapshot TEXT,            -- step-manifest.json 快照
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 步骤唯一标识符 |
| task_id | TEXT | 所属任务 ID |
| name | TEXT | 步骤名称 |
| spec | TEXT | 执行规范描述 |
| proof | TEXT | 验证探针 ID |
| status | TEXT | 步骤状态：pending, running, passed, failed |
| started_at | INTEGER | 开始执行时间 |
| completed_at | INTEGER | 执行完成时间 |
| last_heartbeat | INTEGER | 最后心跳时间 |
| manifest_snapshot | TEXT | step-manifest.json 快照 (JSON) |

#### escape_logs 表

逃逸检测日志表，记录 AI 模型逃逸事件。

```sql
CREATE TABLE escape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  detected_at INTEGER NOT NULL,      -- 检测时间
  manifest_before TEXT,              -- 变更前快照
  manifest_after TEXT,               -- 变更后快照
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (step_id) REFERENCES steps(id)
);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 日志 ID (自增) |
| task_id | TEXT | 任务 ID |
| step_id | TEXT | 步骤 ID |
| detected_at | INTEGER | 检测到逃逸的时间 |
| manifest_before | TEXT | 变更前的 manifest 快照 |
| manifest_after | TEXT | 变更后的 manifest 快照 |

#### proof_logs 表

Proof 校验日志表，记录所有验证执行结果。

```sql
CREATE TABLE proof_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id TEXT NOT NULL,
  proof_name TEXT NOT NULL,
  result TEXT NOT NULL,              -- success | failure
  output TEXT,                       -- 校验输出
  executed_at INTEGER NOT NULL,
  FOREIGN KEY (step_id) REFERENCES steps(id)
);
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 日志 ID (自增) |
| step_id | TEXT | 步骤 ID |
| proof_name | TEXT | Proof 探针名称 |
| result | TEXT | 验证结果：success 或 failure |
| output | TEXT | 验证输出信息 |
| executed_at | INTEGER | 执行时间 |

## 索引

为优化查询性能，创建以下索引：

```sql
CREATE INDEX idx_steps_task ON steps(task_id);
CREATE INDEX idx_escape_logs_task ON escape_logs(task_id);
CREATE INDEX idx_proof_logs_step ON proof_logs(step_id);
```

## 数据关系图

```
┌─────────────┐
│   tasks     │
├─────────────┤
│ id (PK)     │◄─────────────┐
│ name        │              │
│ playbook    │              │
│ status      │              │
└─────────────┘              │
                             │
┌─────────────┐              │
│   steps     │              │
├─────────────┤              │
│ id (PK)     │              │
│ task_id (FK)│──────────────┘
│ name        │◄─────────────┐
│ spec        │              │
│ proof       │              │
│ status      │              │
└─────────────┘              │
                             │
┌─────────────────┐          │
│ escape_logs     │          │
├─────────────────┤          │
│ id (PK)         │          │
│ task_id (FK)    │──────────┼───► tasks.id
│ step_id (FK)    │──────────┘───► steps.id
│ detected_at     │
└─────────────────┘

┌─────────────────┐
│ proof_logs      │
├─────────────────┤
│ id (PK)         │
│ step_id (FK)    │───────► steps.id
│ proof_name      │
│ result          │
│ output          │
│ executed_at     │
└─────────────────┘
```

## 查询示例

### 获取任务及其所有步骤

```sql
SELECT 
  t.id as task_id,
  t.name as task_name,
  t.status as task_status,
  s.id as step_id,
  s.name as step_name,
  s.status as step_status
FROM tasks t
LEFT JOIN steps s ON t.id = s.task_id
WHERE t.id = ?;
```

### 获取项目的逃逸日志

```sql
SELECT 
  el.*,
  t.name as task_name,
  s.name as step_name
FROM escape_logs el
JOIN tasks t ON el.task_id = t.id
JOIN steps s ON el.step_id = s.id
ORDER BY el.detected_at DESC;
```

### 获取步骤的验证历史

```sql
SELECT *
FROM proof_logs
WHERE step_id = ?
ORDER BY executed_at DESC;
```

## 备份策略

### core.db 备份

```bash
cp ~/.xenonix/core.db ~/.xenonix/core.db.backup
```

### project.db 备份

```bash
# 项目数据库支持在线备份
sqlite3 .xenonix/project.db ".backup .xenonix/project.db.backup"
```

## 数据迁移

迁移脚本存放在 `src/db/migrations/` 目录，按版本号命名：

```
src/db/migrations/
├── 001_initial.sql
├── 002_add_column.sql
└── ...
```
