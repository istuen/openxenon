import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR, type StackToolInfo, type StackOperationInfo } from '@openxenon/engine/kernel'
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
// 🗑️ RFC-0033 D2: readBirthCert / verifyPlanLock import 已删（PlanLock 退役，context 不再校验锁状态）
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
  /** 🆕 v0.7.3 P3 (RFC §4 + ADR-0061 §D1+D2 + §5.1 token 预算):
   *  - 'full' (default): 多 Domain 主/背景视角注入；termViews 聚合 + 块状渲染
   *  - 'lean': 单 Domain 模式（保留向后兼容路径；skip background domain load） */
  contextMode?: 'full' | 'lean'
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
    slots: Array<{ name: string; deps: string[]; observe: string[]; operate?: string[] }>
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

/**
 * 🆕 v0.7.3 P3 (RFC §4 + ADR-0061 §D2):
 * 多视角 term 视图。同名 term 从多个 Domain 视角聚合；每个 term 包含 main + 0..N 背景视图。
 *   - isMain=true: 主对齐视角（来自 task.domain）
 *   - isMain=false: 背景视角（来自 Blueprint.use.domain[] 派生）
 *   - isNameOnly=true: term 名仅出现于背景视角，未被 main 视角采纳（节省 token）
 */
export interface TermView {
  name: string
  views: Array<{ domain: string; desc: string; isMain: boolean; isNameOnly: boolean }>
}

export interface WorkContextResult {
  workspace: string
  task?: string
  blueprint?: string
  currentPart: string | null
  taskStatus?: string
  workContext: { overallGoal: string; constraints: string[] }
  taskContext?: { deps: string[] }
  injectedDomains: Array<{
    name: string
    description?: string
    language?: unknown
    /** 🆕 v0.7.3 P3 (ADR-0061 §D1): 标注视角角色 */
    role?: 'main' | 'background'
  }>
  allowedLanguage?: {
    mustUseTerms: Array<{ name: string; desc: string }>
    banned: string[]
    invariants: string[]
    /** 🆕 v0.7.3 P3 (ADR-0061 §D2): 多视角 term 视图聚合 */
    termViews?: TermView[]
    /** 🆕 v0.7.3 P3: 主对齐 Domain 名 */
    mainDomain?: string
    /** 🆕 v0.7.3 P3: 背景 Domain 名列表（token 预算剪裁后） */
    backgroundDomains?: string[]
    /** 🆕 v0.7.3 P3 (ADR-0061 §5.1 token 预算缓解): 是否 lean 模式 */
    contextMode?: 'full' | 'lean'
  }
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
  /** 🆕 v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5): Blueprint.use.stack 加载的 StackTool 列表
   *   - 来源：Blueprint.stackRefs[].name → 解析 .openxenon/assets/stack/<name>.md
   *   - 形状：每项 { name, version?, command?, config?, role?, desc?, operations? }
   *   - 消费者：ProofRunner.executeProbe 透传给 ProbeContext.stackTools
   *   - L1 probe handlers 可按 tool.name 匹配做 env metadata merge
   */
  stackTools?: StackToolInfo[]
  /** 🆕 v0.7.4 stack-operation-referent (design-stack-operation-referent Draft 2026-08-07):
   * BlueprintIR 解析后的 slot.operate 列表（只到 operation 名）。
   *   - 来源：BlueprintIRSummary.blueprints[].slots[].operate（lock 期固化）
   *   - 形状：每项 { slot, operations: string[] }
   *   - 消费者：AI Agent 从 Task context 看到 operation 名 → 跨层查找 stackTools.operations 拿 command
   *   - 语义：参照不强制（inv-36 operate-is-reference-not-gate）
   */
  slotOperations?: Array<{ slot: string; operations: string[] }>
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
    slots: e.slots.map((s) => ({
      name: s.name,
      deps: [...s.deps],
      observe: [...s.observe],
      // 🆕 v0.7.4 stack-operation-referent — 透传 operate（可选，向后兼容）
      ...(s.operate && s.operate.length > 0 ? { operate: [...s.operate] } : {}),
    })),
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
 *   - 🆕 v0.7.3 P3: 改为 export（CLI 的 task-level 域加载也复用）
 */
export function findBoundaryAssetFile(
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

/**
 * 🆕 v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5) + 🆕 v0.7.4 stack-operation-followup P2:
 * 从 Blueprint.stackRefs[] 加载 Stack 文件并提取 tools。
 *   - 解析 .md → 提取 H3 under `## Tools` 段的 key-value props
 *   - 字段映射：version / command / config / role / desc / operations
 *   - 文件不存在 / 解析失败 → 跳过该 entry（drift 由 birth-cert 承担）
 *   - 🆕 v0.7.4 P2: 按 Stack 名去重（loadedStacks），允许 Blueprint 引用多 Stack
 *     同一 Stack 被多个 Blueprint 引用时只加载一次；同名 tool 跨 Stack 时
 *     后引用覆盖前引用（与 RFC-0022 observe 引用语义一致）
 */
export function loadStackToolsFromBlueprint(blueprintIR: BlueprintIRSummary, projectRoot: string): StackToolInfo[] {
  const out: StackToolInfo[] = []
  const loadedStacks = new Set<string>() // 去重：同一 Stack 不重复加载
  for (const bp of blueprintIR.blueprints) {
    for (const ref of bp.stackRefs) {
      if (loadedStacks.has(ref.name)) continue
      loadedStacks.add(ref.name)
      const filePath = findBoundaryAssetFile(projectRoot, 'stack', ref.name)
      if (!filePath) continue
      const tools = parseStackTools(filePath)
      if (tools) out.push(...tools)
    }
  }
  return out
}

/**
 * 🆕 v0.7.3 P6 helper: 解析 Stack .md 文件的 `## Tools` 段为 StackToolInfo[]
 *   - 与 stack-compiler.ts:148-191 parse() 行为一致（轻量版，避免 import L1-OXL）
 *   - 返回 null 表示解析失败（drift 由 caller 决定如何处理）
 *   - 🆕 v0.7.4 stack-operation-referent: 改为 export，work-validator 复用做 operate 校验
 */
export function parseStackTools(filePath: string): StackToolInfo[] | null {
  if (!existsSync(filePath)) return null
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
  const parsed = parseMarkdown(content)
  const lines = content.split('\n')
  const out: StackToolInfo[] = []
  let currentTool: StackToolInfo | null = null
  let inOperationsBlock = false
  // 🆕 v0.7.4: Asset 结构 v2 三层模型 — Stack tool 仅在 `## Tools` / `## Foundation`
  // 等工具组 H2 下识别；其他 free-form Group 下的 Axiom 不算 tool。
  // 兼容老 Stack：未命中 tool-组时退化行为（接收所有 ### Axiom），保留旧 wide-open 行为。
  let inToolSection = false
  let hasToolSections = false
  for (const line of lines) {
    const h2 = line.match(/^##\s+(\S+)\s*$/)
    if (h2) {
      const title = h2[1]!
      const isToolSection = title === 'Tools' || title === 'Foundation' || title.startsWith('Use ')
      if (isToolSection) hasToolSections = true
      inToolSection = isToolSection
      inOperationsBlock = false
      continue
    }
    // H3 tool 段开始（### bun / ### typescript / ...）
    const h3 = line.match(/^###\s+(\S+)\s*$/)
    if (h3) {
      if (currentTool) out.push(currentTool)
      currentTool = hasToolSections ? (inToolSection ? { name: h3[1]! } : null) : { name: h3[1]! }
      inOperationsBlock = false
      continue
    }
    if (!currentTool) continue
    // 跳过 H2 边界（## Tools → 下一段）
    if (line.match(/^##\s+/)) {
      // 新的 H2 段可能仍在当前 tool 下；不要 reset，让后续 ### 重置
      inOperationsBlock = false
      continue
    }
    // 解析 `- key: value`
    const li = line.match(/^\s*-\s+(\w[\w-]*)\s*:\s*(.*)$/)
    if (!li) continue
    const key = li[1]!.toLowerCase()
    let value = li[2]!.trim()

    // 🆕 v0.7.4 stack-operation-referent — operations 子段标记
    if (key === 'operations') {
      // - operations: 行标记开始；后续 `- name: command` 是 operation 声明
      inOperationsBlock = true
      if (!currentTool.operations) currentTool.operations = []
      continue
    }

    if (inOperationsBlock) {
      // operation 声明格式：- <op-name>: <command> [— <desc>]
      // 例：- test: "bun test" — 全量测试
      //     - test-filtered: "bun test --filter $PATTERN" — 按过滤器跑
      // 注：外层正则 `^\s*-\s+(\w[\w-]*)\s*:\s*(.*)$` 已经把 op-name 与 command 切开
      //     （key = op-name, value = command + 可能的 desc）。
      //     value 中可能有 `— desc` 后缀（em/en dash 分隔）。
      const opName = key.replace(/^["']|["']$/g, '')
      let rest = value
      // 去除首尾引号
      rest = rest.replace(/^["']|["']$/g, '')
      // 分离 desc（"— ..." 或 "— ..."）
      const descMatch = rest.match(/^(.+?)\s*[—–-]\s+(.+)$/)
      const op: StackOperationInfo = descMatch
        ? { name: opName, command: descMatch[1]!.trim(), desc: descMatch[2]!.trim() }
        : { name: opName, command: rest }
      currentTool.operations!.push(op)
      continue
    }

    // 去除尾随注释（如 "bun.lock（权威锁文件）" → "bun.lock" + desc="权威锁文件"）
    const descIdx = value.search(/[（(]/)
    if (descIdx >= 0) {
      // 保留 desc 作为父字段（不拆分到子字段）；Stack tool 只关心 5 个字段
      value = value.slice(0, descIdx).trim()
    }
    if (key === 'version') currentTool.version = value
    else if (key === 'command') currentTool.command = value
    else if (key === 'config') currentTool.config = value
    else if (key === 'role') currentTool.role = value
    else if (key === 'desc') currentTool.desc = value
    // 其他 key 暂忽略（如 abstract 等）
  }
  if (currentTool) out.push(currentTool)
  // 防止 unused 警告
  void parsed
  return out
}

/**
 * 🆕 v0.7.4 stack-operation-referent (design-stack-operation-referent Draft 2026-08-07):
 * 从 BlueprintIR 提取 slot.operate 列表（只到 operation 名）。
 *   - 来源：BlueprintIRSummary.blueprints[].slots[].operate（lock 期固化）
 *   - 形状：[{ slot, operations: string[] }]
 *   - 消费者：AI Agent 从 Task context 看到 operation 名 → 跨层查找 stackTools.operations 拿 command
 *   - 与 stackTools 注入路径平行（stackTools 是环境元数据全集，slotOperations 是当前 Blueprint 声明）
 *   - 锁期校验由 work-validator 跑（inv-27 operate-subset-stack-operations）
 */
export function loadSlotOperationsFromBlueprint(blueprintIR: BlueprintIRSummary): Array<{
  slot: string
  operations: string[]
}> {
  const out: Array<{ slot: string; operations: string[] }> = []
  for (const bp of blueprintIR.blueprints) {
    for (const slot of bp.slots) {
      if (slot.operate && slot.operate.length > 0) {
        out.push({ slot: slot.name, operations: [...slot.operate] })
      }
    }
  }
  return out
}

/**
 * 🆕 v0.7.3 P3 (RFC §5.1 token 预算缓解 + ADR-0061 §D1+D2):
 * 聚合同名 term 的多 Domain 视角视图。
 *
 * 规则：
 *   - 主对齐视角（main）: 全部 term + desc
 *   - 背景视角（backgrounds）:
 *     - 前 maxBackgroundFull 个满注入（仅同名 term 的 desc）
 *     - 其余背景 Domain 仅 term name 列表（无 desc，节省 token）
 *
 * 返回值：
 *   - termViews: 每个同名 term 聚合为一项；views 含 main + 0..N 背景
 *   - backgroundDomains: 实际加载的背景 Domain 名列表（含 full + name-only）
 *
 * 空 main language: 返回 { termViews: [], backgroundDomains: [] }
 * 空 backgrounds: 返回仅 main 视图
 */
export function buildTermViews(
  mainLang: NonNullable<DomainFileSummary>['language'] | null | undefined,
  backgrounds: DomainLanguageEntry[],
  options: { maxBackgroundFull?: number } = {},
): { termViews: TermView[]; backgroundDomains: string[] } {
  const maxBgFull = options.maxBackgroundFull ?? 3
  const termMap = new Map<string, TermView>()

  // 1) 主对齐视角：全部 term + desc
  if (mainLang?.terms) {
    for (const t of mainLang.terms) {
      termMap.set(t.name, {
        name: t.name,
        views: [{ domain: 'main', desc: t.desc, isMain: true, isNameOnly: false }],
      })
    }
  }

  // 2) 背景视角：分两类
  const fullBgs = backgrounds.slice(0, maxBgFull)
  const nameOnlyBgs = backgrounds.slice(maxBgFull)

  for (const bg of fullBgs) {
    if (!bg.language?.terms) continue
    for (const t of bg.language.terms) {
      const existing = termMap.get(t.name)
      if (existing) {
        existing.views.push({
          domain: bg.name,
          desc: t.desc,
          isMain: false,
          isNameOnly: false,
        })
      } else {
        // 背景视角有但 main 没有的 term（仅 nameOnly 占位）
        termMap.set(t.name, {
          name: t.name,
          views: [{ domain: bg.name, desc: t.desc, isMain: false, isNameOnly: false }],
        })
      }
    }
  }

  // 3) 剩余背景 Domain：仅 term name 列表（无 desc，nameOnly=true）
  for (const bg of nameOnlyBgs) {
    if (!bg.language?.terms) continue
    for (const t of bg.language.terms) {
      const existing = termMap.get(t.name)
      if (existing) {
        existing.views.push({ domain: bg.name, desc: '', isMain: false, isNameOnly: true })
      }
    }
  }

  return {
    termViews: Array.from(termMap.values()),
    backgroundDomains: backgrounds.map((b) => b.name),
  }
}

/**
 * 🆕 v0.7.3 P3 helper: 把 loaded DomainLanguageEntry[] 拆成 main + backgrounds
 *   - main: name 与 taskDomain 匹配的第一个 entry
 *   - backgrounds: 其余（保持 Blueprint.use.domain[] 声明顺序）
 *   - 无 taskDomain 或匹配失败 → main=null, backgrounds=全部
 */
export function partitionBackgroundDomains(
  loadedEntries: DomainLanguageEntry[],
  taskDomain: string | undefined,
): { main: DomainLanguageEntry | null; backgrounds: DomainLanguageEntry[] } {
  if (!taskDomain) return { main: null, backgrounds: loadedEntries }
  let mainIdx = -1
  for (let i = 0; i < loadedEntries.length; i++) {
    if (loadedEntries[i]!.name === taskDomain) {
      mainIdx = i
      break
    }
  }
  if (mainIdx === -1) return { main: null, backgrounds: loadedEntries }
  return {
    main: loadedEntries[mainIdx]!,
    backgrounds: loadedEntries.filter((_, i) => i !== mainIdx),
  }
}

export function buildWorkContext(params: WorkContextBuilderParams): WorkContextResult {
  // 🗑️ RFC-0033 D2: lockCheck 参数已删（保留位置以保持向后兼容 schema；忽略该参数）
  const { projectRoot, workName, taskName, assetFormat, statePath: statePathArg } = params
  const root = projectRoot

  // 🗑️ RFC-0033 D2: lockCheck 块已删 — PlanLock 整体删除，context 不再校验锁状态
  //   - 旧逻辑：planLock === null → 拒绝读取
  //   - 新逻辑：直接读 work.md（work.md 可自由修改，submit 时 hash 指纹记录漂移）

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

    // 🆕 v0.7.3 P3: contextMode 默认 'full'（多视角）；'lean' 走单 Domain 老路径
    const contextMode: 'full' | 'lean' = params.contextMode ?? 'full'

    const injectedDomains: Array<{ name: string; data: NonNullable<DomainFileSummary>; role: 'main' | 'background' }> =
      []
    if (taskDomain) {
      // 🆕 v0.7.3 P3: 用 findBoundaryAssetFile 而非硬编码 .openxenon/domains/
      //   - 旧 path 只命中 .archived 或老布局；新 path 优先 .openxenon/assets/domains/
      const filePath = findBoundaryAssetFile(root, 'domain', taskDomain)
      if (filePath) {
        const domData = readDomainFile(filePath)
        if (domData) {
          injectedDomains.push({ name: taskDomain, data: domData, role: 'main' })
        }
      }
    }

    // 🆕 v0.7.3 P3 (D1+D2 prep): full mode 加载 Blueprint 边界 Domain languages + 派生 background
    let termViews: TermView[] = []
    let backgroundDomainNames: string[] = []
    let mainLang: NonNullable<DomainFileSummary>['language'] | null = null
    let stackTools: StackToolInfo[] = []
    let slotOperations: Array<{ slot: string; operations: string[] }> = []

    if (contextMode === 'full') {
      // main language 从已加载的 injectedDomains[0] 取
      mainLang = injectedDomains[0]?.data.language ?? null

      // 加载 Blueprint 边界 Domain languages
      const perWorkBpIdx = loadPerWorkBlueprints(root, workName)
      const blueprintIR = perWorkBpIdx ? summarizeBlueprints(perWorkBpIdx) : null
      const allLoaded = blueprintIR ? loadDomainLanguagesFromBlueprint(blueprintIR, root) : []

      // 拆 main + backgrounds
      const partition = partitionBackgroundDomains(allLoaded, taskDomain)
      const backgrounds = partition.backgrounds

      // 把 background languages 注入到 injectedDomains（role='background'）
      for (const bg of backgrounds) {
        if (!bg.language) continue
        injectedDomains.push({
          name: bg.name,
          data: {
            name: bg.name,
            description: '',
            language: bg.language,
          },
          role: 'background',
        })
      }

      // 聚合 termViews（main + backgrounds + name-only 4+）
      const result = buildTermViews(mainLang, backgrounds, { maxBackgroundFull: 3 })
      termViews = result.termViews
      backgroundDomainNames = result.backgroundDomains

      // 🆕 v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5): 加载 StackTool 列表
      stackTools = blueprintIR ? loadStackToolsFromBlueprint(blueprintIR, root) : []
      // 🆕 v0.7.4 stack-operation-referent: 加载 slot.operate 列表
      slotOperations = blueprintIR ? loadSlotOperationsFromBlueprint(blueprintIR) : []
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
      injectedDomains: injectedDomains.map(({ name, data, role }) => ({
        name,
        role,
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
        ...(contextMode === 'full' && termViews.length > 0
          ? {
              termViews,
              mainDomain: taskDomain,
              backgroundDomains: backgroundDomainNames,
              contextMode: 'full' as const,
            }
          : contextMode === 'lean'
            ? { contextMode: 'lean' as const }
            : {}),
      },
      taskParts,
      isolationNotice: 'Work context is isolated — task-level view only',
      lockHealth: { status: 'unknown' },
      diagnostics,
      ...(stackTools.length > 0 ? { stackTools } : {}),
      // 🆕 v0.7.4 stack-operation-referent — 注入 slot operations
      ...(slotOperations.length > 0 ? { slotOperations } : {}),
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

  // 🆕 v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5): 从 Blueprint.use.stack 加载 StackTool 列表
  //   - 注入到 WorkContextResult.stackTools（ProofRunner 透传给 ProbeContext）
  //   - Stack 文件找不到 → 跳过该 entry
  const stackTools = blueprintIR ? loadStackToolsFromBlueprint(blueprintIR, root) : []
  const slotOperations = blueprintIR ? loadSlotOperationsFromBlueprint(blueprintIR) : []

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
    ...(stackTools.length > 0 ? { stackTools } : {}),
    // 🆕 v0.7.4 stack-operation-referent — 注入 slot operations
    ...(slotOperations.length > 0 ? { slotOperations } : {}),
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
  injectedDomains: Array<{
    name: string
    description?: string
    language?: unknown
    role?: 'main' | 'background'
  }>
  allowedLanguage?: {
    mustUseTerms: Array<{ name: string; desc: string }>
    banned: string[]
    invariants: string[]
    /** 🆕 v0.7.3 P3 (D2): 多视角 term 视图 */
    termViews?: TermView[]
    mainDomain?: string
    backgroundDomains?: string[]
    contextMode?: 'full' | 'lean'
  }
  taskParts?: Array<{ name: string; skillContext?: string; probes: Array<{ name: string; ref: string }> }>
  diagnostics: RefDiagnostic[]
  domains?: unknown[]
  blueprints?: unknown[]
  parts?: unknown[]
  probes?: unknown[]
  tasks?: unknown[]
  domainExternals?: Array<{ domainName: string; externals: ExternalEntry[] }>
  /** 🆕 v0.7.3 P6 (ADR-0061 §D5): Stack tools 列表 */
  stackTools?: Array<{
    name: string
    version?: string
    command?: string
    config?: string
    role?: string
    /** 🆕 v0.7.4 stack-operation-referent — tool 的命名调用声明 */
    operations?: StackOperationInfo[]
  }>
  /** 🆕 v0.7.4 stack-operation-referent (design-stack-operation-referent Draft 2026-08-07):
   * Blueprint slot.operate 解析结果。AI Agent 看到 operation 名后，跨层查上面的 Stack Tools
   * 找同名 tool 的 operations 子段拿 command。参照不强制（inv-36）。
   */
  slotOperations?: Array<{ slot: string; operations: string[] }>
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
    const roleTag = d.role ? ` [${d.role}]` : ''
    lines.push(`  - ${d.name}${roleTag}${d.description ? `: ${d.description}` : ''}`)
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

  // 🆕 v0.7.3 P3 (D2): 多视角 ## Allowed Language 块状渲染
  if (c.allowedLanguage) {
    const al = c.allowedLanguage
    const isFullMode = al.contextMode === 'full' && al.termViews && al.termViews.length > 0
    if (isFullMode) {
      lines.push('')
      lines.push('## Allowed Language (multi-view)')
      lines.push(
        `> Main view: \`${al.mainDomain ?? '(unknown)'}\` · Background views: ${(al.backgroundDomains ?? []).map((d) => `\`${d}\``).join(', ') || '(none)'}`,
      )
      lines.push(`> Token budget: 前 3 个 background 满注入（同名 term desc），其余仅 term 名列表`)
      lines.push('')
      lines.push('### Terms')
      for (const tv of al.termViews ?? []) {
        lines.push(`#### ${tv.name}`)
        for (const v of tv.views) {
          const mainTag = v.isMain ? ' [main]' : ''
          const nameOnlyTag = v.isNameOnly ? ' [name-only]' : ''
          const domainLabel = v.isMain ? `${al.mainDomain ?? 'main'}` : v.domain
          if (v.isNameOnly) {
            lines.push(`- [${domainLabel}${mainTag}${nameOnlyTag}] (no description)`)
          } else {
            lines.push(`- [${domainLabel}${mainTag}] ${v.desc}`)
          }
        }
      }
      if (al.banned.length > 0) {
        lines.push('')
        lines.push('### Bans')
        for (const b of al.banned) lines.push(`- ${b}`)
      }
      if (al.invariants.length > 0) {
        lines.push('')
        lines.push('### Invariants')
        for (const iv of al.invariants) lines.push(`- ${iv}`)
      }
    } else {
      // 🆕 v0.7.3 P3 (BWC): lean 模式 / 老 schema 渲染
      if (al.contextMode === 'lean') {
        lines.push('')
        lines.push('## Allowed Language (lean mode)')
      } else {
        lines.push('')
        lines.push('## Allowed Language')
      }
      if (al.mustUseTerms.length > 0) {
        lines.push('### Terms')
        for (const t of al.mustUseTerms) lines.push(`- ${t.name}: ${t.desc}`)
      }
      if (al.banned.length > 0) {
        lines.push('')
        lines.push('### Bans')
        for (const b of al.banned) lines.push(`- ${b}`)
      }
      if (al.invariants.length > 0) {
        lines.push('')
        lines.push('### Invariants')
        for (const iv of al.invariants) lines.push(`- ${iv}`)
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
  // 🆕 v0.7.3 P6 (RFC §2.3 + ADR-0061 §D5): Stack tools 列表
  if (c.stackTools && c.stackTools.length > 0) {
    lines.push('')
    lines.push(`## Stack Tools (${c.stackTools.length})`)
    lines.push('> Probe runtime metadata; merge into ProbeContext.stackTools for env injection.')
    for (const t of c.stackTools) {
      const meta: string[] = []
      if (t.version) meta.push(`v=${t.version}`)
      if (t.command) meta.push(`cmd=${t.command}`)
      if (t.config) meta.push(`config=${t.config}`)
      if (t.role) meta.push(`role=${t.role}`)
      const tag = meta.length > 0 ? ` (${meta.join(' | ')})` : ''
      lines.push(`  - ${t.name}${tag}`)
      // 🆕 v0.7.4 stack-operation-referent — 渲染 tool.operations 子段
      if (t.operations && t.operations.length > 0) {
        for (const op of t.operations) {
          const opTag = op.desc ? ` — ${op.desc}` : ''
          lines.push(`      · op ${op.name}: ${op.command}${opTag}`)
        }
      }
    }
  }

  // 🆕 v0.7.4 stack-operation-referent — 渲染 slot.operate 列表
  if (c.slotOperations && c.slotOperations.length > 0) {
    lines.push('')
    lines.push('## Operations to run')
    lines.push(
      '> Reference for AI Agent execution (inv-36: not enforced). Cross-reference Stack Tools above for command.',
    )
    for (const so of c.slotOperations) {
      lines.push(`  - slot=${so.slot}: [${so.operations.join(', ')}]`)
    }
  }

  return lines.join('\n')
}
