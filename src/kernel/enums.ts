export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ESCAPED'
  | 'TERMINATED'

export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PASSED'
  | 'FAILED'

export type BlueprintStatus =
  | 'DRAFT'
  | 'CANONICAL'
  | 'SAMPLE'
  | 'ABANDONED'

export type ArtifactType =
  | 'code'
  | 'config'
  | 'document'
  | 'test'

export type ProofType =
  | 'validation'
  | 'lint'
  | 'test'

export type ProjectStatus = 'active' | 'archived'

export type ProbeType =
  | 'fs_exists'
  | 'fs_not_exists'
  | 'fs_match'
  | 'fs_parseable'
  | 'shell_exec'

export type Action = 'TASK_NEW' | 'TASK_START' | 'TASK_STOP' | 'TASK_SUBMIT' | 'TASK_LIST' | 'TASK_TRACE'