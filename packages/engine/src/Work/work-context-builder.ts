import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import {
  type WorkFileSummary,
  type DomainFileSummary,
  type ExternalEntry,
  readWorkFile,
  readWorkFileFromText,
  readTaskFile,
  readDomainFile,
} from '@openxenon/engine/oxl/summary-extractors'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractWorkIR } from '@openxenon/engine/oxl/md-pipeline/transformers/work.js'
import { serializeWorkToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import { getTaskOxnPath, getTaskStatePath, resolveWorkFilePath } from './dual-state-io'
import { collectUnresolvedRefDiagnostics } from './work-diagnostics'
import { readWorkFile as readBirthCert, verifyPlanLock } from './birth-cert'
import type { RefDiagnostic } from '@openxenon/engine/oxl/compiler/ref-diagnostic'
import type { AssetFormat } from '@openxenon/engine/infra/paths'
import {
  type PerWorkBlueprintsIndex,
  type PerWorkBlueprintEntry,
  loadPerWorkBlueprintsIndex,
  getPerWorkBlueprintsJsonPath,
} from './per-work-blueprints-merger'
import { resolveAssetCandidates } from '@openxenon/engine/infra/paths'

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

/**
 * 🆕 v0.7.3 P1 (RFC v0.7.3 §2.1 + ADR-0061 §D7):
 * BlueprintIR 摘要：从 per-work blueprints.json 反序列化的最小可消费快照。
 *   - 不含 Blueprint 原始文件全文（那是 Asset 层）
 *   - 含 slots / 3 边界 refs（足够 Task runtime 决策）
 *   - schemaVersion 留给未来演进
 */
export interface BlueprintIRSummary {
  schemaVersion: number
  workName: string
  generatedAt: string
  sourceHash: string
  declaredRefs: string[]
  blueprints: Array<{
    name: string
    scope: string
    file: string
    status: string
    version: number
    slots: Array<{ name: string; deps: string[]; observe: string[] }>
    errors: string[]
    ref: string
    domainRefs: Array<{ name: string; kind: string; ref: string; scope: string; version: number; fileHash: string }>
    workflowRefs: Array<{ name: string; kind: string; ref: string; scope: string; version: number; fileHash: string }>
    stackRefs: Array<{ name: string; kind: string; ref: string; scope: string; version: number; fileHash: string }>
    nestedBlueprintRefs: Array<{
      name: string
      kind: string
      ref: string
      scope: string
      version: number
      fileHash: string
    }>
  }>
}

/**
 * 🆕 v0.7.3 P1 (RFC v0.7.3 §2.1 + ADR-0061 §D1+D2 prep):
 * Blueprint 边界 Domain 的 language 注入单元。F2 修复：把 work ## Refs 的 language 丢失问题收敛到 Blueprint 边界 refs。
 */
export interface DomainLanguageEntry {
  name: string
  scope: string
  ref: string
  fileHash: string
  language: NonNullable<DomainFileSummary>['language']
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
  domainExternals?: Array<{ domainName: string; externals: ExternalEntry[] }>
  /** 🆕 v0.7.3 P1 (F1 fix): 从 per-work blueprints.json 反序列化的 BlueprintIR 摘要 */
  blueprintIR?: BlueprintIRSummary
  /** 🆕 v0.7.3 P1 (F2 fix): Blueprint 边界 Domain 的 language 注入（D1+D2 主/背景视角的预备） */
  domainLanguages?: DomainLanguageEntry[]
}

/**
 * 🆕 v0.7.3 P1 (RFC §1 F1 fix):
 * 加载 per-work blueprints.json（lock 期生成）。
 *   - 文件不存在返回 null（向后兼容：lock 前或老 Work）
 *   - 解析失败返回 null（drift 检测由 birth-cert 承担；此处只读不修）
 */
export function loadPerWorkBlueprints(projectRoot: string, workName: string): PerWorkBlueprintsIndex | null {
  const path = getPerWorkBlueprintsJsonPath(projectRoot, workName)
  return loadPerWorkBlueprintsIndex(path)
}

/**
 * 🆕 v0.7.3 P1: 把 PerWorkBlueprintsIndex 压缩为 BlueprintIRSummary
 * （仅保留 context 消费方需要的字段；排除 raw 元数据如 projectRoot）。
 */
export function summarizeBlueprints(idx: PerWorkBlueprintsIndex): BlueprintIRSummary {
  const slimEntry = (e: PerWorkBlueprintEntry) => ({
    name: e.name,
    scope: e.scope,
    file: e.file,
    status: e.status,
    version: e.version,
    slots: e.slots.map((s) => ({ name: s.name, deps: [...s.deps], observe: [...s.observe] })),
    errors: [...e.errors],
    ref: e.ref,
    domainRefs: e.domainRefs.map((r) => ({
      name: r.name,
      kind: r.kind,
      ref: r.ref,
      scope: r.scope,
      version: r.version,
      fileHash: r.fileHash,
    })),
    workflowRefs: e.workflowRefs.map((r) => ({
      name: r.name,
      kind: r.kind,
      ref: r.ref,
      scope: r.scope,
      version: r.version,
      fileHash: r.fileHash,
    })),
    stackRefs: e.stackRefs.map((r) => ({
      name: r.name,
      kind: r.kind,
      ref: r.ref,
      scope: r.scope,
      version: r.version,
      fileHash: r.fileHash,
    })),
    nestedBlueprintRefs: e.nestedBlueprintRefs.map((r) => ({
      name: r.name,
      kind: r.kind,
      ref: r.ref,
      scope: r.scope,
      version: r.version,
      fileHash: r.fileHash,
    })),
  })
  return {
    schemaVersion: idx.schemaVersion,
    workName: idx.workName,
    generatedAt: idx.generatedAt,
    sourceHash: idx.sourceHash,
    declaredRefs: [...idx.declaredRefs],
    blueprints: idx.blueprints.map(slimEntry),
  }
}

/**
 * 🆕 v0.7.3 P1 (F2 fix):
 * 从 Blueprint domainRefs[] 加载 boundary Domain 的 language。
 *   - 解析 Domain 文件 → readDomainFile
 *   - 找不到文件 → 跳过（lock hash 已捕获；这里不阻断）
 *   - 文件 hash 与 Blueprint 记录不一致 → 跳过（drift 留给 verifyPlanLock）
 */
export function loadDomainLanguagesFromBlueprint(
  blueprintIR: BlueprintIRSummary,
  projectRoot: string,
): DomainLanguageEntry[] {
  const out: DomainLanguageEntry[] = []
  const seen = new Set<string>()
  for (const bp of blueprintIR.blueprints) {
    for (const ref of bp.domainRefs) {
      if (seen.has(ref.ref)) continue
      seen.add(ref.ref)
      const filePath = findBoundaryAssetFile(projectRoot, 'domain', ref.name)
      if (!filePath) continue
      const dom = readDomainFile(filePath)
      if (!dom?.language) continue
      out.push({
        name: ref.name,
        scope: ref.scope,
        ref: ref.ref,
        fileHash: ref.fileHash,
        language: dom.language,
      })
    }
  }
  return out
}

/**
 * 🆕 v0.7.3 P1 helper: 解析 boundary asset 的实际文件路径
 *   - 与 per-work-blueprints-merger.resolveBoundaryAssetFile 行为一致
 *   - 但不在私有域 → 暴露给 work-context-builder 复用
 */
function findBoundaryAssetFile(
  projectRoot: string,
  kind: 'domain' | 'workflow' | 'stack' | 'blueprint',
  name: string,
): string | null {
  const { primary, fallback } = resolveAssetCandidates(projectRoot, kind, null)
  const kebab = camelToKebab(name)
  for (const dir of [primary, fallback]) {
    for (const f of [`${name}.md`, `${kebab}.md`]) {
      const fp = join(dir, f)
      if (existsSync(fp)) return fp
    }
  }
  return null
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
      const synthesizedOxn = serializeWorkToOxn(ir)
      work = readWorkFileFromText(synthesizedOxn, workFile)
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

  const domainExternals: Array<{ domainName: string; externals: ExternalEntry[] }> = []
  for (const d of work.domains) {
    const kebab = camelToKebab(d.name)
    const candidates = [
      join(root, BOUNDARY_DIR, 'domains', `${d.name}.md`),
      join(root, BOUNDARY_DIR, 'domains', `${kebab}.md`),
    ]
    for (const p of candidates) {
      const domData = readDomainFile(p)
      if (domData?.externals && domData.externals.length > 0) {
        domainExternals.push({ domainName: d.name, externals: domData.externals })
        break
      }
    }
  }

  // 🆕 v0.7.3 P1 (F1 fix): load per-work blueprints.json + summarize as BlueprintIR
  //   - 缺失 → 不注入 blueprintIR（向后兼容：老 Work / lock 前）
  //   - 解析失败 → 不注入（drift 由 birth-cert 承担）
  const perWorkBpIdx = loadPerWorkBlueprints(root, workName)
  const blueprintIR = perWorkBpIdx ? summarizeBlueprints(perWorkBpIdx) : undefined

  // 🆕 v0.7.3 P1 (F2 fix): 从 Blueprint 边界 refs 加载 Domain language
  //   - Blueprint 不存在 → 不注入 domainLanguages（向后兼容）
  //   - Domain 文件找不到 / hash 不一致 → 跳过该条目
  const domainLanguages = blueprintIR ? loadDomainLanguagesFromBlueprint(blueprintIR, root) : []

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
    ...(domainExternals.length > 0 ? { domainExternals } : {}),
    ...(blueprintIR ? { blueprintIR } : {}),
    ...(domainLanguages.length > 0 ? { domainLanguages } : {}),
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
  domainExternals?: Array<{ domainName: string; externals: ExternalEntry[] }>
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
  if (c.domainExternals && c.domainExternals.length > 0) {
    lines.push('')
    lines.push('## External References (read during Intent)')
    lines.push('> AI: for kind=adr, read the path/url content and distill constraints into task.md.')
    lines.push('> Other kinds (library/rest-api/...) are pointers — read on demand.')
    for (const de of c.domainExternals) {
      lines.push(`  ${de.domainName} Domain:`)
      for (const ext of de.externals) {
        const loc = ext.path ?? ext.url ?? '(no location)'
        const sum = ext.summary ? ` — ${ext.summary}` : ''
        lines.push(`    - ${ext.name} (${ext.kind || 'unknown'}): ${loc}${sum}`)
      }
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
