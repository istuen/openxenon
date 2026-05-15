import { join } from 'path'
import { BOUNDARY_DIR } from '../constants'

export interface Project {
  id: string
  path: string
  name: string
  status: ProjectStatus
  lastHeartbeat: number
  createdAt: number
  updatedAt: number
}

export type ProjectStatus = 'active' | 'inactive' | 'archived'

export function getProjectBoundaryPath(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR)
}

export function getProjectConfigPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'config.json')
}

export function getTasksPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'tasks')
}

export function getTaskPath(projectRoot: string, taskId: string): string {
  return join(getTasksPath(projectRoot), taskId)
}

export function getStepManifestPath(projectRoot: string, taskId: string, stepId: string): string {
  return join(getTaskPath(projectRoot, taskId), stepId, 'manifest.yaml')
}

export function getProjectArsenalPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'arsenals')
}

export function getTaskTracePath(projectRoot: string, taskId: string): string {
  return join(getTaskPath(projectRoot, taskId), 'trace.yaml')
}