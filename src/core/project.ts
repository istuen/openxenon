import { join } from 'path'

export function getProjectBoundaryPath(projectRoot: string): string {
  return join(projectRoot, '.xenonix')
}

export function getProjectDbPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'project.db')
}

export function getProjectProofsPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'proofs')
}

export function getTasksPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'tasks')
}

export function getTaskPath(projectRoot: string, taskId: string): string {
  return join(getTasksPath(projectRoot), taskId)
}

export function getStepManifestPath(projectRoot: string, taskId: string): string {
  return join(getTaskPath(projectRoot, taskId), 'step-manifest.json')
}

export function getTaskTracePath(projectRoot: string, taskId: string): string {
  return join(getTaskPath(projectRoot, taskId), 'task-trace.yaml')
}
