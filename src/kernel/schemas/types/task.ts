import type { Action } from './action'
import type { Artifact } from './artifact'
import type { TaskStatus, StepStatus } from '../../enums'

export interface Task {
  id: string
  name: string
  status: TaskStatus
  activeBlueprintId?: string
  createdAt: number
  updatedAt: number
}

export interface XnTask {
  id: string
  name: string
  activeBlueprintId?: string
  xnTaskStatus: TaskStatus
  action?: Action
  createdAt: number
  updatedAt: number
}

export interface StepManifest {
  taskId: string
  stepId: string
  status: StepStatus
  artifacts: Artifact[]
}
