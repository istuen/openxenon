import type { Action } from './action'
import type { Artifact } from './artifact'
import type { TaskStatus, XnPartStatus, XnTaskStatus } from './core'

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
  xnTaskStatus: XnTaskStatus
  action?: Action
  createdAt: number
  updatedAt: number
}

export interface StepManifest {
  taskId: string
  stepId: string
  status: XnPartStatus
  artifacts: Artifact[]
}
