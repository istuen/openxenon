// =============================================================================
// birth-cert.ts — PR-2 → RFC-0033 D2/D5 极简化（退役 .work 文件）
//
// .work 单文件已删除（RFC-0033 D5）：assets 信息改由运行时读 work.md ## Use
// 段（不存冗余；与 PlanLock 一同退场）。
//
// 此文件保留以下工具以满足向后兼容需求：
//   - readWorkFile：读旧 .work 文件（schemaVersion=1，含 planLock 字段；静默剥除）
//   - getWorkFilePath / workFileExists / clearWorkFile：路径工具（供 cleanup 使用）
//   - BirthCertSchema + 类型：旧 .work 读取的类型守卫
//
// 🗑️ RFC-0033 D5：writeWorkFile / createBirthCert 已退役（不写 .work 文件）：
//   - 新建 Work 不再产生 .work 单文件
//   - 旧 .work 文件保留读路径（schemaVersion=1，planLock 静默剥除）
//   - assets 资产引用改运行时读 work.md ## Use 段（单一真相源）
// =============================================================================

import { existsSync, readFileSync, unlinkSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { z } from 'zod'
import { hashPort } from '@openxenon/engine/infra/hash'
import { WORK_FILE } from '@openxenon/engine/kernel'
import { getWorkDir } from './dual-state-io'

// ───────── Zod schema ─────────

export const DomainAssetEntrySchema = z.object({
  name: z.string().min(1),
  scope: z.enum(['@oxn', '@prj']).default('@prj'),
  version: z.number().int().min(1).default(1),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/, 'fileHash must be sha256 hex'),
})
export type DomainAssetEntry = z.infer<typeof DomainAssetEntrySchema>

export const BoundaryRefEntrySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['domain', 'workflow', 'stack', 'blueprint']).default('domain'),
  scope: z.enum(['@oxn', '@prj']).default('@prj'),
  version: z.number().int().min(1).default(1),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/, 'fileHash must be sha256 hex'),
})
export type BoundaryRefEntry = z.infer<typeof BoundaryRefEntrySchema>

export const BlueprintAssetEntrySchema = z.object({
  name: z.string().min(1),
  version: z.number().int().min(1).default(1),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/, 'fileHash must be sha256 hex'),
  domainRefs: z.array(BoundaryRefEntrySchema).default([]),
  workflowRefs: z.array(BoundaryRefEntrySchema).default([]),
  stackRefs: z.array(BoundaryRefEntrySchema).default([]),
})
export type BlueprintAssetEntry = z.infer<typeof BlueprintAssetEntrySchema>

/**
 * RFC-0033 D5: BirthCertSchema 保留以读取旧 .work 文件（向后兼容）
 * - schemaVersion=1
 * - planLock 字段已退役（旧 .work 含 planLock 时静默剥除）
 * - assets.blueprints 保留（向后兼容），但运行时读 work.md ## Use 替代
 */
export const BirthCertSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('work-birth-cert'),
  workName: z.string().regex(/^[a-z][a-z0-9-]*$/, 'workName must be kebab-case'),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  goal: z.string().default(''),
  constraints: z.array(z.string()).default([]),
  maxIterations: z.number().int().min(1).default(3),
  assets: z.object({
    blueprints: z.array(BlueprintAssetEntrySchema).default([]),
  }),
})
export type BirthCert = z.infer<typeof BirthCertSchema>

export type LegacyBirthCertWithPlanLock = BirthCert & {
  planLock?: unknown
}

// ───────── 路径 ─────────

export function getWorkFilePath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), WORK_FILE)
}

export function workFileExists(projectRoot: string, workName: string): boolean {
  return existsSync(getWorkFilePath(projectRoot, workName))
}

// ───────── I/O ─────────

export type ReadResult =
  | { ok: true; cert: BirthCert }
  | { ok: false; reason: 'missing' }
  | { ok: false; reason: 'parse-error' | 'schema-mismatch'; errors: string[] }

/**
 * 读取旧 .work 文件（向后兼容；RFC-0033 D5：.work 不再新建，仅读旧文件）
 * - 文件不存在 → { ok:false, reason:'missing' }
 * - JSON parse 失败 → { ok:false, reason:'parse-error' }
 * - schema 不匹配（含旧 planLock 字段）→ { ok:false, reason:'schema-mismatch' }（旧 planLock 静默剥除）
 */
export function readWorkFile(projectRoot: string, workName: string): ReadResult {
  const path = getWorkFilePath(projectRoot, workName)
  if (!existsSync(path)) return { ok: false, reason: 'missing' }
  let content: string
  try {
    content = readFileSync(path, 'utf-8')
  } catch (err) {
    return { ok: false, reason: 'parse-error', errors: [String(err)] }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    return { ok: false, reason: 'parse-error', errors: [`JSON parse: ${String(err)}`] }
  }
  const result = BirthCertSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, reason: 'schema-mismatch', errors: result.error.issues.map((i) => i.message) }
  }
  return { ok: true, cert: result.data }
}

/**
 * 🗑️ RFC-0033 D5：writeWorkFile 已退役 — 不再写 .work 文件
 *
 * @deprecated Work 不再产生 .work 单文件；assets 改运行时读 work.md ## Use。
 *             调用方迁移到运行时解析 work.md（参见 work-context-builder.buildWorkContext）。
 *
 * 本函数保留为 no-op stub 仅为向后兼容旧调用方编译通过；
 * 调用方应迁移到不再依赖 .work 文件存在。
 */
export function writeWorkFile(_projectRoot: string, _workName: string, _cert: BirthCert): void {
  // No-op (RFC-0033 D5): .work file no longer written.
  // Runtime reads assets from work.md ## Use section (single source of truth).
}

/**
 * 删除 .work 文件（向后兼容 cleanup）
 * - RFC-0033 D5: 新建 Work 不再产生 .work 文件；此函数仅清理遗留 .work
 */
export function clearWorkFile(projectRoot: string, workName: string): void {
  const path = getWorkFilePath(projectRoot, workName)
  if (existsSync(path)) unlinkSync(path)
}

/**
 * 🗑️ RFC-0033 D5：CreateBirthCertParams + createBirthCert 已退役
 *
 * @deprecated Work 不再产生 .work 单文件；assets 改运行时读 work.md ## Use。
 *             调用方迁移：解析 work.md → 读取 Blueprint ## Use 段 → 构造运行期资产视图。
 */
export interface CreateBirthCertParams {
  workName: string
  goal?: string
  constraints?: string[]
  maxIterations?: number
  assets: {
    blueprints: Array<{
      name: string
      version: number
      fileHash: string
      domainRefs?: BoundaryRefEntry[]
      workflowRefs?: BoundaryRefEntry[]
      stackRefs?: BoundaryRefEntry[]
    }>
  }
  createdAt?: string
}

/**
 * @deprecated RFC-0033 D5: createBirthCert no longer creates valid new .work files.
 *             Return value is still BirthCert-shaped for backward compatibility, but
 *             writing it via writeWorkFile() is a no-op. Use runtime work.md parsing instead.
 */
export function createBirthCert(params: CreateBirthCertParams): BirthCert {
  const now = params.createdAt ?? new Date().toISOString()
  return {
    schemaVersion: 1,
    kind: 'work-birth-cert',
    workName: params.workName,
    createdAt: now,
    updatedAt: now,
    goal: params.goal ?? '',
    constraints: params.constraints ?? [],
    maxIterations: params.maxIterations ?? 3,
    assets: {
      blueprints: params.assets.blueprints.map((b) => ({
        name: b.name,
        version: b.version,
        fileHash: b.fileHash,
        domainRefs: b.domainRefs ?? [],
        workflowRefs: b.workflowRefs ?? [],
        stackRefs: b.stackRefs ?? [],
      })),
    },
  }
}

// ───────── 校验 ─────────
//
// 🗑️ RFC-0033 D2: verifyPlanLock / applyPlanLock / clearPlanLock 全部删除（PlanLock 退役）
//   - work.md 可自由修改（submit 时 hash + DRIFT 事件，不阻断）
//
// ───────── 复用 hashPort 校验：assets 是否漂了（仅供遗留 .work 检查）─────────

/**
 * 校验旧 .work 中的 assets 锁（仅供 legacy .work 读取后检查）
 * - .work 退役后基本不再使用；保留供老 Work 调试
 */
export interface AssetDrift {
  domain: Array<{ name: string; expected: string; actual: string | null }>
  blueprint: Array<{ name: string; expected: string; actual: string | null }>
}

export function checkAssetsDrift(
  cert: BirthCert,
  resolveAssetPath: (kind: 'domain' | 'blueprint', name: string) => string | null,
): AssetDrift {
  const out: AssetDrift = { domain: [], blueprint: [] }
  for (const b of cert.assets.blueprints) {
    const filePath = resolveAssetPath('blueprint', b.name)
    if (!filePath) {
      out.blueprint.push({ name: b.name, expected: b.fileHash, actual: null })
      continue
    }
    const current = hashFileOrNull(filePath)
    if (current !== b.fileHash) {
      out.blueprint.push({ name: b.name, expected: b.fileHash, actual: current })
    }
  }
  return out
}

function hashFileOrNull(filePath: string): string | null {
  if (!existsSync(filePath)) return null
  try {
    return hashPort.computeHash(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}
