export const CREATE_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  playbook TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
`

export const CREATE_STEPS_TABLE = `
CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  spec TEXT NOT NULL,
  proof TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at INTEGER,
  completed_at INTEGER,
  last_heartbeat INTEGER,
  manifest_snapshot TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
`

export const CREATE_ESCAPE_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS escape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  detected_at INTEGER NOT NULL,
  manifest_before TEXT,
  manifest_after TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (step_id) REFERENCES steps(id)
);
`

export const CREATE_PROOF_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS proof_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id TEXT NOT NULL,
  proof_name TEXT NOT NULL,
  result TEXT NOT NULL,
  output TEXT,
  executed_at INTEGER NOT NULL,
  FOREIGN KEY (step_id) REFERENCES steps(id)
);
`

export const PROJECT_DB_SCHEMA = {
  tasks: {
    tableName: 'tasks',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      playbook: 'TEXT NOT NULL',
      status: "TEXT DEFAULT 'pending'",
      created_at: "INTEGER DEFAULT (strftime('%s', 'now'))",
      updated_at: "INTEGER DEFAULT (strftime('%s', 'now'))"
    }
  },
  steps: {
    tableName: 'steps',
    columns: {
      id: 'TEXT PRIMARY KEY',
      task_id: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      spec: 'TEXT NOT NULL',
      proof: 'TEXT NOT NULL',
      status: "TEXT DEFAULT 'pending'",
      started_at: 'INTEGER',
      completed_at: 'INTEGER',
      last_heartbeat: 'INTEGER',
      manifest_snapshot: 'TEXT'
    }
  },
  escape_logs: {
    tableName: 'escape_logs',
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      task_id: 'TEXT NOT NULL',
      step_id: 'TEXT NOT NULL',
      detected_at: 'INTEGER NOT NULL',
      manifest_before: 'TEXT',
      manifest_after: 'TEXT'
    }
  },
  proof_logs: {
    tableName: 'proof_logs',
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      step_id: 'TEXT NOT NULL',
      proof_name: 'TEXT NOT NULL',
      result: 'TEXT NOT NULL',
      output: 'TEXT',
      executed_at: 'INTEGER NOT NULL'
    }
  }
} as const
