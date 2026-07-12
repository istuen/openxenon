// =============================================================================
// pipeline-analyzer.ts (v0.5 PR-C)
//
// L1-Infra IO：跨 subsystems 数据加载，组装 PipelineInput 供 L0 compute。
//
// 扫描来源：
//   - domains/*.md  → 提取 name + invariants（slim regex 解析）
//   - blueprints/*.md → 提取 name + slots[*].observe（slim regex 解析）
//   - works/*/         → 提取 domainRefs / blueprintRefs / proof 关联
//   - proofs/*/frozen.json → proof verdict + probe summary
//
// 纯洁性约束：
//   - 本模块只做文件 IO + schema 校验 + 数据提取
//   - 不调 L0-Processor 任何计算函数（L0 做 invariant→probeType 映射）
//   - 路径由 L3-CLI 传入（BOUNDARY_DIR 既存，本层使用合规）
//
// Work ↔ Proof 关联策略（优先级降级）：
//   1. 名称约定：proof 名与 work 名相同
//   2. 备选：扫描 works/<w>/.run/frozen.json 下 work-domains-frozen.json
//   3. 末选：works/<w>/.run/tasks/*/frozen.json（per-task proof）
//
// v0.7.0: domains/blueprints 扫描 .md only.
// =============================================================================

import { join } from 'path'
import { existsSync, readdirSync, readFileSync, statSync } from '@openxenon/engine/infra/filesystem'
import {
  BOUNDARY_DIR,
  DOMAINS_DIR,
  PROOFS_DIR,
  safeValidateFrozenProof,
  WORK_FILE_ENTRY,
  WORK_RUN_TRACE_JSONL,
  RUN_TASKS_SUBDIR,
  RUN_DIR,
  type FrozenProof,
} from '@openxenon/engine/kernel/index'

const BLUEPRINTS_DIR = 'blueprints'

// ─── Domain 解析（slim regex） ──────────────────────────────────────────────

interface SlimDomain {
  name: string
  invariants: Array<{ value: string }>
}

function parseSlimDomain(content: string, _fileName: string): SlimDomain | null {
  // MD-native: extract name from frontmatter or H1
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const fm = fmMatch?.[1] ?? ''
  const nameFm = fm.match(/^name:\s*(.+)$/m)
  const nameH1 = content.match(/^# Domain:\s*(.+)$/m)
  const name = nameFm?.[1]?.trim() ?? nameH1?.[1]?.trim()
  if (!name) return null

  const invariants: Array<{ value: string }> = []
  // MD format: ## Invariants section with list items
  const invSection = content.match(/## Invariants?\n([\s\S]*?)(?=\n## |\n*$)/)
  if (invSection?.[1]) {
    const items = invSection[1].matchAll(/^- (.+)$/gm)
    for (const m of items) {
      const v = m[1]!.trim()
      if (v) invariants.push({ value: v })
    }
  }
  return { name, invariants }
}

// ─── Blueprint 解析（slim regex） ────────────────────────────────────────────

interface SlimBlueprint {
  name: string
  slots: Array<{ name: string; observe: string[] }>
}

function parseSlimBlueprint(content: string, _fileName: string): SlimBlueprint | null {
  // MD-native: extract name from frontmatter or H1
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const fm = fmMatch?.[1] ?? ''
  const nameFm = fm.match(/^name:\s*(.+)$/m)
  const nameH1 = content.match(/^# Blueprint:\s*(.+)$/m)
  const name = nameFm?.[1]?.trim() ?? nameH1?.[1]?.trim()
  if (!name) return null

  const slots: Array<{ name: string; observe: string[] }> = []
  // MD format: ## Slots section with ### slot-name and - observe: [...] list
  const slotsSection = content.match(/## Slots\n([\s\S]*?)(?=\n## |\n*$)/)
  if (slotsSection?.[1]) {
    const slotBlocks = Array.from(slotsSection[1].matchAll(/### (.+)\n([\s\S]*?)(?=### |\n## |\n*$)/g))
    for (const m of slotBlocks) {
      const slotName = m[1]!.trim()
      const slotBody = m[2]!
      const observeList: string[] = []
      const observeMatch = slotBody.match(/- observe:\s*\n((?:\s+- .+\n?)*)/)
      if (observeMatch?.[1]) {
        const items = observeMatch[1].matchAll(/^- (.+)$/gm)
        for (const item of items) {
          observeList.push(item[1]!.trim())
        }
      }
      slots.push({ name: slotName, observe: observeList })
    }
  }
  return { name, slots }
}

// ─── Work → Proof 关联 ────────────────────────────────────────────────────────

interface WorkProofLink {
  workName: string
  domainRefs: string[]
  blueprintRefs: string[]
  proofIds: string[]
  traceEventCount: number
}

function extractWorkInfo(
  workDir: string,
  workName: string,
  _projectRoot: string,
  allProofNames: string[],
): WorkProofLink | null {
  const workMdPath = join(workDir, WORK_FILE_ENTRY)
  if (!existsSync(workMdPath)) return null

  const content = readFileSync(workMdPath, 'utf-8')

  // MD-native: extract refs from ## Refs section
  const refsSection = content.match(/## Refs\n([\s\S]*?)(?=\n## |\n*$)/)
  const refsText = refsSection?.[1] ?? ''

  // Extract domain refs: - domain: Name @scope/domains/Name
  const domainRefs: string[] = []
  const domainItems = refsText.matchAll(/^- domain:\s*.+$/gm)
  for (const m of domainItems) {
    const refMatch = m[0].match(/@[^/\s]+\/domains\/([^.\s]+)/)
    const nameMatch = m[0].match(/^- domain:\s*(\S+)/)
    domainRefs.push(refMatch?.[1] ?? nameMatch?.[1] ?? '')
  }

  // Extract blueprint refs: - blueprint: Name @scope/blueprints/Name
  const blueprintRefs: string[] = []
  const bpItems = refsText.matchAll(/^- blueprint:\s*.+$/gm)
  for (const m of bpItems) {
    const refMatch = m[0].match(/@[^/\s]+\/blueprints\/([^.\s]+)/)
    const nameMatch = m[0].match(/^- blueprint:\s*(\S+)/)
    blueprintRefs.push(refMatch?.[1] ?? nameMatch?.[1] ?? '')
  }

  // 策略 1：同名 proof
  const proofIds = allProofNames.filter((p) => p === workName)

  // 策略 2：works/<w>/.run/frozen.json
  const workRunFrozen = join(workDir, RUN_DIR, 'frozen.json')
  if (existsSync(workRunFrozen)) {
    try {
      const wf = JSON.parse(readFileSync(workRunFrozen, 'utf-8'))
      if (wf.name && !proofIds.includes(wf.name)) proofIds.push(wf.name)
    } catch {
      /* ignore */
    }
  }

  // 策略 3：works/<w>/.run/tasks/*/frozen.json
  const tasksRunDir = join(workDir, RUN_DIR, RUN_TASKS_SUBDIR)
  if (existsSync(tasksRunDir)) {
    try {
      const entries = readdirSync(tasksRunDir)
      for (const entry of entries) {
        const taskFrozen = join(tasksRunDir, entry, 'frozen.json')
        if (existsSync(taskFrozen)) {
          // task frozen exists but doesn't directly reference work
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Trace event count
  let traceEventCount = 0
  const tracePath = join(workDir, RUN_DIR, WORK_RUN_TRACE_JSONL)
  if (existsSync(tracePath)) {
    try {
      const lines = readFileSync(tracePath, 'utf-8').split('\n').filter(Boolean)
      traceEventCount = lines.length
    } catch {
      /* ignore */
    }
  }

  return { workName, domainRefs, blueprintRefs, proofIds, traceEventCount }
}

// ─── 顶层：组装 PipelineInput ─────────────────────────────────────────────────

export function scanPipelineInput(projectRoot: string): PipelineScanResult {
  const boundary = join(projectRoot, BOUNDARY_DIR)

  // 1. 扫描 domains（.md only）
  const domains: SlimDomain[] = []
  const domainsDir = join(boundary, DOMAINS_DIR)
  if (existsSync(domainsDir)) {
    try {
      for (const entry of readdirSync(domainsDir)) {
        if (!entry.endsWith('.md')) continue
        const path = join(domainsDir, entry)
        const content = readFileSync(path, 'utf-8')
        const domain = parseSlimDomain(content, entry)
        if (domain) domains.push(domain)
      }
    } catch {
      /* ignore */
    }
  }

  // 2. 扫描 blueprints（.md only）
  const blueprints: SlimBlueprint[] = []
  const blueprintsDir = join(boundary, BLUEPRINTS_DIR)
  if (existsSync(blueprintsDir)) {
    try {
      for (const entry of readdirSync(blueprintsDir)) {
        if (!entry.endsWith('.md')) continue
        const path = join(blueprintsDir, entry)
        const content = readFileSync(path, 'utf-8')
        const bp = parseSlimBlueprint(content, entry)
        if (bp) blueprints.push(bp)
      }
    } catch {
      /* ignore */
    }
  }

  // 3. 扫描 proofs（先收集所有 proof names，后续 work 关联需要）
  const allProofNames: string[] = []
  const allFrozenProofs: FrozenProof[] = []
  const proofsDir = join(boundary, PROOFS_DIR)
  if (existsSync(proofsDir)) {
    try {
      for (const entry of readdirSync(proofsDir)) {
        const proofDir = join(proofsDir, entry)
        if (!statSync(proofDir).isDirectory()) continue
        const frozenPath = join(proofDir, 'frozen.json')
        if (!existsSync(frozenPath)) continue
        const runningPath = join(proofDir, '.running.json')
        if (existsSync(runningPath)) continue // skip in-progress

        allProofNames.push(entry)
        try {
          const raw = JSON.parse(readFileSync(frozenPath, 'utf-8'))
          const v = safeValidateFrozenProof(raw)
          if (v.success) allFrozenProofs.push(v.data)
        } catch {
          /* ignore parse failures */
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 4. 扫描 works
  const works: WorkProofLink[] = []
  const worksDir = join(boundary, 'works')
  if (existsSync(worksDir)) {
    try {
      for (const entry of readdirSync(worksDir)) {
        const workDir = join(worksDir, entry)
        if (!statSync(workDir).isDirectory()) continue
        const wi = extractWorkInfo(workDir, entry, projectRoot, allProofNames)
        if (wi) works.push(wi)
      }
    } catch {
      /* ignore */
    }
  }

  return { projectRoot, domains, blueprints, works, allFrozenProofs }
}

export interface PipelineScanResult {
  projectRoot: string
  domains: SlimDomain[]
  blueprints: SlimBlueprint[]
  works: WorkProofLink[]
  allFrozenProofs: FrozenProof[]
}

// Re-export for convenience
export type { WorkProofLink }
