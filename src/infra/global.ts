import { homedir } from 'os'
import { join } from 'path'

export const GLOBAL_BOUNDARY_PATH = join(homedir(), '.openxenon')
export const CORE_PROJECTS_PATH = join(GLOBAL_BOUNDARY_PATH, 'projects.json')
export const CORE_DAEMON_CONFIG_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon-config.json')
export const GLOBAL_PROOFS_PATH = join(GLOBAL_BOUNDARY_PATH, 'proofs')
export const COMMON_PROOFS_PATH = join(GLOBAL_PROOFS_PATH, 'common')
export const TEMPLATES_PATH = join(GLOBAL_PROOFS_PATH, 'templates')
export const DAEMON_SOCK_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.sock')
export const DAEMON_PID_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.pid')
export const DAEMON_LOG_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.log')
