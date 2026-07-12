import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import {
  type WorkFileSummary,
  type DomainFileSummary,
  readWorkFile,
  workIRToSummary,
  readTaskFile,
  readDomainFile,
} from '@openxenon/engine/oxl/summary-extractors'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractWorkIR } from '@openxenon/engine/oxl/md-pipeline/transformers/work.js'
import { getTaskOxnPath, getTaskStatePath, resolveWorkFilePath } from './dual-state-io'
import { collectUnresolvedRefDiagnostics } from './work-diagnostics'
import { readWorkFile as readBirthCert, verifyPlanLock } from './birth-cert'
import type { RefDiagnostic } from '@openxenon/engine/oxl/compiler/ref-diagnostic'
import type { AssetFormat } from '@openxenon/engine/infra/paths'

function camelToKebab(s: string): string {
  return s
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

export interface WorkContextBuilderParams {
  projectRoot: string
  workName: string
  taskName?: string
  assetFormat: AssetFormat
  lockCheck?: boolean
  statePath?: string
}

export interface WorkContextResult {
  workspace: string
  task?: string
  blueprint?: string
  currentPart: string | null
  taskStatus?: string
  workContext: { overallGoal: string; constraints: string[] }
  taskContext?: { deps: string[] }
  injectedDomains: Array<{ name: string; description?: string; language?: unknown }>
  allowedLanguage?: { mustUseTerms: Array<{ name: string; desc: string }>; banned: string[]; invariants: string[] }
  taskParts?: Array<{ name: string; skillContext?: string; probes: Array<{ name: string; ref: string }> }>
  isolationNotice?: string
  lockHealth?: unknown
  diagnostics: RefDiagnostic[]
  domains?: unknown[]
  blueprints?: unknown[]
  parts?: unknown[]
  probes?: unknown[]
  tasks?: unknown[]
}

export function buildWorkContext(params: WorkContextBuilderParams): WorkContextResult {
  const { projectRoot, workName, taskName, assetFormat, lockCheck = true, statePath: statePathArg } = params
  const root = projectRoot

  if (lockCheck) {
    const birthCert = readBirthCert(root, workName)
    if (birthCert.ok && birthCert.cert.planLock !== null) {
      const lockVerify = verifyPlanLock(root, workName, birthCert.cert)
      if (!lockVerify.ok) {
        throw new Error(`Context read BLOCKED: ${lockVerify.message}`)
      }
    } else if (!birthCert.ok) {
      if (birthCert.reason === 'missing') {
        throw new Error(`work "${workName}" cannot read context: .work missing`)
      }
      throw new Error(`work "${workName}" cannot read context: .work ${birthCert.reason}`)
    } else {
      throw new Error(`work "${workName}" has no planLock; context refuses stale read`)
    }
  }

  const workFile = resolveWorkFilePath(root, workName, assetFormat)
  if (!existsSync(workFile)) {
    throw new Error(`work "${workName}" not found at ${workFile}`)
  }

  let work: WorkFileSummary | null = null
  if (workFile.endsWith('.md')) {
    try {
      const content = readFileSync(workFile, 'utf-8')
      const parsed = parseMarkdown(content)
      const ir = extractWorkIR(parsed.tree, parsed.frontmatter)
      work = workIRToSummary(ir)
    } catch (e) {
      throw new Error(`Failed to parse ${workFile}: ${e instanceof Error ? e.message : String(e)}`)
    }
  } else {
    work = readWorkFile(workFile)
  }
  if (!work) {
    throw new Error(`Failed to parse ${workFile}`)
  }

  const diagnostics: RefDiagnostic[] = collectUnresolvedRefDiagnostics(work, root)

  if (taskName) {
    const task = work.tasks.find((t) => t.name === taskName)
    let taskDomain: string | undefined = task?.domain
    let taskBlueprint: string | undefined = task?.blueprint
    let taskParts: Array<{
      name: string
      skillContext?: string
      probes: Array<{ name: string; ref: string; params?: Record<string, string> }>
    }> = []
    let taskDeps: string[] = task?.deps ?? []

    const taskFile = getTaskOxnPath(root, workName, taskName)
    if (existsSync(taskFile)) {
      const taskFileData = readTaskFile(taskFile)
      if (taskFileData) {
        taskDomain = taskDomain ?? taskFileData.domain
        taskBlueprint = taskBlueprint ?? taskFileData.blueprint
        taskParts = taskFileData.parts
        taskDeps = taskFileData.deps.length > 0 ? taskFileData.deps : taskDeps
      }
    }

    const injectedDomains: Array<{ name: string; data: NonNullable<DomainFileSummary> }> = []
    if (taskDomain) {
      const kebab = camelToKebab(taskDomain)
      const candidates = [
        join(root, BOUNDARY_DIR, 'domains', `${taskDomain}.md`),
        join(root, BOUNDARY_DIR, 'domains', `${kebab}.md`),
      ]
      for (const path of candidates) {
        const domData = readDomainFile(path)
        if (domData) {
          injectedDomains.push({ name: taskDomain, data: domData })
          break
        }
      }
    }

    const allowedTerms: Array<{ name: string; desc: string }> = []
    const banned: string[] = []
    const invariants: string[] = []
    for (const { data } of injectedDomains) {
      if (data.language) {
        allowedTerms.push(...data.language.terms)
        banned.push(...data.language.ban)
        invariants.push(...data.language.invariant)
      }
    }

    const statePath = statePathArg ?? getTaskStatePath(root, workName, taskName)
    let currentFocus: string | null = taskParts[0]?.name ?? null
    let taskStatus = 'pending'
    if (existsSync(statePath)) {
      try {
        const state = JSON.parse(readFileSync(statePath, 'utf-8'))
        if (state.currentPart) currentFocus = state.currentPart
        if (state.status) taskStatus = state.status
      } catch {
        // ignore
      }
    }

    const context: WorkContextResult = {
      workspace: workName,
      task: taskName,
      blueprint: taskBlueprint,
      currentPart: currentFocus,
      taskStatus,
      workContext: {
        overallGoal: work.goal ?? '',
        constraints: work.constraints,
      },
      taskContext: {
        deps: taskDeps,
      },
      injectedDomains: injectedDomains.map(({ name, data }) => ({
        name,
        ...(data.description ? { description: data.description } : {}),
        ...(data.language
          ? {
              language: {
                terms: data.language.terms,
                ban: data.language.ban,
                invariant: data.language.invariant,
              },
            }
          : {}),
      })),
      allowedLanguage: {
        mustUseTerms: allowedTerms,
        banned,
        invariants,
      },
      taskParts,
      isolationNotice: 'Work context is isolated — task-level view only',
      lockHealth: { status: 'unknown' },
      diagnostics,
    }

    return context
  }

  return {
    workspace: workName,
    workContext: {
      overallGoal: work.goal ?? '',
      constraints: work.constraints,
    },
    currentPart: null,
    injectedDomains: [],
    diagnostics,
    domains: work.domains as unknown[],
    blueprints: work.blueprints as unknown[],
    parts: work.parts as unknown[],
    probes: work.probes as unknown[],
    tasks: work.tasks as unknown[],
  }
}

export function renderContextHuman(c: {
  workspace: string
  task?: string
  blueprint?: string
  currentPart: string | null
  taskStatus?: string
  workContext: { overallGoal: string; constraints: string[] }
  taskContext?: { deps: string[] }
  injectedDomains: Array<{ name: string; description?: string; language?: unknown }>
  allowedLanguage?: { mustUseTerms: Array<{ name: string; desc: string }>; banned: string[]; invariants: string[] }
  taskParts?: Array<{ name: string; skillContext?: string; probes: Array<{ name: string; ref: string }> }>
  diagnostics: RefDiagnostic[]
  domains?: unknown[]
  blueprints?: unknown[]
  parts?: unknown[]
  probes?: unknown[]
  tasks?: unknown[]
}): string {
  const lines: string[] = []
  lines.push(`# Context for ${c.workspace}${c.task ? ` / ${c.task}` : ''}`)
  lines.push('')
  lines.push(`Blueprint: ${c.blueprint ?? '(none)'}`)
  lines.push(`Current part: ${c.currentPart ?? '(none)'}`)
  lines.push(`Status: ${c.taskStatus ?? 'pending'}`)
  lines.push('')
  lines.push('## Work-level')
  lines.push(`Goal: ${c.workContext.overallGoal}`)
  if (c.workContext.constraints.length > 0) {
    lines.push('Constraints:')
    for (const x of c.workContext.constraints) lines.push(`  - ${x}`)
  }
  lines.push('')
  lines.push('## Task-level')
  if (c.taskContext?.deps && c.taskContext.deps.length > 0) {
    lines.push(`Deps: ${c.taskContext.deps.join(', ')}`)
  }
  lines.push('')
  lines.push('## Injected Domains (isolated)')
  for (const d of c.injectedDomains) {
    lines.push(`  - ${d.name}${d.description ? `: ${d.description}` : ''}`)
    if (d.language) {
      const lang = d.language as { terms?: unknown[]; ban?: unknown[]; invariant?: unknown[] }
      if (lang.terms && lang.terms.length > 0) {
        lines.push(`    Terms: ${(lang.terms as Array<{ name: string }>).map((t) => t.name).join(', ')}`)
      }
      if (lang.ban && lang.ban.length > 0) {
        lines.push(`    Banned: ${lang.ban.join(', ')}`)
      }
      if (lang.invariant && lang.invariant.length > 0) {
        lines.push(`    Invariants: ${lang.invariant.join('; ')}`)
      }
    }
  }
  if (c.taskParts && c.taskParts.length > 0) {
    lines.push('')
    lines.push('## Task Parts')
    for (const p of c.taskParts) {
      lines.push(`  - ${p.name}${p.skillContext ? `: ${p.skillContext}` : ''}`)
    }
  }
  if (c.diagnostics.length > 0) {
    lines.push('')
    lines.push(`## Diagnostics (${c.diagnostics.length} unresolved ref(s))`)
    for (const d of c.diagnostics) {
      lines.push(`  - [${d.type}] ${d.ref}: ${d.message}`)
    }
  }
  return lines.join('\n')
}
