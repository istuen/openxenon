export const CREATE_TASKS_TABLE = `
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
`

export const CREATE_BLUEPRINTS_TABLE = `
CREATE TABLE IF NOT EXISTS blueprints (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'CANONICAL', 'SAMPLE', 'ABANDONED')
  ),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
`

export const CREATE_STAGES_TABLE = `
CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  blueprint_id TEXT NOT NULL,
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
  completed_at INTEGER,
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(id) ON DELETE CASCADE
);
`

export const CREATE_ESCAPE_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS escape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  detected_at INTEGER NOT NULL DEFAULT (unixepoch()),
  manifest_before TEXT,
  manifest_after TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
`

export const CREATE_PROOF_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS proof_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id TEXT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  proof_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('PASSED', 'FAILED')),
  output TEXT,
  executed_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`

export const CREATE_CONFIG_TABLE = `
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export const BLUEPRINTS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_blueprints_task_id ON blueprints(task_id);',
  'CREATE INDEX IF NOT EXISTS idx_blueprints_status ON blueprints(status);',
]

export const STAGES_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_stages_blueprint_id ON stages(blueprint_id);',
  'CREATE INDEX IF NOT EXISTS idx_stages_status ON stages(status);',
]

export const PROJECT_DB_SCHEMA = {
  tasks: {
    tableName: 'tasks',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      status: "TEXT NOT NULL DEFAULT 'PENDING'",
      active_blueprint_id: 'TEXT',
      created_at: 'INTEGER NOT NULL DEFAULT (unixepoch())',
      updated_at: 'INTEGER NOT NULL DEFAULT (unixepoch())'
    }
  },
  blueprints: {
    tableName: 'blueprints',
    columns: {
      id: 'TEXT PRIMARY KEY',
      task_id: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      status: "TEXT NOT NULL DEFAULT 'DRAFT'",
      created_at: 'INTEGER NOT NULL DEFAULT (unixepoch())'
    }
  },
  stages: {
    tableName: 'stages',
    columns: {
      id: 'TEXT PRIMARY KEY',
      blueprint_id: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      deps: "TEXT NOT NULL DEFAULT '[]'",
      target: 'TEXT NOT NULL',
      spec: 'TEXT NOT NULL',
      action: 'TEXT',
      proof: 'TEXT NOT NULL',
      status: "TEXT NOT NULL DEFAULT 'PENDING'",
      created_at: 'INTEGER NOT NULL DEFAULT (unixepoch())',
      completed_at: 'INTEGER'
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