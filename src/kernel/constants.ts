import { homedir } from 'os'
import { join } from 'path'

export const BOUNDARY_DIR = '.openxenon'
export const TASKS_DIR = 'tasks'

export const BLUEPRINT_FILE = 'blueprint.yaml'
export const FROZEN_FILE = 'frozen.yaml'
export const FROZEN_BLUEPRINT_FILE = 'blueprint.frozen.yaml'
export const TASK_TRACE_FILE = 'task-trace.yaml'
export const STEP_MANIFEST_FILE = 'step-manifest.json'
export const CONFIG_FILE = 'config.json'
export const CANONICAL_FILE = 'canonical.yaml'

export const DEBUG_LOG_FILE = 'debug.log'

export const GLOBAL_BOUNDARY_PATH = join(homedir(), BOUNDARY_DIR)
export const DAEMON_SOCK_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.sock')
export const DAEMON_PID_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.pid')
export const DAEMON_LOG_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.log')