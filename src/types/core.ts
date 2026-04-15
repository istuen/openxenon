export type TaskStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'

export type StepStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'

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
