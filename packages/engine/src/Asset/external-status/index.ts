/**
 * Asset/external-status.ts — External 状态管理（v0.6.1-alpha.4 Phase 2）
 *
 * External 声明是静态的（Asset 不可变，参与 content_hash）。
 * External 的可用性状态是动态的（API 可能宕机、文件可能被移动）。
 *
 * 状态存储在 `.openxenon/.cache/external-status.json`（gitignore，运行时生成），
 * 4 状态值：
 *   - available:   资源可达 / 文件存在
 *   - unavailable: 资源不可达 / 文件不存在
 *   - stale:       TTL 过期
 *   - unknown:     尚未检测
 *
 * Key 格式：`<entity-type>::<entity-name>::<external-name>`
 *   例：`domain::PaymentContext::stripe-api`
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const EXTERNAL_STATUS_VALUES = ['available', 'unavailable', 'stale', 'unknown'] as const
export type ExternalStatus = (typeof EXTERNAL_STATUS_VALUES)[number]

export interface ExternalStatusRecord {
  status: ExternalStatus
  lastChecked: string // ISO 8601
  error?: string
}

const STATUS_FILE = '.openxenon/.cache/external-status.json'

/** 构造 status key */
export function externalStatusKey(
  entityType: 'domain' | 'workflow' | 'stack',
  entityName: string,
  externalName: string,
): string {
  return `${entityType}::${entityName}::${externalName}`
}

/** 读取整个 status 文件 */
export function loadStatusFile(projectRoot: string): Record<string, ExternalStatusRecord> {
  const path = join(projectRoot, STATUS_FILE)
  if (!existsSync(path)) return {}
  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content) as Record<string, ExternalStatusRecord>
  } catch {
    return {}
  }
}

/** 写入整个 status 文件 */
export function saveStatusFile(projectRoot: string, data: Record<string, ExternalStatusRecord>): void {
  const path = join(projectRoot, STATUS_FILE)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

/** 获取某条 external 的 status（无记录返回 unknown） */
export function getStatus(
  projectRoot: string,
  entityType: 'domain' | 'workflow' | 'stack',
  entityName: string,
  externalName: string,
): ExternalStatus {
  const data = loadStatusFile(projectRoot)
  const key = externalStatusKey(entityType, entityName, externalName)
  return data[key]?.status ?? 'unknown'
}

/** 设置某条 external 的 status */
export function setStatus(
  projectRoot: string,
  entityType: 'domain' | 'workflow' | 'stack',
  entityName: string,
  externalName: string,
  status: ExternalStatus,
  error?: string,
): void {
  const data = loadStatusFile(projectRoot)
  const key = externalStatusKey(entityType, entityName, externalName)
  data[key] = {
    status,
    lastChecked: new Date().toISOString(),
    ...(error ? { error } : {}),
  }
  saveStatusFile(projectRoot, data)
}

/** 检查 url（HTTP HEAD）或 path（existsSync）的可达性 */
export async function checkExternalReachable(external: {
  url?: string
  path?: string
}): Promise<{ ok: boolean; error?: string }> {
  if (external.path) {
    return existsSync(external.path) ? { ok: true } : { ok: false, error: `File not found: ${external.path}` }
  }
  if (external.url) {
    try {
      const res = await fetch(external.url, { method: 'HEAD' })
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
  return { ok: false, error: 'no url or path' }
}

/** 检查 ttl 是否过期（简单格式: "7d" / "30d" / "24h"） */
export function isTtlExpired(ttl: string | undefined, lastChecked: string): boolean {
  if (!ttl) return false
  const m = ttl.match(/^(\d+)([dhm])$/)
  if (!m) return false
  const n = parseInt(m[1]!, 10)
  const unit = m[2]!
  const ms = unit === 'd' ? n * 86400_000 : unit === 'h' ? n * 3600_000 : n * 60_000
  const checkedMs = new Date(lastChecked).getTime()
  if (!Number.isFinite(checkedMs)) return true
  return Date.now() - checkedMs > ms
}
