export const CREATE_CONFIG_TABLE = `
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export const PROJECT_DB_SCHEMA_DEPRECATED = {
  tasks: {
    tableName: 'tasks',
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      status: "TEXT NOT NULL DEFAULT 'PENDING'",
      active_blueprint_id: 'TEXT',
      created_at: 'INTEGER NOT NULL DEFAULT (unixepoch())',
      updated_at: 'INTEGER NOT NULL DEFAULT (unixepoch())'
    },
    deprecated: true,
    note: '任务状态现在存储在 .openxenon/tasks/{task_id}/task-trace.yaml 文件中'
  },
  blueprints: {
    tableName: 'blueprints',
    columns: {
      id: 'TEXT PRIMARY KEY',
      task_id: 'TEXT NOT NULL',
      name: 'TEXT NOT NULL',
      status: "TEXT NOT NULL DEFAULT 'DRAFT'",
      created_at: 'INTEGER NOT NULL DEFAULT (unixepoch())'
    },
    deprecated: true,
    note: 'Blueprint 现在存储在 .openxenon/tasks/{task_id}/blueprint.yaml 文件中'
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
    },
    deprecated: true,
    note: 'Stage 信息现在嵌入在 blueprint.yaml 中'
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
    },
    deprecated: true,
    note: 'Escape 日志现在存储在 task-trace.yaml 中'
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
    },
    deprecated: true,
    note: 'Probe 结果现在存储在 task-trace.yaml 的 probes 数组中'
  }
} as const