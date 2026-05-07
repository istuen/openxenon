import { existsSync } from 'fs'
import { join } from 'path'
import { missingProjectPath, projectNotFound } from './errors'
import { getSpaceMode } from '../core/config'

export interface ProjectContext {
  projectPath: string
  configPath: string
  mode: 'PRODUCTION' | 'SANDBOX'
}

export function loadProjectContext(projectPath: string | null): ProjectContext | Response {
  if (!projectPath) {
    return missingProjectPath()
  }

  const xenonixPath = join(projectPath, '.openxenon')
  const configPath = join(xenonixPath, 'config.json')

  if (!existsSync(xenonixPath)) {
    return projectNotFound(projectPath)
  }

  const mode = getSpaceMode(projectPath)

  return {
    projectPath,
    configPath,
    mode
  }
}

export function closeProjectDatabases(): void {
  // No-op: JSON files don't need connection management
}
