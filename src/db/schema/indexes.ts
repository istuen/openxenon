export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_steps_task ON steps(task_id);',
  'CREATE INDEX IF NOT EXISTS idx_escape_logs_task ON escape_logs(task_id);',
  'CREATE INDEX IF NOT EXISTS idx_proof_logs_step ON proof_logs(step_id);'
]

export const INDEX_DEFINITIONS = [
  {
    name: 'idx_steps_task',
    table: 'steps',
    column: 'task_id'
  },
  {
    name: 'idx_escape_logs_task',
    table: 'escape_logs',
    column: 'task_id'
  },
  {
    name: 'idx_proof_logs_step',
    table: 'proof_logs',
    column: 'step_id'
  }
] as const
