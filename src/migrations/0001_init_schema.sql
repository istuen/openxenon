-- ============================================================
-- OpenXenon 初始 Schema 迁移
-- 版本: 0001
-- 描述: 建立 Task / Blueprint / Stage 三表扁平结构
-- ============================================================

-- @up

-- tasks 表：宏观任务边界
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'RUNNING', 'COMPLETED', 'ESCAPED', 'TERMINATED')
    ),
    active_blueprint_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- blueprints 表：拓扑蓝图（独立于 Task）
CREATE TABLE IF NOT EXISTS blueprints (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN ('DRAFT', 'CANONICAL', 'SAMPLE', 'ABANDONED')
    ),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 添加 tasks.active_blueprint_id 的外键约束（后置添加，因为需要引用后创建的表）
-- 注意：SQLite 的外键约束需要先启用
PRAGMA foreign_keys = ON;

ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_active_blueprint
    FOREIGN KEY (active_blueprint_id) REFERENCES blueprints(id) ON DELETE SET NULL;

-- stages 表：原子工序节点
CREATE TABLE IF NOT EXISTS stages (
    id TEXT PRIMARY KEY,
    blueprint_id TEXT NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    deps TEXT NOT NULL DEFAULT '[]',
    target TEXT NOT NULL,
    spec TEXT NOT NULL,
    action TEXT,
    proof TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'RUNNING', 'PASSED', 'FAILED')
    ),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at INTEGER
);

-- step_manifests 表：步骤舱单快照（单向管道）
CREATE TABLE IF NOT EXISTS step_manifests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    blueprint_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    artifacts TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- proof_logs 表：验证审计日志
CREATE TABLE IF NOT EXISTS proof_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id TEXT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    proof_name TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('PASSED', 'FAILED')),
    output TEXT,
    executed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- escape_logs 表：逃逸检测日志
CREATE TABLE IF NOT EXISTS escape_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    detected_at INTEGER NOT NULL DEFAULT (unixepoch()),
    manifest_before TEXT,
    manifest_after TEXT
);

-- ============================================================
-- 索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_blueprints_task_id ON blueprints(task_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_status ON blueprints(status);
CREATE INDEX IF NOT EXISTS idx_stages_blueprint_id ON stages(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_stages_status ON stages(status);
CREATE INDEX IF NOT EXISTS idx_proof_logs_step_id ON proof_logs(step_id);
CREATE INDEX IF NOT EXISTS idx_escape_logs_task_id ON escape_logs(task_id);

-- ============================================================

-- @down

DROP TABLE IF EXISTS escape_logs;
DROP TABLE IF EXISTS proof_logs;
DROP TABLE IF EXISTS step_manifests;
DROP TABLE IF EXISTS stages;
-- 先删除外键约束才能删除 blueprints（需要 SQLite 启用 foreign_keys）
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS blueprints;
DROP TABLE IF EXISTS tasks;
PRAGMA foreign_keys = ON;
