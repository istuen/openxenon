/**
 * md-bridge/reference-checker.ts — 内部/外部引用分级
 *
 * v0.3 阶段 1 T7 任务
 *
 * 角色：
 * - 区分 Intent 引用 vs 外部 URL/路径
 * - 提供 2 级严重程度（Fatal / Warn）
 * - 异步检查外部 URL 可达性（可选）
 *
 * 关键不变量：
 * - 内部 Intent 引用断链 = Fatal（阻断 Proof）
 * - 外部 URL/路径断链 = Warn（警告不阻断）
 * - 判定规则：target.startsWith('.openxenon/') = 内部
 *
 * 引用类型：
 * - `.openxenon/domains/<name>.md` — 内部 Domain
 * - `.openxenon/blueprints/<name>.md` — 内部 Blueprint
 * - `.openxenon/works/<w>/work.md` — 内部 Work
 * - `.openxenon/works/<w>/tasks/<t>/task.md` — 内部 Task
 * - `.openxenon/proofs/<p>/verdict.md` — 内部 Proof
 * - `https://...` — 外部 URL
 * - `./relative.md` `../relative.md` — 外部相对路径
 */

import { join, isAbsolute } from 'node:path'
import { existsSync } from 'node:fs'
import { fs } from '../../infra/filesystem.js'

// ========================
// 类型
// ========================

export type ReferenceSeverity = 'fatal' | 'warn'

export interface ReferenceTarget {
  /** 引用目标原始字符串 */
  raw: string
  /** 解析后的绝对路径（如果是文件引用）*/
  absolutePath?: string
  /** 是否为内部 Intent 引用 */
  internal: boolean
  /** 严重程度 */
  severity: ReferenceSeverity
  /** 引用类型 */
  kind: 'domain' | 'blueprint' | 'work' | 'task' | 'proof' | 'url' | 'path' | 'unknown'
}

export interface ReferenceCheckResult {
  /** 引用目标 */
  target: ReferenceTarget
  /** 是否可达（存在 / HTTP 200）*/
  reachable: boolean
  /** 错误信息（如果不可达）*/
  error?: string
  /** 校验时间（ms）*/
  checkTime: number
}

export interface ReferenceCheckOptions {
  /** 项目根目录（用于解析相对路径）*/
  projectRoot?: string
  /** 是否检查外部 URL（默认 false 避免网络依赖）*/
  checkExternalUrls?: boolean
  /** 已知存在的内部 Intent 资产（可选 override）*/
  knownInternalAssets?: Set<string>
  /** HTTP 请求超时（ms，默认 5000）*/
  httpTimeoutMs?: number
}

// ========================
// 引用解析
// ========================

/**
 * 解析引用目标
 */
export function parseReferenceTarget(raw: string, _projectRoot?: string): ReferenceTarget {
  const trimmed = raw.trim()

  // 1. 内部 Intent 引用（以 .openxenon/ 开头）
  if (trimmed.startsWith('.openxenon/')) {
    const kind = detectInternalKind(trimmed)
    return {
      raw: trimmed,
      internal: true,
      severity: 'fatal',
      kind,
    }
  }

  // 2. 内部 OXL ref（@prj/ 或 @oxn/）
  if (trimmed.startsWith('@prj/') || trimmed.startsWith('@oxn/')) {
    return {
      raw: trimmed,
      internal: true,
      severity: 'fatal',
      kind: detectOxnRefKind(trimmed),
    }
  }

  // 3. 外部 URL
  if (/^https?:\/\//.test(trimmed)) {
    return {
      raw: trimmed,
      internal: false,
      severity: 'warn',
      kind: 'url',
    }
  }

  // 4. 相对路径（./xxx 或 ../xxx）
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return {
      raw: trimmed,
      internal: false,
      severity: 'warn',
      kind: 'path',
    }
  }

  // 5. 绝对路径
  if (isAbsolute(trimmed)) {
    return {
      raw: trimmed,
      internal: trimmed.includes('.openxenon/'),
      severity: trimmed.includes('.openxenon/') ? 'fatal' : 'warn',
      kind: 'path',
    }
  }

  // 6. 未知
  return {
    raw: trimmed,
    internal: false,
    severity: 'warn',
    kind: 'unknown',
  }
}

/** 检测内部 Intent 类型 */
function detectInternalKind(path: string): ReferenceTarget['kind'] {
  if (path.startsWith('.openxenon/domains/')) return 'domain'
  if (path.startsWith('.openxenon/blueprints/')) return 'blueprint'
  if (path.startsWith('.openxenon/works/') && path.includes('/tasks/')) return 'task'
  if (path.startsWith('.openxenon/works/')) return 'work'
  if (path.startsWith('.openxenon/proofs/')) return 'proof'
  return 'unknown'
}

/** 检测 OXL ref 类型（@prj/blueprints/X → blueprint 等）*/
function detectOxnRefKind(ref: string): ReferenceTarget['kind'] {
  const parts = ref.split('/')
  if (parts.length >= 2) {
    const second = parts[1] // @prj/blueprints/X → 'blueprints'
    if (second === 'blueprints') return 'blueprint'
    if (second === 'domains') return 'domain'
    if (second === 'works') return 'work'
    if (second === 'tasks') return 'task'
    if (second === 'proofs') return 'proof'
  }
  return 'unknown'
}

// ========================
// 可达性检查
// ========================

/**
 * 检查单个引用是否可达
 */
export async function checkReference(raw: string, options: ReferenceCheckOptions = {}): Promise<ReferenceCheckResult> {
  const startTime = Date.now()
  const target = parseReferenceTarget(raw, options.projectRoot)

  // 1. 内部 Intent：检查文件存在
  if (target.internal) {
    const reachable = checkInternalExists(target.raw, options)
    return {
      target,
      reachable,
      error: reachable ? undefined : `Internal asset not found: ${target.raw}`,
      checkTime: Date.now() - startTime,
    }
  }

  // 2. 外部 URL：可选 HTTP HEAD 请求
  if (target.kind === 'url' && options.checkExternalUrls) {
    const reachable = await checkUrlReachable(target.raw, options.httpTimeoutMs ?? 5000)
    return {
      target,
      reachable,
      error: reachable ? undefined : `URL not reachable: ${target.raw}`,
      checkTime: Date.now() - startTime,
    }
  }

  // 3. 外部相对路径：检查文件存在
  if (target.kind === 'path') {
    const projectRoot = options.projectRoot ?? process.cwd()
    const absolutePath = isAbsolute(target.raw) ? target.raw : join(projectRoot, target.raw)
    const reachable = checkPathExists(absolutePath)
    return {
      target,
      reachable,
      error: reachable ? undefined : `File not found: ${absolutePath}`,
      checkTime: Date.now() - startTime,
    }
  }

  // 4. 未知：跳过（仅警告）
  return {
    target,
    reachable: true,
    checkTime: Date.now() - startTime,
  }
}

/**
 * 批量检查
 */
export async function checkReferences(
  refs: string[],
  options: ReferenceCheckOptions = {},
): Promise<ReferenceCheckResult[]> {
  return Promise.all(refs.map((ref) => checkReference(ref, options)))
}

// ========================
// 内部辅助
// ========================

/** 检查内部 Intent 资产是否存在 */
function checkInternalExists(raw: string, options: ReferenceCheckOptions): boolean {
  // 优先使用 knownInternalAssets override
  if (options.knownInternalAssets) {
    return options.knownInternalAssets.has(raw)
  }

  // 默认：检查文件系统
  const projectRoot = options.projectRoot ?? process.cwd()
  const absolutePath = join(projectRoot, raw)
  return existsSync(absolutePath) || fs.exists(absolutePath)
}

/** 检查文件路径是否存在 */
function checkPathExists(absolutePath: string): boolean {
  return existsSync(absolutePath) || fs.exists(absolutePath)
}

/** 检查 URL 可达性（HEAD 请求）*/
async function checkUrlReachable(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok || response.status === 405 // HEAD not allowed but URL exists
  } catch {
    return false
  }
}
