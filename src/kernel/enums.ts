export type TaskStatus =
  | 'PENDING'
  | 'REVIEW'
  | 'CONFIRMED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ESCAPED'
  | 'TERMINATED'

export type StepStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED'

export type BlueprintStatus = 'DRAFT' | 'CANONICAL' | 'SAMPLE' | 'ABANDONED'

export type ArtifactType = 'code' | 'config' | 'document' | 'test'

export type ProofType = 'validation' | 'lint' | 'test'

export type ProjectStatus = 'active' | 'archived'

export type ProbeType = 'fs_exists' | 'fs_not_exists' | 'fs_match' | 'fs_parseable' | 'shell_exec'

export type Action = 'TASK_NEW' | 'TASK_START' | 'TASK_STOP' | 'TASK_SUBMIT' | 'TASK_LIST' | 'TASK_TRACE'

// v1.0 (Phase 4 完成): OxnErrorCode + ErrorCategory 已删除。
//   替代体系: src/core/errors/ 下的 IAPError / OXNCrash / isCliInputError (3 个守卫生成的双轨制)。
//   旧 OXN_SOCKET_* 等 Daemon 错在 Phase 4 已统一为 IAPError('PROOF','INFRA_FAIL',...) throws。
//   本文件保留 8 个 type 枚举（与错误码无关）。
