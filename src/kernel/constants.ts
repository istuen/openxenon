import { homedir } from 'os'
import { join } from 'path'

export const BOUNDARY_DIR = '.openxenon'
export const TASKS_DIR = 'tasks'

export const BLUEPRINT_FILE = 'blueprint.yaml'
export const BLUEPRINT_OXN_FILE = 'blueprint.oxn'
export const FROZEN_BLUEPRINT_JSON = 'blueprint.frozen.json'
export const ASSEMBLY_JSON = 'blueprint.assembly.json'
export const TASK_OXN_FILE = 'task.oxn'
export const TASK_TRACE_FILE = 'task-trace.jsonl'
export const CONFIG_FILE = 'config.json'
export const CANONICAL_FILE = 'canonical.yaml'

export const DEBUG_LOG_FILE = 'debug.log'

export const GLOBAL_BOUNDARY_PATH = join(homedir(), BOUNDARY_DIR)
export const DAEMON_SOCK_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.sock')
export const DAEMON_PID_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.pid')
export const DAEMON_LOG_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.log')
