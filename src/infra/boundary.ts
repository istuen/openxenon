import { homedir } from 'os'
import { join } from 'path'
import type { OsPort } from '../kernel/index'

export const BOUNDARY_DIR = '.openxenon'

export function getGlobalBoundaryPath(): string {
  return join(homedir(), BOUNDARY_DIR)
}

export const osPort: OsPort = {
  getHomedir: () => homedir(),
  getGlobalBoundaryPath: () => getGlobalBoundaryPath(),
  join: (...segments: string[]) => join(...segments),
}

export function getGlobalTasksPath(): string {
  return join(getGlobalBoundaryPath(), 'tasks')
}

export function getGlobalWorkPath(): string {
  return join(getGlobalBoundaryPath(), 'work')
}

export function getGlobalArsenalPath(): string {
  return join(getGlobalBoundaryPath(), 'arsenal')
}
