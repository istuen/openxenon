import { existsSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import type { WorkDeclaration } from '../oxl'
import { getWorkMdPath, getWorkGatePath, getTaskOxnPath } from './dual-state-io'
import { validatePathScope, type Scope } from '../Asset/scope-matcher'
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
import { findBoundaryAssetFile, parseStackTools } from './work-context-builder'

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
 * 🆕 v0.7.3 P7 (RFC §4 P7 + ADR-0061 §D6):
 * Work `## Refs` 旧 `kind: domain` 软警告条目。
 *
 * 语义：
 *   - ADR-0055 已规定 Work `## Refs` 只接受 `kind: blueprint`
 *   - v0.7.3 检测到 `kind: domain` 触发 `OXN_WORK_LEGACY_DOMAIN_REF` 软警告（不阻断 lock）
 *   - v0.8.0 升级为硬阻断（本 RFC 不实现）
 */
export interface LegacyDomainRef {
  /** ref 名 (= H3 文本) */
  refName: string
  /** 完整 URI 引用 (如 @prj/domains/X) */
  ref: string | null
  /** 迁移建议（指向 Blueprint ## Use） */
  suggestion: string
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
  /** 🆕 v0.7.3 P7 (ADR-0061 §D6): Work `## Refs` 旧 `kind: domain` 软警告条目 */
  legacyDomainRefs?: LegacyDomainRef[]
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

// =============================================================================
// 🆕 v0.7+ (RFC §6 PlanLock 5-hash): Task ## Artifacts ⊆ Blueprint ## Scope 校验
// 来源：design-blueprint-context-template Draft（2026-08-06 grilling）
//       oxn-work-domain inv-35 (artifacts-within-scope)
// =============================================================================

/**
 * 校验每个 Task ## Artifacts 段声明的预期产物路径是否符合 Blueprint ## Scope.allow / forbid。
 *
 * 行为：
 *   - 缺省 Scope（allow=[]） → 允许任意路径（向后兼容）
 *   - 任意 Artifact path 违反 → throw IAPError (YIELD_TO_HUMAN)
 *
 * 注：lock 时一次性校验；不新增 Probe。运行时使用现有 fs-exists / fs-no-exists 验证 Artifact 存在性。
 */
export function collectAndThrowScopeViolations(
  work: WorkDeclaration,
  projectRoot: string,
  workName: string,
  blueprintsIdx: PerWorkBlueprintsIndex,
): void {
  // 收集所有 Task 的 ArtifactDeclaration
  const tasksWithArtifacts: Array<{
    taskName: string
    blueprintName: string | undefined
    artifacts: Array<{ path: string; type: string }>
  }> = []

  for (const t of work.tasks ?? []) {
    const taskName = String(t.name)
    const taskFile = getTaskOxnPath(projectRoot, workName, taskName)
    if (!existsSync(taskFile)) continue
    const taskData = readTaskFile(taskFile)
    if (!taskData?.artifacts || taskData.artifacts.length === 0) continue
    tasksWithArtifacts.push({
      taskName,
      blueprintName: taskData.blueprint ?? t.blueprint ?? undefined,
      artifacts: taskData.artifacts,
    })
  }

  if (tasksWithArtifacts.length === 0) return // 无 ArtifactDeclaration 跳过校验

  // 为每个 Blueprint 构建 Scope map
  const scopeByBlueprint = new Map<string, Scope>()
  for (const bp of blueprintsIdx.blueprints) {
    if (bp.status !== 'ok') continue
    scopeByBlueprint.set(bp.name, {
      allow: bp.fileScope.allow,
      forbid: bp.fileScope.forbid,
      desc: bp.fileScope.desc,
    })
  }

  // 校验
  const violations: Array<{
    taskName: string
    blueprint: string
    artifactPath: string
    reason: string
  }> = []

  for (const { taskName, blueprintName, artifacts } of tasksWithArtifacts) {
    if (!blueprintName) {
      violations.push({
        taskName,
        blueprint: '(none)',
        artifactPath: artifacts[0]?.path ?? '',
        reason: 'task has no blueprint reference (cannot determine Scope)',
      })
      continue
    }
    const scope = scopeByBlueprint.get(blueprintName)
    if (!scope) {
      // Blueprint 不存在或 status=invalid；这种情况会在 unresolved 检查里捕获
      continue
    }
    for (const artifact of artifacts) {
      const result = validatePathScope(artifact.path, scope)
      if (!result.ok) {
        violations.push({
          taskName,
          blueprint: blueprintName,
          artifactPath: artifact.path,
          reason: result.reason,
        })
      }
    }
  }

  if (violations.length > 0) {
    throw new IAPError(
      'INTENT',
      'SCOPE_VIOLATION',
      IAPAction.YIELD_TO_HUMAN,
      `Task Artifacts violate Blueprint Scope: ${violations.length} violation(s). ` +
        violations.map((v) => `  - task "${v.taskName}" (${v.blueprint}): ${v.artifactPath} → ${v.reason}`).join('\n'),
      { violations, hint: 'see inv-35 (artifacts-within-scope)' },
    )
  }
}

// =============================================================================
// 🆕 v0.7.4 stack-operation-referent (RFC-0024 §实施 + design-stack-operation-followup Draft 2026-08-07):
//   slot.operate[] 引用校验（inv-27 operate-subset-stack-operations + inv-28 operation-disambiguation）
// =============================================================================

/**
 * 🆕 v0.7.4 stack-operation-referent (RFC-0024 §实施 + design-stack-operation-followup Draft 2026-08-07):
 * 校验每个 Blueprint slot.operate[] 项是否能在 Blueprint 引用的 Stack tool.operations 中解析。
 *
 * 行为：
 *   - 加载 Blueprint 引用的所有 Stack 文件 → 提取 tool.operations → 建 operationIndex
 *   - 校验每个 slot.operate[] 项：
 *     - 限定名 `tool:operation`：直接定位，跳过消歧；不在 → OPERATION_NOT_FOUND
 *     - 简单名：无候选 → OPERATION_NOT_FOUND；≥2 候选 → OPERATION_AMBIGUOUS
 *   - 任意 violation → throw IAPError (YIELD_TO_HUMAN)
 *
 * 与 ADR-0055 / RFC-0022 P4 一致：lock 时一次性校验，不新增 Probe。
 */
export function collectAndThrowOperateViolations(
  _work: WorkDeclaration,
  projectRoot: string,
  _workName: string,
  blueprintsIdx: PerWorkBlueprintsIndex,
): void {
  const violations: Array<{
    slot: string
    blueprint: string
    code: 'OPERATION_NOT_FOUND' | 'OPERATION_AMBIGUOUS'
    name: string
    candidates?: string[]
  }> = []

  // Step 1: 为每个 Blueprint 构建 operationIndex（Map<opName, Array<{stack, tool}>>）
  for (const bp of blueprintsIdx.blueprints) {
    if (bp.status !== 'ok') continue
    if (bp.slots.every((s) => (s.operate ?? []).length === 0)) continue
    // 无 Stack ref 时跳过校验（Blueprint 没声明 Stack，无法解析 operate）
    if (bp.stackRefs.length === 0) continue

    const operationIndex = new Map<string, Array<{ stack: string; tool: string }>>()
    for (const stackRef of bp.stackRefs) {
      const stackFilePath = findBoundaryAssetFile(projectRoot, 'stack', stackRef.name)
      if (!stackFilePath) continue
      const tools = parseStackTools(stackFilePath)
      if (!tools) continue
      for (const t of tools) {
        for (const op of t.operations ?? []) {
          const list = operationIndex.get(op.name) ?? []
          list.push({ stack: stackRef.name, tool: t.name })
          operationIndex.set(op.name, list)
        }
      }
    }

    // Step 2: 校验每个 slot.operate[] 项
    for (const slot of bp.slots) {
      for (const opName of slot.operate ?? []) {
        // 限定名 tool:operation 形式直接定位
        if (opName.includes(':')) {
          const [toolName, op] = opName.split(':', 2) as [string, string]
          const candidates = operationIndex.get(op) ?? []
          const matched = candidates.find((c) => c.tool === toolName)
          if (!matched) {
            violations.push({
              slot: slot.name,
              blueprint: bp.name,
              code: 'OPERATION_NOT_FOUND',
              name: opName,
            })
          }
          continue
        }
        // 简单名
        const candidates = operationIndex.get(opName) ?? []
        if (candidates.length === 0) {
          violations.push({
            slot: slot.name,
            blueprint: bp.name,
            code: 'OPERATION_NOT_FOUND',
            name: opName,
          })
        } else if (candidates.length > 1) {
          violations.push({
            slot: slot.name,
            blueprint: bp.name,
            code: 'OPERATION_AMBIGUOUS',
            name: opName,
            candidates: candidates.map((c) => `${c.tool}:${opName}`),
          })
        }
      }
    }
  }

  if (violations.length === 0) return

  const lines = violations.map((v) => {
    if (v.code === 'OPERATION_NOT_FOUND') {
      return `  - blueprint "${v.blueprint}" slot "${v.slot}": operate "${v.name}" not found in Stack tool.operations`
    }
    return `  - blueprint "${v.blueprint}" slot "${v.slot}": operate "${v.name}" ambiguous (${v.candidates!.join(', ')}); use qualified name like ${v.candidates![0]}`
  })

  throw new IAPError(
    'INTENT',
    violations.some((v) => v.code === 'OPERATION_NOT_FOUND') ? 'OPERATION_NOT_FOUND' : 'OPERATION_AMBIGUOUS',
    IAPAction.YIELD_TO_HUMAN,
    `Blueprint slot.operate[] reference invalid: ${violations.length} violation(s).\n${lines.join('\n')}`,
    { violations },
  )
}

// =============================================================================
// 🆕 v0.7.3 P7 (RFC §4 P7 + ADR-0061 §D6):
//   Work `## Refs` 旧 `kind: domain` deprecation warn（不阻断 lock）
// =============================================================================

/**
 * 🆕 v0.7.3 P7 (ADR-0061 §D6):
 * 检测 Work `## Refs` 中的 legacy `kind: domain` 条目。
 *   - ADR-0055 已规定 Work `## Refs` 只接受 `kind: blueprint`
 *   - v0.7.3 软警告（不阻断 lock）；v0.8.0 升级为硬阻断（本 RFC 不实现）
 *   - 返回每条 legacy ref 的 refName / ref / suggestion
 *   - 空 refs 或无 legacy → 返回 []
 *
 * Note：此 helper 仅看 `work.refs[]`（Work 级 Refs），不影响 task 级 `domain` 字段
 * （task 级 domain 是当前合法字段；ADR-0055 §D2 仅限制 Work 级 refs 格式）
 */
export function detectLegacyDomainRefs(work: WorkDeclaration): LegacyDomainRef[] {
  const refs = (work as { refs?: Array<{ kind?: string; name?: string; ref?: string }> }).refs ?? []
  const out: LegacyDomainRef[] = []
  for (const r of refs) {
    if (r.kind !== 'domain') continue
    out.push({
      refName: r.name ?? '(unknown)',
      ref: typeof r.ref === 'string' ? r.ref : null,
      suggestion:
        'Move to Blueprint ## Use ## X - kind: domain - ref: ' +
        (typeof r.ref === 'string' ? r.ref : (r.name ?? '...')),
    })
  }
  return out
}

/**
 * 🆕 v0.7.3 P7 (ADR-0061 §D6):
 * 把 legacy domain refs 列表转换为 warning 字符串数组。
 *   - 格式：`OXN_WORK_LEGACY_DOMAIN_REF: <refName> "kind: domain" is deprecated since v0.6.1; v0.8.0 will hard-block. <suggestion>`
 *   - 0 legacy → 返回 []
 */
export function legacyDomainRefsToWarnings(entries: LegacyDomainRef[]): string[] {
  return entries.map(
    (e) =>
      `OXN_WORK_LEGACY_DOMAIN_REF: ref "${e.refName}"${e.ref ? ` (${e.ref})` : ''} uses deprecated "kind: domain" (ADR-0055 §D2). ` +
      `v0.7.3 only warns; v0.8.0 will hard-block. ${e.suggestion}`,
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

  // 🆕 v0.7+ Blueprint Context Template: Task ## Artifacts ⊆ Blueprint ## Scope 校验（inv-35）
  //   - lock 时一次性校验；不新增 Probe
  //   - 缺省 Scope（allow=[]） → 允许任意路径（向后兼容）
  collectAndThrowScopeViolations(work, projectRoot, workName, blueprintsIdx)

  // 🆕 v0.7.4 stack-operation-referent (RFC-0024 §实施): slot.operate[] 引用校验
  //   - inv-27: operate 名 ⊆ Blueprint 引用 Stack tool.operations
  //   - inv-28: 多 tool 同名 → OPERATION_AMBIGUOUS（要求限定名）
  //   - lock 时一次性校验；不新增 Probe
  collectAndThrowOperateViolations(work, projectRoot, workName, blueprintsIdx)

  // 🆕 v0.7.3 P7 (ADR-0061 §D6): Work ## Refs 旧 kind: domain 软警告
  //   - 不阻断 artifacts 写入（仅 push warning + structured entry）
  //   - v0.8.0 升级为 hard-block（本 RFC 不实现）
  const legacyDomainRefs = detectLegacyDomainRefs(work)
  for (const w of legacyDomainRefsToWarnings(legacyDomainRefs)) warnings.push(w)

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
    ...(legacyDomainRefs.length > 0 ? { legacyDomainRefs } : {}),
  }
}
