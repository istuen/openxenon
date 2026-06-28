/**
 * src/kernel/contracts/io-primitive.ts
 * v0.2 T4 Probe Signal Taint v2 PR-1: IO Primitive 数据契约
 *
 * 纯洁性约束（L0-Schema 层）：
 *   - 不得 import 任何上层（L0-Processor / L1+）
 *   - 不得 import 'fs' / 'net' / 'child_process'（Kernel 是兰姆达真空）
 *   - 纯类型 + 常量定义文件
 *
 * 核心抽象：把 Kernel 内部 IO 操作降维到 3 个最基础的 IO Primitive
 *   - io.stat: 文件元数据查询（存在 / 类型 / 大小 / mtime / symlink）
 *   - io.read: 文件内容读取（带 maxBytes 截断 + encoding）
 *   - io.exec: 进程执行（带 timeout + env）
 *
 * 每个 IO Primitive 返回的 result 携带 IOInterference.flags（12 项枚举），
 * 由 Infra 层 Provider 在物理 IO 时填充，Kernel verdict.ts 据此判定
 * INCONCLUSIVE / 透传。
 */

/** 3 个最基础的 IO Primitive 名字 */
export type IOPrimitive = 'io.stat' | 'io.read' | 'io.exec'

/** 12 项信号污染标记（v0.2 Sprint 3a 引入） */
export type InterferenceFlag =
  | 'waf_detected' // WAF 拦截的响应不算业务事实（RED）
  | 'cdn_cache' // CDN 缓存可作为"缓存内的事实"（YELLOW）
  | 'cache_path' // .cache / node_modules 是"工程文件"，业务上合法（YELLOW）
  | 'just_modified' // mtimeMs 距 now < 1000ms 必是构建残留（RED）
  | 'symlink' // 符号链接在 OXN 部署中合法（YELLOW）
  | 'detached_head' // git HEAD detached = 工程状态未受版本控制（RED）
  | 'shallow_clone' // git 历史不完整（RED）
  | 'sandbox_violation' // shell 命令被沙箱拦截 = 实际没执行（RED，PR-4 触发）
  | 'network_timeout' // 超时 = 没拿到响应（RED）
  | 'response_truncated' // 截断 = 响应不完整（RED）
  | 'permission_denied' // 权限拦截 = 不可读（RED）
  | 'unknown' // 未识别的 flag 一律 RED（保守策略）

// ───────── io.stat ─────────

export interface IOStatRequest {
  path: string
}

export interface IOStatResult {
  exists: boolean
  isFile: boolean
  isDir: boolean
  mtimeMs: number | null
  size: number | null
  symlink: boolean
}

// ───────── io.read ─────────

export type IOReadEncoding = 'utf-8' | 'base64'

export interface IOReadRequest {
  path: string
  encoding?: IOReadEncoding
  maxBytes?: number
}

export interface IOReadResult {
  bytes: number
  text: string
  truncated: boolean
}

// ───────── io.exec ─────────

export interface IOExecRequest {
  command: string
  args?: string[]
  timeoutMs?: number
  env?: Record<string, string>
}

export interface IOExecResult {
  exitCode: number | null
  stdout: string
  stderr: string
  durationMs: number
}

// ───────── 通用: 干扰标记集合 ─────────

export interface IOInterference {
  flags: InterferenceFlag[]
}
