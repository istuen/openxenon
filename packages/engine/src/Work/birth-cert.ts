// =============================================================================
// birth-cert.ts — PR-2
//
// `.work` 静态门禁卡：CLI 写的单 JSON 文件，记录 Work 的「出生证明」与
// 计划锁（planLock）。AI 禁止直接改；只能读 `oxn work status` / `context` 间接看。
//
// 物理位置：.openxenon/works/<w>/.work  （单文件，不是目录）
//
// 关键设计：
//   - assets: 资产锁（domain/blueprint 引用 + 版本 + 当前文件 hash），
//     漂移即"资产版本变了但 work.oxn 没改"，是反常信号
//   - planLock: 锁时算 4 组件 hash；后续 run/context/submit 都用 verifyPlanLock 校验
//   - 不可变：planLock 设上后只能走 unlock → edit → re-validate → re-lock；
//     verifyPlanLock 是唯一"判定被改"的途径，不靠 chmod（跨平台安全）
//   - v0.7：删除 mode/editTarget 字段（实际行为零影响，Blueprint 已承载差异）
// =============================================================================

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'path'
import { z } from 'zod'
import { hashPort } from '@openxenon/engine/infra/hash'
import { WORK_FILE } from '@openxenon/engine/kernel'
import { getWorkDir } from './dual-state-io'
import { hashWorkPlan, type PlanHash } from './plan-hash'

// ───────── Zod schema ─────────

export const DomainAssetEntrySchema = z.object({
  name: z.string().min(1),
  scope: z.enum(['@oxn', '@prj']).default('@prj'),
  version: z.number().int().min(1).default(1),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/, 'fileHash must be sha256 hex'),
})
export type DomainAssetEntry = z.infer<typeof DomainAssetEntrySchema>

/**
 * 🆕 v0.6.1-alpha.3: 边界资产 slim entry（domain / workflow / stack 共用）
 * 在 Blueprint composition 模式下，Blueprint 的 ## Refs 引用这 3 种边界；
 * 每个 boundaryRef 在 BirthCert 中记录 name + scope + fileHash。
 */
export const BoundaryRefEntrySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['domain', 'workflow', 'stack']).default('domain'),
  scope: z.enum(['@oxn', '@prj']).default('@prj'),
  version: z.number().int().min(1).default(1),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/, 'fileHash must be sha256 hex'),
})
export type BoundaryRefEntry = z.infer<typeof BoundaryRefEntrySchema>

/**
 * 🆕 v0.6.1-alpha.3 Phase 1: Blueprint asset entry 扩展，含 3 边界引用。
 * 语义：Blueprint 不只是自身 fileHash，还通过 ## Refs 引用 3 边界；
 * 这些边界 hash 在 planLock 中被 hash 进去（drift 检测）。
 */
export const BlueprintAssetEntrySchema = z.object({
  name: z.string().min(1),
  version: z.number().int().min(1).default(1),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/, 'fileHash must be sha256 hex'),
  // 🆕 Blueprint 组合的 3 边界 refs（从 Blueprint ## Refs 提取）
  domainRefs: z.array(BoundaryRefEntrySchema).default([]),
  workflowRefs: z.array(BoundaryRefEntrySchema).default([]),
  stackRefs: z.array(BoundaryRefEntrySchema).default([]),
})
export type BlueprintAssetEntry = z.infer<typeof BlueprintAssetEntrySchema>

export const PlanLockSchema = z.object({
  lockedAt: z.string().min(1),
  workOxnHash: z.string().regex(/^[0-9a-f]{64}$/),
  workDomainsHash: z.string().regex(/^[0-9a-f]{64}$/),
  blueprintsHash: z.string().regex(/^[0-9a-f]{64}$/),
  tasksHash: z.string().regex(/^[0-9a-f]{64}$/),
  // PR-13: allHash 必填（v1.1 锁时必含；旧 v1.0 .work 无此字段兼容为 optional）
  allHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
})
export type PlanLock = z.infer<typeof PlanLockSchema>

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
    domains: z.array(DomainAssetEntrySchema).default([]),
    blueprints: z.array(BlueprintAssetEntrySchema).default([]),
  }),
  planLock: PlanLockSchema.nullable().default(null),
})
export type BirthCert = z.infer<typeof BirthCertSchema>

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
 * 原子写 .work（.tmp + rename）
 */
export function writeWorkFile(projectRoot: string, workName: string, cert: BirthCert): void {
  const path = getWorkFilePath(projectRoot, workName)
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmpPath = `${path}.tmp`
  writeFileSync(tmpPath, JSON.stringify(cert, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

/**
 * 删除 .work（unlock 后仍保留 birth cert；只清 planLock。
 * 真正的 delete 在 work 整个被 destroy 时用，PR-10 引入）。
 */
export function clearWorkFile(projectRoot: string, workName: string): void {
  const path = getWorkFilePath(projectRoot, workName)
  if (existsSync(path)) unlinkSync(path)
}

// ───────── Builders ─────────

export interface CreateBirthCertParams {
  workName: string
  goal?: string
  constraints?: string[]
  maxIterations?: number
  assets: {
    domains: Array<{ name: string; scope?: '@oxn' | '@prj'; version: number; fileHash: string }>
    blueprints: Array<{
      name: string
      version: number
      fileHash: string
      // 🆕 Phase 1: Blueprint 组合的 3 边界 refs（可选；work-validator 当前不填，per-work merger 已包含在 blueprints.json）
      domainRefs?: BoundaryRefEntry[]
      workflowRefs?: BoundaryRefEntry[]
      stackRefs?: BoundaryRefEntry[]
    }>
  }
  createdAt?: string
}

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
      domains: params.assets.domains.map((d) => ({
        name: d.name,
        scope: d.scope ?? '@prj',
        version: d.version,
        fileHash: d.fileHash,
      })),
      blueprints: params.assets.blueprints.map((b) => ({
        name: b.name,
        version: b.version,
        fileHash: b.fileHash,
        domainRefs: b.domainRefs ?? [],
        workflowRefs: b.workflowRefs ?? [],
        stackRefs: b.stackRefs ?? [],
      })),
    },
    planLock: null,
  }
}

/**
 * 设定 planLock（输入的 hash 必须完整；调用方先用 hashWorkPlan 算出）
 */
export function applyPlanLock(cert: BirthCert, hash: PlanHash, lockedAt?: string): BirthCert {
  if (
    hash.workOxnHash === null ||
    hash.workDomainsHash === null ||
    hash.blueprintsHash === null ||
    hash.tasksHash === null ||
    hash.allHash === null
  ) {
    throw new Error(`cannot apply planLock: incomplete plan hash (missing: ${hash.missing.join(', ')})`)
  }
  return {
    ...cert,
    updatedAt: lockedAt ?? new Date().toISOString(),
    planLock: {
      lockedAt: lockedAt ?? new Date().toISOString(),
      workOxnHash: hash.workOxnHash,
      workDomainsHash: hash.workDomainsHash,
      blueprintsHash: hash.blueprintsHash,
      tasksHash: hash.tasksHash,
      allHash: hash.allHash,
    },
  }
}

export function clearPlanLock(cert: BirthCert, updatedAt?: string): BirthCert {
  return { ...cert, updatedAt: updatedAt ?? new Date().toISOString(), planLock: null }
}

// ───────── 校验 ─────────

export type VerifyResult =
  | { ok: true }
  | {
      ok: false
      reason: 'no-plan-lock' | 'work-removed' | 'hash-mismatch'
      component?: 'workOxn' | 'workDomains' | 'blueprints' | 'tasks'
      expected?: string
      actual?: string
      message: string
    }

/**
 * 校验 .work.planLock 与当前文件系统 hash 是否一致。
 *
 * 三种 fail 原因：
 *   - no-plan-lock    ：cert.planLock === null（未锁）
 *   - work-removed    ：work 目录被删 / work.oxn 失踪
 *   - hash-mismatch   ：work 已锁但内容被改，component 指明哪个文件
 */
export function verifyPlanLock(projectRoot: string, workName: string, cert: BirthCert): VerifyResult {
  if (cert.planLock === null) {
    return { ok: false, reason: 'no-plan-lock', message: 'work has no planLock set' }
  }
  const current = hashWorkPlan(projectRoot, workName)

  if (current.workOxnHash === null) {
    return {
      ok: false,
      reason: 'work-removed',
      message: 'work.oxn not found (work directory may be deleted)',
    }
  }
  if (current.workOxnHash !== cert.planLock.workOxnHash) {
    return {
      ok: false,
      reason: 'hash-mismatch',
      component: 'workOxn',
      expected: cert.planLock.workOxnHash,
      actual: current.workOxnHash,
      message: 'work.oxn has been modified after lock',
    }
  }
  if (current.workDomainsHash !== null && current.workDomainsHash !== cert.planLock.workDomainsHash) {
    return {
      ok: false,
      reason: 'hash-mismatch',
      component: 'workDomains',
      expected: cert.planLock.workDomainsHash,
      actual: current.workDomainsHash,
      message: 'works/<w>/domains.json has been modified after lock',
    }
  }
  if (current.blueprintsHash !== null && current.blueprintsHash !== cert.planLock.blueprintsHash) {
    return {
      ok: false,
      reason: 'hash-mismatch',
      component: 'blueprints',
      expected: cert.planLock.blueprintsHash,
      actual: current.blueprintsHash,
      message: 'works/<w>/blueprints.json has been modified after lock',
    }
  }
  if (current.tasksHash !== null && current.tasksHash !== cert.planLock.tasksHash) {
    return {
      ok: false,
      reason: 'hash-mismatch',
      component: 'tasks',
      expected: cert.planLock.tasksHash,
      actual: current.tasksHash,
      message: 'one or more tasks/<t>/task.oxn have been modified after lock',
    }
  }
  return { ok: true }
}

// ───────── 复用 hashPort 校验：assets 是否漂了（独立于 planLock）─────────

/**
 * 校验 assets 锁：比较 .work.assets[].fileHash 与当前文件 hash。
 * 不一致 → 资产漂了（可能 work.oxn 没改但底层 .oxn 改了）。
 *
 * 与 planLock 不同：planLock 防 work.oxn 改；assets 防依赖的 .oxn 改。
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
  for (const d of cert.assets.domains) {
    const filePath = resolveAssetPath('domain', d.name)
    if (!filePath) {
      out.domain.push({ name: d.name, expected: d.fileHash, actual: null })
      continue
    }
    const current = hashFileOrNull(filePath)
    if (current !== d.fileHash) {
      out.domain.push({ name: d.name, expected: d.fileHash, actual: current })
    }
  }
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
