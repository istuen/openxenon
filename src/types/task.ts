import type { Playbook } from './playbook'
import type { StepStatus } from './core'
import type { Artifact } from './artifact'

export interface Task {
  id: string
  name: string
  playbook: Playbook
  status: import('./core').TaskStatus
  createdAt: number
  updatedAt: number
}

export interface StepManifest {
  taskId: string
  stepId: string
  status: StepStatus
  artifacts: Artifact[]
  timestamp: number
}
