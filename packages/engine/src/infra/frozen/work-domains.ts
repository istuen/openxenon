// =============================================================================
// work-domains.ts (v0.2 Sprint 5d T12 - Three-Layer Proof v2 PR-2)
//
// L2 frozen.json 二阶段原子写入:
//   Phase 1: work-domains.draft.json (0o644, 评估所有 invariants)
//   Phase 2: atomic rename → work-domains-frozen.json + chmod 0o444
//   hardBlocked flag + overallVerdict
// =============================================================================

import { chmod, mkdir, rename, unlink, writeFile } from '../filesystem-async'
import { join } from 'node:path'
import { IAPError, IAPAction } from '@openxenon/engine/kernel/index'
import { evaluateDomainProof } from './domain-proof-evaluator'
import type { DomainProofEval } from './domain-proof-evaluator'

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
