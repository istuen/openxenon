// =============================================================================
// pipeline-analyzer.ts (v0.5 PR-C)
//
// L1-Infra IO：跨 subsystems 数据加载，组装 PipelineInput 供 L0 compute。
//
// 扫描来源：
//   - domains/*.oxn  → 提取 name + invariants（slim regex 解析）
//   - blueprints/*.oxn → 提取 name + slots[*].observe（slim regex 解析）
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
// =============================================================================

import { join } from 'path'
import { existsSync, readdirSync, readFileSync, statSync } from '../filesystem'
import {
  BOUNDARY_DIR,
  DOMAINS_DIR,
  PROOFS_DIR,
  safeValidateFrozenProof,
  WORK_OXN_FILE,
  WORK_RUN_TRACE_JSONL,
  RUN_TASKS_SUBDIR,
  RUN_DIR,
  type FrozenProof,
} from '../../kernel/index'

const BLUEPRINTS_DIR = 'blueprints'

// ─── Domain 解析（slim regex） ──────────────────────────────────────────────

interface SlimDomain {
  name: string
  invariants: Array<{ value: string }>
}

function parseSlimDomain(content: string, _fileName: string): SlimDomain | null {
  const nameMatch = content.match(/domain\s+"([^"]+)"/)
  if (!nameMatch?.[1]) return null
  const name = nameMatch[1]

  const invariants: Array<{ value: string }> = []
  // 匹配 invariant { "..." [ "..." ] } 多行块
  const invBlock = content.match(/invariant\s*\{([^}]+)\}/s)
  if (invBlock?.[1]) {
    const invContent = invBlock[1]
    // 提取所有引号中的字符串
    const quoted = invContent.match(/"([^"]+)"/g) ?? []
    for (const q of quoted) {
      const v = q.replace(/^"|"$/g, '').trim()
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
  const nameMatch = content.match(/blueprint\s+"([^"]+)"/)
  if (!nameMatch?.[1]) return null
  const name = nameMatch[1]

  const slots: Array<{ name: string; observe: string[] }> = []
  // 匹配 slot "..." { ... observe = ["...", "..."] ... }
  const slotRegex = /slot\s+"([^"]+)"\s*\{([^}]+)\}/gs
  let match: RegExpExecArray | null
  while ((match = slotRegex.exec(content)) !== null) {
    const slotName = match[1]!
    const slotBody = match[2]!
    const observeList: string[] = []
    const observeMatch = slotBody.match(/observe\s*=\s*\[([^\]]+)\]/)
    if (observeMatch?.[1]) {
      const quoted = observeMatch[1].match(/"([^"]+)"/g) ?? []
      for (const q of quoted) {
        observeList.push(q.replace(/^"|"$/g, '').trim())
      }
    }
    slots.push({ name: slotName, observe: observeList })
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
  const workOxnPath = join(workDir, WORK_OXN_FILE)
  if (!existsSync(workOxnPath)) return null

  const content = readFileSync(workOxnPath, 'utf-8')

  // 提取 domain refs
  const domainRefs: string[] = []
  const domainRegex = /domain\s+"([^"]+)"\s+ref\s+"@prj\/domains\/([^"]+)"/g
  let dm: RegExpExecArray | null
  while ((dm = domainRegex.exec(content)) !== null) {
    domainRefs.push(_stripOxnExt(dm[2] ?? dm[1]!))
  }

  // 提取 blueprint refs
  const blueprintRefs: string[] = []
  const bpRegex = /blueprint\s+"([^"]+)"\s+ref\s+"@prj\/blueprints\/([^"]+)"/g
  let bm: RegExpExecArray | null
  while ((bm = bpRegex.exec(content)) !== null) {
    blueprintRefs.push(_stripOxnExt(bm[2] ?? bm[1]!))
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

function _stripOxnExt(s: string): string {
  return s.replace(/\.oxn$/, '')
}

// ─── 顶层：组装 PipelineInput ─────────────────────────────────────────────────

export function scanPipelineInput(projectRoot: string): PipelineScanResult {
  const boundary = join(projectRoot, BOUNDARY_DIR)

  // 1. 扫描 domains
  const domains: SlimDomain[] = []
  const domainsDir = join(boundary, DOMAINS_DIR)
  if (existsSync(domainsDir)) {
    try {
      for (const entry of readdirSync(domainsDir)) {
        if (!entry.endsWith('.oxn')) continue
        const path = join(domainsDir, entry)
        const content = readFileSync(path, 'utf-8')
        const domain = parseSlimDomain(content, entry)
        if (domain) domains.push(domain)
      }
    } catch {
      /* ignore */
    }
  }

  // 2. 扫描 blueprints
  const blueprints: SlimBlueprint[] = []
  const blueprintsDir = join(boundary, BLUEPRINTS_DIR)
  if (existsSync(blueprintsDir)) {
    try {
      for (const entry of readdirSync(blueprintsDir)) {
        if (!entry.endsWith('.oxn')) continue
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
