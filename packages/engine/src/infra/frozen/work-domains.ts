// =============================================================================
// work-domains.ts (v0.2 Sprint 5d T12 - Three-Layer Proof v2 PR-2)
//
// L2 frozen.json 二阶段原子写入:
//   Phase 1: work-domains.draft.json (0o644, 评估所有 invariants)
//   Phase 2: atomic rename → work-domains-frozen.json + chmod 0o444
//   hardBlocked flag + overallVerdict
//
// v0.6.1: 新增 collectWorkDomainProofs（从 CLI 移回 Engine）
// =============================================================================

import { chmod, mkdir, rename, unlink, writeFile } from '../filesystem-async'
import { join } from 'node:path'
import { readFileSync, existsSync } from '../filesystem'
import { IAPError, IAPAction, BOUNDARY_DIR } from '@openxenon/engine/kernel/index'
import { evaluateDomainProof } from './domain-proof-evaluator'
import type { DomainProofEval } from './domain-proof-evaluator'
import { resolveWorkFilePath } from '@openxenon/engine/Work/dual-state-io'
import { readDomainFile } from '@openxenon/engine/oxl/summary-extractors'

export interface WorkDomainsFrozen {
  workId: string
  finalizedAt: number
  domainProofs: Array<{
    domain: string
    invariant: string
    verdict: string
    failureMessage?: string
    evaluatedAt: number
  }>
  overallVerdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'
  hardBlocked: boolean
}

export interface FinalizeResult {
  draftPath: string
  frozenPath: string
  node: WorkDomainsFrozen
}

interface DomainProofInput {
  domain: string
  invariant: string
  script?: string
  manual?: string
  scope?: string
}

export async function finalizeWorkDomains(
  workId: string,
  projectRoot: string,
  domainProofs: DomainProofInput[],
  force?: boolean,
): Promise<FinalizeResult> {
  const worksDir = join(projectRoot, '.openxenon', 'works', workId)
  await mkdir(worksDir, { recursive: true })

  const draftPath = join(worksDir, 'work-domains.draft.json')
  const frozenPath = join(worksDir, 'work-domains-frozen.json')

  // Phase 1: 评估所有 invariants
  const evaluations = await Promise.all(
    domainProofs.map((ref) => evaluateDomainProof(ref.domain, ref.invariant, ref.script, ref.manual, ref.scope)),
  )

  const overallVerdict = computeOverall(evaluations)

  const node: WorkDomainsFrozen = {
    workId,
    finalizedAt: Date.now(),
    domainProofs: domainProofs.map((ref, i) => ({
      domain: ref.domain,
      invariant: ref.invariant,
      verdict: evaluations[i]!.verdict,
      failureMessage: evaluations[i]!.failureMessage,
      evaluatedAt: evaluations[i]!.evaluatedAt,
    })),
    overallVerdict,
    hardBlocked: overallVerdict !== 'PASS',
  }

  // 写 draft
  await writeFile(draftPath, JSON.stringify(node, null, 2), { mode: 0o644 })

  // 硬阻断检查
  if (!force) {
    const failCount = evaluations.filter((e) => e.verdict === 'FAIL').length
    const manualCount = evaluations.filter((e) => e.verdict === 'MANUAL_PENDING').length
    const inconclusiveCount = evaluations.filter((e) => e.verdict === 'INCONCLUSIVE').length

    if (failCount > 0) {
      // 删 draft
      try {
        await unlink(draftPath)
      } catch {
        /* ignore */
      }
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `Work "${workId}" domain proofs FAILED (${failCount} FAIL). ` +
          `Re-run with --force to override (NOT RECOMMENDED).`,
        { workId, draftPath, failCount, manualCount, overallVerdict },
      )
    }

    if (manualCount > 0) {
      try {
        await unlink(draftPath)
      } catch {
        /* ignore */
      }
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `Work "${workId}" has ${manualCount} MANUAL_PENDING invariants. ` +
          `Resolve all manual assessments before finalizing.`,
        { workId, draftPath, manualCount, overallVerdict },
      )
    }

    if (inconclusiveCount > 0) {
      try {
        await unlink(draftPath)
      } catch {
        /* ignore */
      }
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `Work "${workId}" has ${inconclusiveCount} INCONCLUSIVE proofs. ` +
          `Fix script non-zero/non-1 exit codes before finalizing.`,
        { workId, draftPath, inconclusiveCount, overallVerdict },
      )
    }
  }

  // Phase 2: atomic rename + chmod 0o444
  try {
    await rename(draftPath, frozenPath)
    await chmod(frozenPath, 0o444)
  } catch (err) {
    try {
      await rename(frozenPath, draftPath)
    } catch {
      /* ignore */
    }
    throw new IAPError(
      'PROOF',
      'INFRA_FAIL',
      IAPAction.YIELD_TO_HUMAN,
      `Failed to freeze work-domains: ${(err as Error).message}`,
      { workId, draftPath, frozenPath },
    )
  }

  return { draftPath, frozenPath, node }
}

function computeOverall(evals: DomainProofEval[]): 'PASS' | 'FAIL' | 'INCONCLUSIVE' {
  if (evals.length === 0) return 'PASS'
  if (evals.some((e) => e.verdict === 'FAIL')) return 'FAIL'
  if (evals.some((e) => e.verdict === 'MANUAL_PENDING' || e.verdict === 'INCONCLUSIVE')) return 'INCONCLUSIVE'
  return 'PASS'
}

/**
 * 🆕 v0.6.1: 收集 Work 引用 Domain 的 invariant，构造 DomainProofInput[]。
 * 从 work.md ## Use 提取 kind:domain 的 domain → 读每个 Domain.md 的 ## Invariants。
 *
 * 原位于 CLI（work.ts:2883），因 Engine 通用性需要移回 Engine。
 */
export function collectWorkDomainProofs(
  projectRoot: string,
  workName: string,
  assetFormat: string,
): Array<{ domain: string; invariant: string }> {
  const workFile = resolveWorkFilePath(projectRoot, workName, assetFormat)
  if (!existsSync(workFile)) return []
  const content = readFileSync(workFile, 'utf-8')

  const refsSection = content.match(/## Use\n([\s\S]*?)(?=\n## |\n# |$)/)
  const domains: string[] = []
  if (refsSection) {
    for (const block of refsSection[1]!.split(/\n(?=### )/)) {
      if (!block.startsWith('### ')) continue
      // 提取第一行作为 name（去掉 ### 前缀）
      const firstLine = block.split('\n')[0] ?? ''
      const name = firstLine.replace(/^### /, '').trim()
      const kind = block.match(/- kind:\s*(\S+)/)?.[1]
      if (kind === 'domain') domains.push(name)
    }
  }

  const inputs: Array<{ domain: string; invariant: string }> = []
  for (const d of domains) {
    const candidates = [
      join(projectRoot, BOUNDARY_DIR, 'domains', `${d}.md`),
      join(projectRoot, BOUNDARY_DIR, 'domains', d.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(), 'domain.md'),
    ]
    for (const p of candidates) {
      if (!existsSync(p)) continue
      const dom = readDomainFile(p)
      if (dom?.language?.invariant) {
        for (const inv of dom.language.invariant) {
          inputs.push({ domain: d, invariant: inv })
        }
      }
      break
    }
  }
  return inputs
}
