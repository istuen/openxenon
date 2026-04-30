export const CREATE_PROJECTS_TABLE = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active',
  last_heartbeat INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
`

export const CREATE_DAEMON_CONFIG_TABLE = `
CREATE TABLE IF NOT EXISTS daemon_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
`

export const CREATE_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_path TEXT NOT NULL,
  blueprint_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (
    status IN ('CREATED', 'IN_PROGRESS', 'PASSED', 'FAILED')
  ),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
`

export const PROJECTS_SCHEMA = {
  tableName: 'projects',
  columns: {
    id: 'TEXT PRIMARY KEY',
    path: 'TEXT UNIQUE NOT NULL',
    name: 'TEXT',
    status: "TEXT DEFAULT 'active'",
    last_heartbeat: 'INTEGER',
    created_at: "INTEGER DEFAULT (strftime('%s', 'now'))",
    updated_at: "INTEGER DEFAULT (strftime('%s', 'now'))"
  }
} as const

export const DAEMON_CONFIG_SCHEMA = {
  tableName: 'daemon_config',
  columns: {
    key: 'TEXT PRIMARY KEY',
    value: 'TEXT NOT NULL',
    updated_at: "INTEGER DEFAULT (strftime('%s', 'now'))"
  }
} as const

export const TASKS_SCHEMA_DEPRECATED = {
  tableName: 'tasks',
  columns: {
    id: 'TEXT PRIMARY KEY',
    project_path: 'TEXT NOT NULL',
    blueprint_path: 'TEXT NOT NULL',
    status: "TEXT NOT NULL DEFAULT 'CREATED'",
    created_at: "INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))",
    updated_at: "INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))"
  },
  deprecated: true,
  note: '全局任务表已废弃。任务状态现在由文件系统管理。'
} as const
