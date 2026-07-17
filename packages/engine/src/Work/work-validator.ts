import { existsSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import type { WorkDeclaration } from '../oxl'
import { getWorkMdPath, getWorkGatePath, getTaskOxnPath } from './dual-state-io'
// 🆕 v0.6.1-alpha.4 Phase B: 删 buildPerWorkDomainsIndex/writePerWorkDomainsIndex/getPerWorkDomainsJsonPath import
import {
  buildPerWorkBlueprintsIndex,
  writePerWorkBlueprintsIndex,
  getPerWorkBlueprintsJsonPath,
  type PerWorkBlueprintsIndex,
} from './per-work-blueprints-merger'
import {
  createBirthCert,
  readWorkFile as readBirthCert,
  writeWorkFile,
  type BirthCert,
  type BlueprintAssetEntry,
} from './birth-cert'
import { hashFile } from './plan-hash'
import { readTaskFile } from '../oxl/summary-extractors'
import { IAPError, IAPAction } from '../kernel'

interface UnresolvedRef {
  kind: 'blueprint' // 🆕 Phase B: 删 domain（Domain 引用走 Blueprint ## Refs）
  name: string
  ref: string | null
  reason: string
}

export interface ProbeBoundaryViolation {
  taskName: string
  boundary: string
  probeName: string
  probeRef: string | null
  allowedObserved: string[]
}

export interface ValidateArtifactsResult {
  ok: boolean
  artifacts?: {
    // 🆕 Phase B: 删 domainsJsonPath
    blueprintsJsonPath: string
    workFilePath: string
    // 🆕 Phase B: 删 domains 计数
    assetCounts: { blueprints: number; tasks: number }
  }
  unresolved?: UnresolvedRef[]
  /** 🆕 v0.7.3 P4 (ADR-0061 §D3): probe 越界 violations（不阻断 lock，仅记录） */
  probeViolations?: ProbeBoundaryViolation[]
  warnings: string[]
}

/**
 * 🆕 v0.7.3 P4 (RFC §4 P4 + ADR-0061 §D3):
 * 把 `@oxn/probes/<name>` 或 `<name>` 解析为 probe name。
 *   - ref 形如 `@oxn/probes/lint-check` → name = `lint-check`
 *   - ref 形如 `@oxn/probe/lint-check` → name = `lint-check`（单数兼容）
 *   - 无 ref → 返回 name 本身
 */
export function extractProbeName(name: string, ref: string | undefined): string {
  if (ref) {
    const m = ref.match(/^@oxn\/probes?\/([^/]+)$/)
    if (m) return m[1]!
  }
  return name
}

/**
 * 🆕 v0.7.3 P4 (ADR-0061 §D3):
 * 找到 task 对齐的 Blueprint slot（按 boundary 名匹配）。
 *   - task.boundary 与 slot.name 相等 → 命中
 *   - blueprint 多个 boundary refs 中找 task blueprint 对应的那个
 *   - 找不到 → null（跳过校验，记录 warning）
 */
export function findSlotForTask(
  taskBoundary: string | undefined,
  taskBlueprint: string | undefined,
  blueprintsIdx: PerWorkBlueprintsIndex,
): { slot: { name: string; observe: string[]; deps: string[] } | null; blueprintName: string | null } {
  if (!taskBoundary) return { slot: null, blueprintName: taskBlueprint ?? null }
  // 找到 task 对齐的 blueprint
  const bp = blueprintsIdx.blueprints.find((b) => b.name === taskBlueprint) ?? blueprintsIdx.blueprints[0]
  if (!bp) return { slot: null, blueprintName: taskBlueprint ?? null }
  const slot = bp.slots.find((s) => s.name === taskBoundary)
  return { slot: slot ?? null, blueprintName: bp.name }
}

/**
 * 🆕 v0.7.3 P4 (ADR-0061 §D3):
 * 校验 task 全部 probes（含 parts[].probes 和顶层 ## Probes）是否在 slot.observe[] 内。
 *   - 全部命中 → { ok: true }
 *   - 任一越界 → { ok: false, violations: [...] }
 *   - 无 slot / 无 probes → { ok: true }（无内容校验）
 */
export function checkTaskProbesAgainstBoundary(
  taskName: string,
  taskBoundary: string | undefined,
  taskBlueprint: string | undefined,
  projectRoot: string,
  workName: string,
  blueprintsIdx: PerWorkBlueprintsIndex,
): { ok: true } | { ok: false; violations: ProbeBoundaryViolation[] } {
  // 无 boundary → 跳过校验
  if (!taskBoundary) return { ok: true }

  // 无 slot → 跳过（老 Work 兼容：warn 但不 throw）
  const { slot } = findSlotForTask(taskBoundary, taskBlueprint, blueprintsIdx)
  if (!slot) return { ok: true }

  // 无 observe 约束 → 全部 probe 都越界（除非 probe 也为空）
  const allowed = slot.observe ?? []

  // 读 task.md 提取 probes
  const taskFile = getTaskOxnPath(projectRoot, workName, taskName)
  if (!existsSync(taskFile)) return { ok: true }
  const taskData = readTaskFile(taskFile)
  if (!taskData) return { ok: true }

  const allProbes: Array<{ name: string; ref?: string }> = []
  for (const p of taskData.parts ?? []) {
    for (const pr of p.probes ?? []) allProbes.push(pr)
  }
  for (const pr of taskData.probes ?? []) allProbes.push(pr)

  if (allProbes.length === 0) return { ok: true }
  if (allowed.length === 0) {
    // slot 声明 observe=[] → 所有 probe 都越界
    return {
      ok: false,
      violations: allProbes.map((pr) => ({
        taskName,
        boundary: taskBoundary,
        probeName: pr.name,
        probeRef: pr.ref ?? null,
        allowedObserved: [],
      })),
    }
  }

  const allowedSet = new Set(allowed)
  const violations: ProbeBoundaryViolation[] = []
  for (const pr of allProbes) {
    const probeName = extractProbeName(pr.name, pr.ref)
    if (!allowedSet.has(probeName)) {
      violations.push({
        taskName,
        boundary: taskBoundary,
        probeName,
        probeRef: pr.ref ?? null,
        allowedObserved: allowed,
      })
    }
  }

  if (violations.length === 0) return { ok: true }
  return { ok: false, violations }
}

/**
 * 🆕 v0.7.3 P4 (ADR-0061 §D3):
 * 收集 work 所有 task 的 probe boundary violations。
 * 至少 1 violation → throw IAPError(INTENT, PROBE_OUT_OF_BOUNDARY, YIELD_TO_HUMAN)
 */
export function collectAndThrowProbeBoundaryViolations(
  work: WorkDeclaration,
  projectRoot: string,
  workName: string,
  blueprintsIdx: PerWorkBlueprintsIndex,
): void {
  const allViolations: ProbeBoundaryViolation[] = []
  const skippedTasks: Array<{ taskName: string; reason: string }> = []

  for (const t of work.tasks ?? []) {
    const taskName = (t as { name: string }).name
    const taskBoundary = (t as { boundary?: string }).boundary
    const taskBlueprint = (t as { blueprint?: string }).blueprint
    const result = checkTaskProbesAgainstBoundary(
      taskName,
      taskBoundary,
      taskBlueprint,
      projectRoot,
      workName,
      blueprintsIdx,
    )
    if (result.ok === false) {
      allViolations.push(...result.violations)
    }
    if (!taskBoundary) {
      skippedTasks.push({ taskName, reason: 'no boundary declared' })
    }
  }

  if (allViolations.length === 0) return

  throw new IAPError(
    'INTENT',
    'PROBE_OUT_OF_BOUNDARY',
    IAPAction.YIELD_TO_HUMAN,
    `Task probe(s) not in Blueprint slot observe[]: ${allViolations.length} violation(s). ` +
      'Either change probe to one declared in the Blueprint slot observe[], ' +
      'or remove probe (declare in skill_context instead).',
    { violations: allViolations, skippedTasks },
  )
}

export async function validateAndWriteArtifacts(params: {
  projectRoot: string
  workName: string
  work: WorkDeclaration
  missingTaskOxn: string[]
}): Promise<ValidateArtifactsResult> {
  const { projectRoot, workName, work, missingTaskOxn } = params
  const warnings: string[] = []

  const workMdPath = getWorkMdPath(projectRoot, workName)
  // 🆕 v0.6.1-alpha.4 Phase B: 删 buildPerWorkDomainsIndex 调用（Domain 引用走 Blueprint ## Refs）
  const blueprintsIdx = buildPerWorkBlueprintsIndex({ projectRoot, workName, workMdPath })

  const unresolved: UnresolvedRef[] = []
  // 🆕 Phase B: 删 domain invalid ref 收集（Domain 通过 Blueprint ## Refs 解析，drift 由 blueprint 覆盖）
  for (const b of blueprintsIdx.blueprints) {
    if (b.status === 'invalid') {
      unresolved.push({
        kind: 'blueprint',
        name: b.name,
        ref: b.ref,
        reason: b.errors[0] ?? 'invalid',
      })
    }
  }
  for (const t of missingTaskOxn) {
    unresolved.push({
      kind: 'blueprint',
      name: t,
      ref: null,
      reason: `task "${t}" declared in work.md but tasks/${t}/task.md missing`,
    })
  }

  if (unresolved.length > 0) {
    return { ok: false, unresolved, warnings }
  }

  // 🆕 v0.7.3 P4 (ADR-0061 §D3): Task probe vs Blueprint slot observe[] hard-check
  //   任一 probe 不在 observe → throw IAPError (YIELD_TO_HUMAN)
  //   阻塞 artifacts 写入（lock 必须先通过）
  collectAndThrowProbeBoundaryViolations(work, projectRoot, workName, blueprintsIdx)

  // 🆕 Phase B: 删 writePerWorkDomainsIndex 调用（不再写 domains.json）
  const blueprintsJsonPath = getPerWorkBlueprintsJsonPath(projectRoot, workName)
  writePerWorkBlueprintsIndex({
    projectRoot,
    workName,
    workMdPath,
    outPath: blueprintsJsonPath,
  })

  const existing = readBirthCert(projectRoot, workName)
  if (existing.ok && existing.cert.planLock !== null) {
    return {
      ok: false,
      warnings: [
        ...warnings,
        `work is locked (planLock.lockedAt=${existing.cert.planLock.lockedAt}); ` +
          `validate refuses to overwrite .work. Run \`oxn work unlock ${workName}\` first.`,
      ],
    }
  }

  // 🆕 Phase B: 删 domainAssets 构造（Domain 引用走 Blueprint ## Refs，由 blueprintAssets.domainRefs 携带）
  const blueprintAssets: BlueprintAssetEntry[] = blueprintsIdx.blueprints.map((b) => ({
    name: b.name,
    version: b.version,
    fileHash: hashFile(join(projectRoot, b.file)) ?? '',
    // 🆕 Phase B.5: 真实 fileHash 来自 parseBlueprintSlim（toSlim 调 resolveBoundaryAssetFile 算 hash）
    domainRefs: b.domainRefs ?? [],
    workflowRefs: b.workflowRefs ?? [],
    stackRefs: b.stackRefs ?? [],
  }))

  // 🆕 Phase B: 删 domainAssets 引用（仅 blueprintAssets 包含 Domain 引用 via blueprintAssets.domainRefs）
  for (const a of [...blueprintAssets]) {
    if (!/^[0-9a-f]{64}$/.test(a.fileHash)) {
      return {
        ok: false,
        warnings: [...warnings, `fileHash missing for ${a.name} (file unreadable after resolve)`],
      }
    }
  }

  const goal = work.context?.goal ?? ''
  const constraints = work.context?.constraints ?? []
  const maxIterations = (work as { loopPolicy?: { maxIterations?: number } }).loopPolicy?.maxIterations ?? 3

  const cert: BirthCert = createBirthCert({
    workName,
    goal,
    constraints,
    maxIterations,
    // 🆕 Phase B: 删 assets.domains（Domain 引用完全由 Blueprint ## Refs 承担）
    assets: { blueprints: blueprintAssets },
  })
  if (existing.ok) {
    cert.createdAt = existing.cert.createdAt
  }
  writeWorkFile(projectRoot, workName, cert)

  return {
    ok: true,
    artifacts: {
      // 🆕 Phase B: 删 domainsJsonPath（Domain 引用走 Blueprint ## Refs）
      blueprintsJsonPath,
      workFilePath: getWorkGatePath(projectRoot, workName),
      assetCounts: {
        // 🆕 Phase B: 删 domains 计数（Domain 引用走 Blueprint ## Refs）
        blueprints: blueprintAssets.length,
        tasks: (work.tasks ?? []).length,
      },
    },
    warnings,
  }
}
