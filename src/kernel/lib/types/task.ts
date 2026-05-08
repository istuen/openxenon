import type { TaskStatus, XnTaskStatus, XnStageStatus } from './core'
import type { Artifact } from './artifact'
import type { Action } from './action'

export interface Task {
  id: string
  name: string
  status: TaskStatus
  activeBlueprintId?: string
  createdAt: number
  updatedAt: number
}

export interface XnTask {
  id: string;
  name: string;
  activeBlueprintId?: string;
  xnTaskStatus: XnTaskStatus;
  action?: Action;
  createdAt: number;
  updatedAt: number;
}

export interface StepManifest {
  taskId: string
  stepId: string
  status: XnStageStatus
  artifacts: Artifact[]
}