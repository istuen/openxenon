export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ESCAPED'
  | 'TERMINATED'

export type XnTaskStatus = TaskStatus;

export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PASSED'
  | 'FAILED'

export type XnStageStatus = StepStatus;

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
