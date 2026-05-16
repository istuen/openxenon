import { homedir } from 'os'
import { join } from 'path'

export const GLOBAL_BOUNDARY_PATH = join(homedir(), '.openxenon')
export const PROJECT_BOUNDARY_DIR = '.openxenon'
export const CORE_PROJECTS_PATH = join(GLOBAL_BOUNDARY_PATH, 'projects.json')
export const CORE_DAEMON_CONFIG_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon-config.json')
export const TEMPLATES_PATH = join(GLOBAL_BOUNDARY_PATH, 'templates')
export const DAEMON_SOCK_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.sock')
export const DAEMON_PID_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.pid')
export const DAEMON_LOG_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.log')
export const HALL_PATH = join(GLOBAL_BOUNDARY_PATH, 'hall')

export function getProjectHallPath(projectRoot: string): string {
  return join(projectRoot, PROJECT_BOUNDARY_DIR, 'hall')
}
