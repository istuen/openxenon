export const BOUNDARY_DIR = '.openxenon'
export const TASKS_DIR = 'tasks'
export const WORK_DIR = 'work'
export const DOMAINS_DIR = 'domains'
export const PROOFS_DIR = 'proofs'

export const BLUEPRINT_FILE = 'blueprint.yaml'
export const BLUEPRINT_OXN_FILE = 'blueprint.oxn'
export const FROZEN_BLUEPRINT_JSON = 'blueprint.frozen.json'
export const ASSEMBLY_JSON = 'blueprint.assembly.json'
export const TASK_OXN_FILE = 'task.oxn'
export const WORK_OXN_FILE = 'work.oxn'
export const TASK_TRACE_FILE = 'task-trace.jsonl'
export const CONFIG_FILE = 'config.json'
export const CANONICAL_FILE = 'canonical.yaml'

// Proof 空间（v0.1.2 Proof-First 入口）
//   .openxenon/proofs/<name>/proof.oxn   — Probe 声明
//   .openxenon/proofs/<name>/frozen.json — 判决书（不可篡改）
export const PROOF_OXN_FILE = 'proof.oxn'
export const PROOF_FROZEN_JSON = 'frozen.json'

// =============================================================================
// Work 空间运行时文件命名范式
//
// 命名约定: {entity}-{aspect}.{ext}
//   - {entity} ∈ {work, task}：实体名（work = work 级，task = task 子实体级）
//   - {aspect} ∈ {state, trace, frozen}：运行时侧面
//   - {ext}    ∈ {json, jsonl}：文件类型
//
// 例外（图纸文件）:
//   - work.oxn   （仅 Intent 图纸，命名上无 aspect 后缀）
//   - task.oxn   （同上）
//
// 所有运行时产物严格遵循此范式，使根目录与 tasks/<t>/ 子目录文件名前缀永不冲突。
// =============================================================================

// work 根目录（works/<w>/）
export const WORK_STATE_JSON = 'work-state.json'
export const WORK_TRACE_JSONL = 'work-trace.jsonl'
export const WORK_FROZEN_JSON = 'work-frozen.json'

// task 子目录（works/<w>/tasks/<t>/）
export const TASK_STATE_JSON = 'task-state.json'
export const TASK_TRACE_JSONL = 'task-trace.jsonl'
export const TASK_FROZEN_JSON = 'task-frozen.json'

export const DEBUG_LOG_FILE = 'debug.log'

export const DAEMON_SOCK_FILENAME = 'daemon.sock'
export const DAEMON_PID_FILENAME = 'daemon.pid'
export const DAEMON_LOG_FILENAME = 'daemon.log'
