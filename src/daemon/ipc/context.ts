import { join } from 'path'
import { existsSync, readFileSync } from '../../infra/filesystem'
import { BOUNDARY_DIR, CONFIG_FILE } from '../../kernel/constants'
import type { ProjectConfig } from '../../cli/project-config'
import { missingProjectPath, projectNotFound } from './errors'

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
      if (config.mode === 'PRODUCTION' || config.mode === 'SANDBOX') {
        mode = config.mode
      }
    } catch {
      // Use default
    }
  }

  return {
    projectPath,
    configPath,
    mode,
  }
}

export function closeProjectDatabases(): void {
  // No-op: JSON files don't need connection management
}
