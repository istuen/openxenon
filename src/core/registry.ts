import { registerProject as registerProjectJson, getProjectByPath as getProjectByPathJson, updateProjectHeartbeat as updateHeartbeatJson, type ProjectRecord } from './projects'

export type Project = ProjectRecord

export function registerProject(
  projectPath: string,
  projectName: string
): Project {
  return registerProjectJson(projectPath, projectName)
}

export function getProjectByPath(projectPath: string): Project | null {
  return getProjectByPathJson(projectPath) ?? null
}

export function updateProjectHeartbeat(projectPath: string): void {
  updateHeartbeatJson(projectPath)
}
