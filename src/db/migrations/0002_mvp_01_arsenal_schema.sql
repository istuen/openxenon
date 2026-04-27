-- ============================================================
-- OpenXenon MVP 0.1 Arsenal Storage Schema
-- 版本: 0002
-- 描述: Blueprint 迁移到 YAML 文件存储，Stage 的 proof 升级为四元组结构
-- ============================================================

-- @up

-- 1. 给 tasks 表加 blueprint_file 字段（指向 YAML 文件路径）
ALTER TABLE tasks
ADD COLUMN blueprint_file TEXT;

-- 2. 给 blueprints 表加 yaml_path 字段（标记 deprecated）
ALTER TABLE blueprints
ADD COLUMN yaml_path TEXT;

-- 3. 给 stages 表加 yaml_path 字段，并保留 target/spec/action/proof 列（置 NULL）
ALTER TABLE stages
ADD COLUMN yaml_path TEXT;

-- 4. 将 stages 表的 target/spec/action/proof 列标记为 deprecated（SQLite 不支持 DROP COLUMN）
-- 这些列的数据已迁移到 Blueprint YAML 中，运行时不再使用

-- 5. 创建 escape_log_v2 表（简化版逃逸记录）
CREATE TABLE IF NOT EXISTS escape_log_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    stage_id TEXT,
    synced_at INTEGER NOT NULL DEFAULT (unixepoch()),
    api_requested_at INTEGER DEFAULT 0,
    manifest_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_escape_log_v2_task_id ON escape_log_v2(task_id);

-- @down

-- SQLite 不支持真正删除列，只能清除数据
-- ALTER TABLE 在 @down 中无法真正恢复，这是 SQLite 的限制
-- 如需完整回滚，需要手动删除并重建表

DELETE FROM escape_log_v2;
DROP INDEX IF EXISTS idx_escape_log_v2_task_id;
