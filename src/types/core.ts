export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'escaped'
  | 'terminated'

export type XnTaskStatus = TaskStatus;

export type StepStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'

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
