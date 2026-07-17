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

/**
 * 🆕 v0.7.3 P5 (RFC §4 P5 + ADR-0061 §D4):
 * Task DAG ⊆ Blueprint slot DAG 拓扑闭包校验的违规项。
 *
 * 语义：
 *   - task A 在 boundary slot S_a
 *   - task A.deps[i] 引用 dep D（task 名或 slot 名）
 *   - 解析 D → slot S_d
 *   - 若 S_d ∉ ancestors(S_a) ∪ {S_a} → 违规
 */
export interface DagClosureViolation {
  taskName: string
  /** Task 对齐的 slot（boundary），空字符串表示 task 无 boundary */
  boundary: string
  /** dep 名（task 名或 slot 名） */
  depName: string
  /** dep 解析到的 slot 名（unknown 时为空字符串） */
  depResolvedSlot: string
  /** 任务 slot 的祖先集合（slot DAG 拓扑闭包） */
  taskSlotAncestors: string[]
  reason: 'dep_unknown' | 'dep_slot_not_in_task_slot_closure' | 'task_has_no_boundary'
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

// =============================================================================
// 🆕 v0.7.3 P5 (RFC §4 P5 + ADR-0061 §D4):
//   Task DAG ⊆ Blueprint slot DAG 拓扑闭包校验
// =============================================================================

/**
 * 🆕 v0.7.3 P5:
 * 从 blueprints index 构建 slot DAG：slotName → direct deps（合并所有 Blueprint）。
 * 多个 Blueprint 同名 slot 时，最后一个 Blueprint 覆盖（实践中 Blueprint 各自有独立命名空间）。
 */
export function buildSlotDAG(blueprintsIdx: PerWorkBlueprintsIndex): Map<string, string[]> {
  const dag = new Map<string, string[]>()
  for (const bp of blueprintsIdx.blueprints) {
    for (const s of bp.slots) {
      dag.set(s.name, [...s.deps])
    }
  }
  return dag
}

/**
 * 🆕 v0.7.3 P5:
 * 计算 slot 的所有祖先（slot DAG 拓扑闭包，DFS 防环）。
 * - ancestors(S) = { S' : 存在 S→S1→...→S' 的路径, S' ≠ S }
 * - 不含 S 自身（语义：A 的祖先不含 A）。
 * - 检测到环 → 不死循环（visited 守护）
 */
export function computeSlotAncestors(slotName: string, slotDag: Map<string, string[]>): Set<string> {
  const ancestors = new Set<string>()
  const visited = new Set<string>()
  const stack = [slotName]
  while (stack.length > 0) {
    const cur = stack.pop()!
    if (visited.has(cur)) continue
    visited.add(cur)
    const deps = slotDag.get(cur) ?? []
    for (const d of deps) {
      // 排除自身（A 不应是 A 的祖先）
      if (d === slotName) continue
      if (!ancestors.has(d)) {
        ancestors.add(d)
        stack.push(d)
      }
    }
  }
  return ancestors
}

/**
 * 🆕 v0.7.3 P5 (ADR-0061 §D4):
 * 校验 work 所有 task 的 deps 是否符合 slot DAG 拓扑闭包约束。
 *
 * 规则：
 *   - dep 可能是 task 名（解析到该 task 的 boundary slot）
 *   - dep 也可能是 slot 名（直接用）
 *   - task 的 deps[i] 解析到的 slot S_d 必须 ∈ ancestors(task.boundary) ∪ {task.boundary}
 *     （同 slot 内的 task 可互相依赖；跨 slot 必须严格遵守 slot DAG）
 *
 * 返回：
 *   - 全通过 → { ok: true }
 *   - 任一违规 → { ok: false, violations }
 *   - 无 boundary / 无 deps 的 task → 跳过（不产生违规）
 */
export function checkTaskDepsClosure(
  work: WorkDeclaration,
  blueprintsIdx: PerWorkBlueprintsIndex,
): { ok: true } | { ok: false; violations: DagClosureViolation[] } {
  const slotDag = buildSlotDAG(blueprintsIdx)

  // task name → task slot name (via boundary)
  const taskSlotMap = new Map<string, string>()
  for (const t of work.tasks ?? []) {
    const tn = (t as { name: string }).name
    const tb = (t as { boundary?: string }).boundary
    if (tb) taskSlotMap.set(tn, tb)
  }
  // slot name → self（让 deps 可直接引用 slot 名）
  for (const slotName of slotDag.keys()) {
    taskSlotMap.set(slotName, slotName)
  }

  const violations: DagClosureViolation[] = []
  for (const t of work.tasks ?? []) {
    const tn = (t as { name: string }).name
    const tb = (t as { boundary?: string }).boundary
    const deps = (t as { deps?: string[] }).deps ?? []

    if (deps.length === 0) continue
    if (!tb) {
      // task 有 deps 但无 boundary → 无法判断依赖闭包
      violations.push({
        taskName: tn,
        boundary: '',
        depName: deps[0]!,
        depResolvedSlot: '',
        taskSlotAncestors: [],
        reason: 'task_has_no_boundary',
      })
      continue
    }

    const ancestors = computeSlotAncestors(tb, slotDag)
    const validSlots = new Set<string>([...ancestors, tb])

    for (const dep of deps) {
      const depSlot = taskSlotMap.get(dep)
      if (!depSlot) {
        violations.push({
          taskName: tn,
          boundary: tb,
          depName: dep,
          depResolvedSlot: '',
          taskSlotAncestors: [...ancestors],
          reason: 'dep_unknown',
        })
        continue
      }
      if (!validSlots.has(depSlot)) {
        violations.push({
          taskName: tn,
          boundary: tb,
          depName: dep,
          depResolvedSlot: depSlot,
          taskSlotAncestors: [...ancestors],
          reason: 'dep_slot_not_in_task_slot_closure',
        })
      }
    }
  }

  if (violations.length === 0) return { ok: true }
  return { ok: false, violations }
}

/**
 * 🆕 v0.7.3 P5 (ADR-0061 §D4):
 * 收集 work 所有 task DAG 闭包违规；至少 1 violation → throw IAPError(INTENT, TASK_DAG_VIOLATES_SLOT)。
 *
 * 跳过机制（escape hatch）：
 *   - opts.skip === true → 整个函数跳过（无 throw），便于历史 Work 渐进迁移
 *   - CLI 通过 `--skip-workflow-dag-check` flag 传递
 */
export function collectAndThrowDagClosureViolations(
  work: WorkDeclaration,
  blueprintsIdx: PerWorkBlueprintsIndex,
  opts?: { skip?: boolean },
): void {
  if (opts?.skip) return

  const result = checkTaskDepsClosure(work, blueprintsIdx)
  if (result.ok) return

  throw new IAPError(
    'INTENT',
    'TASK_DAG_VIOLATES_SLOT',
    IAPAction.YIELD_TO_HUMAN,
    `Task DAG must be subset of Workflow slot DAG topological closure: ${result.violations.length} violation(s). ` +
      'Each task.deps must resolve to a slot in the task boundary slot ancestors (or itself). ' +
      'Use --skip-workflow-dag-check to bypass this check (legacy works only).',
    { violations: result.violations, skipped: opts?.skip ?? false },
  )
}

export async function validateAndWriteArtifacts(params: {
  projectRoot: string
  workName: string
  work: WorkDeclaration
  missingTaskOxn: string[]
  /** 🆕 v0.7.3 P5 (ADR-0061 §D4): escape hatch，跳过 Workflow slot DAG 闭包校验 */
  skipDagCheck?: boolean
}): Promise<ValidateArtifactsResult> {
  const { projectRoot, workName, work, missingTaskOxn, skipDagCheck } = params
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

  // 🆕 v0.7.3 P5 (ADR-0061 §D4): Task DAG ⊆ Workflow slot DAG 拓扑闭包 hard-check
  //   task.deps 必须 ∈ task.boundary 的祖先集合 ∪ {boundary 自身}
  //   escape hatch: skipDagCheck=true 时跳过（仅供历史 Work 渐进迁移）
  collectAndThrowDagClosureViolations(work, blueprintsIdx, { skip: skipDagCheck })

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
