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
