import type { Playbook } from './playbook'
import type { XnBlueprint } from './xn-blueprint'
import type { TaskStatus, XnTaskStatus, XnStageStatus } from './core'
import type { Artifact } from './artifact'
import type { XnAction } from './xn-action'

export interface Task {
  id: string
  name: string
  playbook: Playbook
  status: TaskStatus
  createdAt: number
  updatedAt: number
}

export interface XnTask {
  id: string;
  name: string;
  xnBlueprint: XnBlueprint;
  xnTaskStatus: XnTaskStatus;
  xnAction?: XnAction;
  createdAt: number;
  updatedAt: number;
}

export interface StepManifest {
  taskId: string
  stepId: string
  status: XnStageStatus
  artifacts: Artifact[]
  timestamp: number
}
