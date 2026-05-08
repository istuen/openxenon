import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { missingProjectPath, projectNotFound } from './errors'
import { BOUNDARY_DIR, CONFIG_FILE } from '../../common/constants'

interface ProjectConfig {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
}

export interface ProjectContext {
  projectPath: string
  configPath: string
  mode: 'PRODUCTION' | 'SANDBOX'
}

export function loadProjectContext(projectPath: string | null): ProjectContext | Response {
  if (!projectPath) {
    return missingProjectPath()
  }

  const xenonixPath = join(projectPath, BOUNDARY_DIR)
  const configPath = join(xenonixPath, CONFIG_FILE)

  if (!existsSync(xenonixPath)) {
    return projectNotFound(projectPath)
  }

  let mode: 'PRODUCTION' | 'SANDBOX' = 'PRODUCTION'
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(content) as ProjectConfig
      mode = config.mode || 'PRODUCTION'
    } catch {
      // Use default
    }
  }

  return {
    projectPath,
    configPath,
    mode
  }
}

export function closeProjectDatabases(): void {
  // No-op: JSON files don't need connection management
}
