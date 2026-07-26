// =============================================================================
// domain-proof-evaluator.ts (v0.2 Sprint 5d T12 - Three-Layer Proof v2 PR-2)
// =============================================================================

import { spawn } from 'child_process'

export type DomainProofOutcome = 'COMPLETED' | 'DEVIATED' | 'INCONCLUSIVE' | 'MANUAL_PENDING'

export interface DomainProofEval {
  outcome: DomainProofOutcome
  failureMessage?: string
  evaluatedAt: number
}

/**
 * 评估单个 domain proof (invariant)
 * - manual → MANUAL_PENDING (永远阻塞, 需人工判定)
 * - script → 执行脚本, exit 0=PASS, exit 1=FAIL, 其他=INCONCLUSIVE
 * - 其他 scope (project) → v2.0 标 MANUAL_PENDING (v2.1+ 由 oxn proof audit 跑)
 */
export async function evaluateDomainProof(
  domain: string,
  invariant: string,
  script?: string,
  manual?: string,
  scope?: string,
): Promise<DomainProofEval> {
  const now = Date.now()

  // manual 优先判定
  if (manual) {
    return {
      outcome: 'MANUAL_PENDING',
      failureMessage: `invariant "${invariant}" in domain "${domain}" requires manual assessment: ${manual}`,
      evaluatedAt: now,
    }
  }

  // project scope → v2.0 标 MANUAL_PENDING
  if (scope === 'project') {
    return {
      outcome: 'MANUAL_PENDING',
      failureMessage: `invariant "${invariant}" has scope=project (v2.1+ via oxn proof audit)`,
      evaluatedAt: now,
    }
  }

  // script 执行
  if (script) {
    return evaluateScript(domain, invariant, script)
  }

  // 缺 script 也缺 manual → 无法评估
  return {
    outcome: 'MANUAL_PENDING',
    failureMessage: `invariant "${invariant}" in domain "${domain}" has no script or manual — cannot evaluate`,
    evaluatedAt: now,
  }
}

/** 执行 script, 30s 超时, exit code → verdict */
function evaluateScript(_domain: string, invariant: string, script: string): Promise<DomainProofEval> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-c', script], {
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (d: Buffer) => (stdout += d.toString()))
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString()))

    child.on('close', (code, signal) => {
      const now = Date.now()
      if (signal === 'SIGTERM' || code === null) {
        resolve({
          outcome: 'INCONCLUSIVE',
          failureMessage: `invariant "${invariant}" script timed out (30s): ${script}`,
          evaluatedAt: now,
        })
        return
      }
      if (code === 0) {
        resolve({ outcome: 'COMPLETED', evaluatedAt: now })
      } else if (code === 1) {
        resolve({
          outcome: 'DEVIATED',
          failureMessage: `invariant "${invariant}" script exit 1: ${stderr || stdout || script}`,
          evaluatedAt: now,
        })
      } else {
        resolve({
          outcome: 'INCONCLUSIVE',
          failureMessage: `invariant "${invariant}" script exit ${code}: ${stderr || stdout || script}`,
          evaluatedAt: now,
        })
      }
    })

    child.on('error', (err) => {
      resolve({
        outcome: 'INCONCLUSIVE',
        failureMessage: `invariant "${invariant}" script exec error: ${err.message}`,
        evaluatedAt: Date.now(),
      })
    })
  })
}
