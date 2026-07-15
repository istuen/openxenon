// =============================================================================
// evidence-collector.ts — 🆕 v0.6.1: Work 级 Proof 证据收集
//
// 5 个信任节点的集中收集（Work 终态时调用）：
//   节点 1（Intent）：work.md 的 goal + blueprint + constraints
//   节点 2（Intent→Align）：.work 的 planLock（hash 锁定）
//   节点 3（Align）：每个 Task 的 frozen.json（Probe 结果）+ trace.jsonl
//   节点 4（Align→Proof）：.run/state.json 的 tasks[] 状态 + Domain invariant 评估
//   节点 5（Proof）：汇总成 WorkEvidence → frozen.json + verdict.md
//
// 数据流：
//   节点 1+2：读 work.md（intake Goal/Blueprint）+ .work（BirthCert.planLock.allHash）
//   节点 3：读 .run/tasks/*/frozen.json（probeResults 数组）
//            + 从 Probe params 提取 artifact（产物路径）
//   节点 4：读 .run/state.json（tasks[] 状态）
//            + 评估 Domain invariant → boundaryViolations（沿用 infra/frozen/work-domains）
//   节点 5：汇总成 WorkEvidence → verdict-builder.ts 构建 verdict.md
// =============================================================================

import { readFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { readWorkFile } from '../Work/birth-cert'
import { getWorkStatePath, getTaskFrozenPath } from '../Work/dual-state-io'

/**
 * Work 级 Proof 证据——5 个节点汇总
 */
export interface WorkEvidence {
  // ─── 节点 1：Intent ───
  work: {
    name: string
    goal: string
    constraints: string[]
    blueprint: string // ## Use 段的 blueprint ref
    tasks: Array<{
      taskName: string
      boundary: string // 对应的 Blueprint Boundary
    }>
  }

  // ─── 节点 2：Intent→Align 衔接 ───
  planLock: {
    lockedAt: string
    workMdHash: string
    blueprintsHash: string
    tasksHash: string
    allHash: string
  }

  // ─── 节点 3：Align ───
  taskEvidence: Array<{
    taskName: string
    status: 'passed' | 'failed' | 'error'
    completedAt: string | null
    probes: Array<{
      probeName: string
      ref: string
      verdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
      passed: boolean
      errorMessage?: string
      durationMs: number
      artifact?: string // 从 Probe params 提取的产物路径
    }>
  }>

  // ─── 节点 4：Align→Proof 衔接 ───
  workState: {
    status: 'pending' | 'running' | 'passed' | 'failed' | 'error'
    finalVerdict: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'PENDING'
    completedAt: string
  }
  boundaryViolations: Array<{
    domain: string
    invariant: string
    verdict: string
    failureMessage?: string
  }>

  // ─── 节点 5：Proof（本函数产出，verdict-builder 消费）───
}

/**
 * 从各处收集信任链证据
 */
export function collectEvidence(projectRoot: string, workName: string): WorkEvidence {
  // ─── 节点 1：Intent ───
  // 读 work.md → goal / constraints / ## Use 段（blueprint ref + tasks）
  const workMdResult = readWorkMd(projectRoot, workName)
  const work = {
    name: workName,
    goal: workMdResult.goal,
    constraints: workMdResult.constraints,
    blueprint: workMdResult.blueprint,
    tasks: workMdResult.tasks,
  }

  // ─── 节点 2：Intent→Align 衔接 ───
  // 读 .work → planLock 的 4 个 hash
  const birthCertResult = readWorkFile(projectRoot, workName)
  const birthCert = birthCertResult.ok ? birthCertResult.cert : null
  const planLock = {
    lockedAt: birthCert?.planLock?.lockedAt ?? '',
    workMdHash: birthCert?.planLock?.workMdHash ?? '',
    blueprintsHash: birthCert?.planLock?.blueprintsHash ?? '',
    tasksHash: birthCert?.planLock?.tasksHash ?? '',
    allHash: birthCert?.planLock?.allHash ?? '',
  }

  // ─── 节点 3：Align ───
  // 读每个 Task 的 frozen.json → probeResults（含 artifact 产物路径）
  const taskEvidence = collectTaskEvidence(
    projectRoot,
    workName,
    work.tasks.map((t) => t.taskName),
  )

  // ─── 节点 4：Align→Proof 衔接 ───
  // 读 .run/state.json → tasks[] 状态
  const workState = readWorkState(projectRoot, workName)
  // boundaryViolations 由 finalizeWorkDomains 单独计算并通过参数注入
  // （见 work.ts:finalizeWork → collectWorkDomainProofs → finalizeWorkDomains）
  // 本函数返回空数组，由 Evidence 消费的 caller 合并
  const boundaryViolations: WorkEvidence['boundaryViolations'] = []

  return {
    work,
    planLock,
    taskEvidence,
    workState: {
      status: workState.status,
      finalVerdict: workState.finalVerdict,
      completedAt: workState.completedAt,
    },
    boundaryViolations,
  }
}

// ─── 辅助函数 ───

interface WorkMdResult {
  goal: string
  constraints: string[]
  blueprint: string
  tasks: Array<{ taskName: string; boundary: string }>
}

/**
 * 读 work.md 提取 goal / constraints / blueprint / tasks
 * - 解析 ## Context 段（goal / max_iterations / constraints）
 * - 解析 ## Use 段（blueprint ref + tasks）
 */
function readWorkMd(projectRoot: string, workName: string): WorkMdResult {
  // 优先读 .md，其次 .oxn
  const mdPath = join(projectRoot, '.openxenon', 'works', workName, 'work.md')
  const oxnPath = join(projectRoot, '.openxenon', 'works', workName, 'work.md') // 同路径
  const path = existsSync(mdPath) ? mdPath : oxnPath
  if (!existsSync(path)) {
    return { goal: '', constraints: [], blueprint: '', tasks: [] }
  }
  const content = readFileSync(path, 'utf-8')

  // 简化解析——从 frontmatter 拿 goal，从 ## Context 拿 constraints
  const goal = content.match(/^goal:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const constraintsBlock = content.match(/## Context[\s\S]*?constraints:\s*([\s\S]*?)(?=\n## |\n# |$)/)?.[1] ?? ''
  const constraints = Array.from(constraintsBlock.matchAll(/^  - (.+)$/gm), (m) => m[1]?.trim() ?? '').filter(
    (c) => c.length > 0,
  )

  // 解析 ## Use 段（兼容 H3 + 列表两种格式）
  const useMatch = content.match(/## Use\n([\s\S]*?)(?=\n## |\n# |$)/)
  let blueprint = ''
  const tasks: Array<{ taskName: string; boundary: string }> = []
  if (useMatch) {
    const useBody = useMatch[1] ?? ''
    // 格式 A：H3 包裹（### my-bp\n- kind: blueprint\n- ref: @prj/blueprints/foo）
    const h3Match = useBody.match(/### (.+?)\n- kind: blueprint\n- ref: (\S+)/)
    if (h3Match) {
      blueprint = h3Match[2] ?? ''
    } else {
      // 格式 B：直接列表（- blueprint: @prj/blueprints/foo）
      const listMatch = useBody.match(/- blueprint:\s*(\S+)/)
      if (listMatch) blueprint = listMatch[1] ?? ''
    }
  }

  // 解析 ## Tasks 段——每个 task 对应 Blueprint 的哪个 boundary
  const tasksMatch = content.match(/## Tasks\n([\s\S]*?)(?=\n## |\n# |$)/)
  if (tasksMatch) {
    for (const block of (tasksMatch[1] ?? '').split(/\n(?=### )/)) {
      if (!block.startsWith('### ')) continue
      const taskName = block.split('\n', 1)[0]?.replace(/^### /, '').trim() ?? ''
      if (taskName) tasks.push({ taskName, boundary: taskName })
    }
  }

  return { goal, constraints, blueprint, tasks }
}

/**
 * 读每个 Task 的 frozen.json，提取 probeResults（含 artifact 产物）
 */
function collectTaskEvidence(projectRoot: string, workName: string, taskNames: string[]): WorkEvidence['taskEvidence'] {
  const result: WorkEvidence['taskEvidence'] = []
  for (const taskName of taskNames) {
    const path = getTaskFrozenPath(projectRoot, workName, taskName)
    if (!existsSync(path)) {
      result.push({ taskName, status: 'failed', completedAt: null, probes: [] })
      continue
    }
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      const probeResults = (raw.probeResults ?? []) as Array<Record<string, unknown>>
      const status = (raw.status as WorkEvidence['taskEvidence'][number]['status']) ?? 'failed'
      const completedAt = (raw.completedAt as string | null) ?? null
      result.push({
        taskName,
        status,
        completedAt,
        probes: probeResults.map((pr) => {
          const output = pr.output
          return {
            probeName: String(pr.probeName ?? ''),
            ref: String(pr.ref ?? ''),
            verdict: (pr.verdict ?? 'FAILED') as 'PASSED' | 'FAILED' | 'INCONCLUSIVE',
            passed: Boolean(pr.passed),
            errorMessage: typeof pr.errorMessage === 'string' ? pr.errorMessage : undefined,
            durationMs: Number(pr.durationMs ?? 0),
            artifact: extractArtifact(output),
          }
        }),
      })
    } catch {
      result.push({ taskName, status: 'failed', completedAt: null, probes: [] })
    }
  }
  return result
}

/**
 * 读 .run/state.json 提取 Work 状态
 */
function readWorkState(
  projectRoot: string,
  workName: string,
): {
  status: WorkEvidence['workState']['status']
  finalVerdict: WorkEvidence['workState']['finalVerdict']
  completedAt: string
} {
  const path = getWorkStatePath(projectRoot, workName)
  if (!existsSync(path)) {
    return { status: 'pending', finalVerdict: 'PENDING', completedAt: '' }
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'))
    return {
      status: (raw.status ?? 'pending') as WorkEvidence['workState']['status'],
      finalVerdict: (raw.finalVerdict ?? 'PENDING') as WorkEvidence['workState']['finalVerdict'],
      completedAt: String(raw.completedAt ?? ''),
    }
  } catch {
    return { status: 'pending', finalVerdict: 'PENDING', completedAt: '' }
  }
}

/**
 * 从 Probe 执行结果中提取产物路径（artifact）
 * - fs-exists/fs-not-exists/fs-content-match：params.path
 * - shell-exec：params.command
 * - ts-compiles/lint-check/test-pass：params.path
 */
function extractArtifact(output: unknown): string | undefined {
  if (!output || typeof output !== 'object') return undefined
  const obj = output as Record<string, unknown>
  if (obj.observation && typeof obj.observation === 'object') {
    const obs = obj.observation as Record<string, unknown>
    // fs-* Probe：observation.output 是命中路径数组
    if (Array.isArray(obs.output) && obs.output.length > 0) {
      return String(obs.output[0])
    }
    if (typeof obs.output === 'string') {
      return obs.output
    }
    // shell-exec Probe：observation.command
    if (typeof obs.command === 'string') {
      return obs.command
    }
  }
  return undefined
}
