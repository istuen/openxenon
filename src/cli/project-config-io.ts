import { existsSync, readFileSync, writeFileSync } from 'fs'
import { getProjectConfigPath } from '../kernel/lib/project'
import type { ProjectConfig } from '../kernel/lib/project-config'

export function readProjectConfig(projectRoot: string): ProjectConfig | null {
  const configPath = getProjectConfigPath(projectRoot)
  if (!existsSync(configPath)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as ProjectConfig
  } catch {
    return null
  }
}

export function writeProjectConfig(projectRoot: string, config: ProjectConfig): void {
  const configPath = getProjectConfigPath(projectRoot)
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}
