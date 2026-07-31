export const BOUNDARY_DIR = '.openxenon'
export const TASKS_DIR = 'tasks'
export const WORK_DIR = 'work'
export const DOMAINS_DIR = 'domains'
export const PROOFS_DIR = 'proofs'

// PR-1: 全局 slim 索引（AI 离线读全局 DDD 词汇）
//   .openxenon/.cache/domains.json    — slim 模式：仅 name/file/desc/termNames + 计数
//   .openxenon/.cache/blueprints.json — slim 模式：仅 name/file/desc/version/slotNames + propCount
export const CACHE_DIR = '.cache'
export const DOMAIN_INDEX_JSON = 'domains.json'
export const BLUEPRINT_INDEX_JSON = 'blueprints.json'

export const BLUEPRINT_FILE = 'blueprint.yaml'
/** @deprecated Use BLUEPRINT_FILE instead. Will be removed in v0.8. */
export const BLUEPRINT_OXN_FILE = BLUEPRINT_FILE
export const FROZEN_BLUEPRINT_JSON = 'blueprint.frozen.json'
export const ASSEMBLY_JSON = 'blueprint.assembly.json'
export const TASK_FILE = 'task.md'
/** @deprecated Use TASK_FILE instead. Will be removed in v0.8. */
export const TASK_OXN_FILE = TASK_FILE
export const WORK_FILE_ENTRY = 'work.md'
/** @deprecated Use WORK_FILE_ENTRY instead. Will be removed in v0.8. */
export const WORK_OXN_FILE = WORK_FILE_ENTRY
export const TASK_TRACE_FILE = 'task-trace.jsonl'
export const CONFIG_FILE = 'config.json'
export const CANONICAL_FILE = 'canonical.yaml'

// Proof 空间（v0.1.2 Proof-First 入口；RFC-0015 D1 全面规范化）
//   .openxenon/proofs/<name>/proof.md          — Probe 声明（可编辑，0o644）
//   .openxenon/proofs/<name>/frozen.json       — 判决书（不可篡改，0o444 + SHA-256）
//   .openxenon/proofs/<name>/outcome.md        — 人类可读结案文档（v0.5 PR-A；RFC-0008 D2 + RFC-0015 D1.1 verdict→outcome 名实一致）
//   .openxenon/proofs/<name>/work-snapshot.md  — work.md 不可变字节副本（RFC-0015 D1.2：从 proof.md 物理隔离以避免 Probe 源被首次 run 后覆盖）
//   .openxenon/proofs/<name>/work-hash.txt     — work-snapshot.md 副本的 SHA-256（v0.4 PR-B Q4-A）
//   .openxenon/proofs/<name>/.running.json     — 瞬态占位（v0.1.3 PR-2；RFC-0015 D1.3 从 CLI 提升至 kernel）
export const PROOF_FILE = 'proof.md'
/** @deprecated Use PROOF_FILE instead. Will be removed in v0.8. */
export const PROOF_OXN_FILE = PROOF_FILE
export const PROOF_FROZEN_JSON = 'frozen.json'
/** 人类可读结案文档文件名（v0.5 PR-A；RFC-0008 D2 verdict→outcome 名实对齐；RFC-0015 D1.1 完成名实一致） */
export const PROOF_OUTCOME_MD = 'outcome.md'
/**
 * @deprecated Use PROOF_OUTCOME_MD instead. Value alias kept for 1 major version (v0.8.x 仍能读取历史 verdict.md)，
 * v0.9.0 物理删除。(RFC-0015 D1.1)
 */
export const PROOF_VERDICT_MD = PROOF_OUTCOME_MD
/** work.md 不可变字节副本文件名（RFC-0015 D1.2：从 'proof.md' 物理隔离避免覆盖 Probe 源） */
export const PROOF_WORK_SNAPSHOT_FILE = 'work-snapshot.md'
/**
 * @deprecated Use PROOF_WORK_SNAPSHOT_FILE instead. Old value 'proof.md' 仍指向 Probe 声明源以便
 * 历史 probe 加载（v0.8.x 兼容窗口）。v0.9.0 物理删除。(RFC-0015 D1.2)
 */
export const PROOF_MD_FILE = PROOF_FILE
export const PROOF_WORK_HASH_FILE = 'work-hash.txt'
/** 运行时瞬态占位文件名（v0.1.3 PR-2；RFC-0015 D1.3 从 CLI local const 提升至 kernel） */
export const PROOF_RUNNING_JSON = '.running.json'

// v0.1.2: 全局 Probe 执行历史（Proof-First 闭环的"记忆"）
//   .openxenon/.cache/probe-stats.json  — 派生数据，可重建；非 frozen，不签名
//   每次 `oxn proof run` 完成后由 L3-CLI 编排：L0-Processor 纯函数合并 + L1-Infra 写盘
export const PROBE_STATS_JSON = 'probe-stats.json'
/** proofRuns 数组上限：FIFO 截断，防止无限增长 */
export const MAX_PROOF_RUNS = 1000

// =============================================================================
// Work 空间运行时文件命名范式（V1 — PR-4 切换）
//
//   works/<w>/
//     work.md                                     [Intent] 图纸
//     .work                                       [CLI]    静态门禁卡（PR-2）
//     .run/                                       [CLI]    动态运行时
//       state.json                                [Align]  进度条
//       trace.jsonl                               [Align]  日志流
//       frozen.json                               [Align]  交付快照（终态）
//       tasks/<t>/
//         state.json
//         trace.jsonl
//         frozen.json
//     domains.json / blueprints.json              [CLI]    per-work slim 索引（PR-3）
//
// V0 → V1 迁移：M3 硬切。检测到 V0 旧布局（works/<w>/work-state.json 存在但 .run/ 不存在）
//       → 抛 IAP_ALIGN_WORK_LAYOUT_LEGACY（PR-11）；用户跑 `oxn work migrate <name>`（PR-10）
//
// 命名约定：路径含 scope（.run/）→ 文件名去 entity 前缀（state/trace/frozen）
//           task.md / work.md 例外：图纸，无 aspect 后缀
// =============================================================================

// PR-2: Work 静态门禁卡（CLI 写、AI 读禁改；记录出生证明 + 资产锁 + planLock）
//   .openxenon/works/<w>/.work  — 单 JSON 文件
export const WORK_FILE = '.work'

// PR-4+5: 动态运行时（CLI 独占；AI 读用 oxn work status/context）
export const RUN_DIR = '.run'
export const WORK_RUN_STATE_JSON = 'state.json'
export const WORK_RUN_TRACE_JSONL = 'trace.jsonl'
export const WORK_RUN_FROZEN_JSON = 'frozen.json'

// PR-3: per-work slim 索引（AI 决策用；CLI 写）
export const WORK_DOMAINS_JSON = 'domains.json'
export const WORK_BLUEPRINTS_JSON = 'blueprints.json'

// task 子运行时（works/<w>/.run/tasks/<t>/）
export const RUN_TASKS_SUBDIR = 'tasks'
export const TASK_RUN_STATE_JSON = 'state.json'
export const TASK_RUN_TRACE_JSONL = 'trace.jsonl'
export const TASK_RUN_FROZEN_JSON = 'frozen.json'

export const DEBUG_LOG_FILE = 'debug.log'

export const DAEMON_SOCK_FILENAME = 'daemon.sock'
export const DAEMON_PID_FILENAME = 'daemon.pid'
export const DAEMON_LOG_FILENAME = 'daemon.log'
