import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON, PROOFS_DIR, PROOF_FROZEN_JSON, PROOF_OXN_FILE } from '@openxenon/engine/kernel'
import { createOxnParser, isProofDeclaration, type ProofDeclaration } from '@openxenon/engine/oxl'
import { executeProbe } from './runner'
import { updateProbeStats, emptyProbeStats, describeProbe } from '@openxenon/engine/kernel'
import { readProbeStatsFromFile, writeProbeStatsToFile } from '@openxenon/engine/infra/probes/probe-stats-store'
import { assertDirNameConsistent } from '@openxenon/engine/kernel'

function getProofsDir(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR, PROOFS_DIR)
}

function getProofDir(projectRoot: string, name: string): string {
  return join(getProofsDir(projectRoot), name)
}

function getProofOxnPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), PROOF_OXN_FILE)
}

function getProofFrozenPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON)
}

function getProofRunningPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), '.running.json')
}

function getProofVerdictPath(projectRoot: string, name: string): string {
  return join(getProofDir(projectRoot, name), 'verdict.md')
}

export interface CreateProofParams {
  projectRoot: string
  name: string
  force: boolean
}

export interface CreateProofResult {
  ok: true
  name: string
  path: string
  frozenPath: string
}

export function createProof(params: CreateProofParams): CreateProofResult {
  const { projectRoot, name, force } = params

  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
    throw new Error(`invalid proof name: ${JSON.stringify(name)}`)
  }

  const dir = getProofDir(projectRoot, name)
  const oxnPath = getProofOxnPath(projectRoot, name)
  const frozenPath = getProofFrozenPath(projectRoot, name)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  if (existsSync(oxnPath) && !force) {
    throw new Error(`proof already exists: ${oxnPath}`)
  }

  const template = `// Proof: ${name}
// Created by: oxn proof create ${name}
//
// 物理边界：
//   - .openxenon/proofs/${name}/proof.oxn  — Probe 声明（你可编辑）
//   - .openxenon/proofs/${name}/frozen.json — 判决书（不可手改，由 Core 独占）
//
// Workflow（语义化）：
//   1. 查可用 probe：     oxn proof probe list
//   2. 查 probe 详情：   oxn proof probe describe <name>
//   3. 追加 probe：      oxn proof probe add ${name} <name> --input-json '{"key":"value"}'
//   4. 跑证明：          oxn proof run ${name}
//   5. 读 verdict：      oxn proof show ${name}

proof "${name}" {
  description = "TODO: 一句话描述这个 proof 验收什么"
}
`
  writeFileSync(oxnPath, template, 'utf-8')

  try {
    assertDirNameConsistent(name, dir, 'proof')
  } catch (err) {
    if (err instanceof Error) throw err
    throw err
  }

  return {
    ok: true,
    name,
    path: oxnPath,
    frozenPath,
  }
}

export interface RunProofParams {
  projectRoot: string
  name: string
  dryRun?: boolean
}

export interface RunProofResult {
  ok: true
  name: string
  verdict: string
  totalCount: number
  passedCount: number
  failedCount: number
  frozenPath: string
  verdictPath: string | null
  verdictWritten: boolean
  verdictError: string | null
  readOnly: boolean
}

export async function runProof(params: RunProofParams): Promise<RunProofResult> {
  const { projectRoot, name, dryRun = false } = params
  const oxnPath = getProofOxnPath(projectRoot, name)
  const frozenPath = getProofFrozenPath(projectRoot, name)
  const runningPath = getProofRunningPath(projectRoot, name)

  const parsed = await parseProofFile(oxnPath)
  if (!parsed.ok || !parsed.proof) {
    throw new Error(parsed.errors.join('; '))
  }

  const probeIRs = proofProbesToIR(parsed.proof)
  if (probeIRs.length === 0) {
    throw new Error(`proof "${name}" has no probe declarations`)
  }

  const snapshot = snapshotWorkMd(name, oxnPath)
  if (snapshot.status === 'error') {
    throw new Error(snapshot.error ?? 'work file not found')
  }

  const proofDir = getProofDir(projectRoot, name)
  if (!existsSync(proofDir)) {
    mkdirSync(proofDir, { recursive: true })
  }
  const runningBody = {
    name,
    runAt: new Date().toISOString(),
    verdict: 'FAILED' as 'FAILED' | 'PASSED',
    totalCount: probeIRs.length,
    passedCount: 0,
    failedCount: probeIRs.length,
    probes: probeIRs.map((p) => ({
      probeName: p.probeName,
      ref: p.ref,
      passed: false,
      durationMs: 0,
      errorMessage: 'pending',
    })),
  }
  writeFileSync(runningPath, JSON.stringify(runningBody, null, 2), 'utf-8')

  if (dryRun) {
    return {
      ok: true,
      name,
      verdict: 'FAILED',
      totalCount: runningBody.totalCount,
      passedCount: 0,
      failedCount: runningBody.failedCount,
      frozenPath,
      verdictPath: null,
      verdictWritten: false,
      verdictError: null,
      readOnly: false,
    }
  }

  const results = []
  for (const probe of probeIRs) {
    const r = await executeProbe(probe, { projectRoot })
    results.push(r)
  }

  const body = buildFrozenProof({ name, probes: results })
  writeFrozenProof(frozenPath, body)
  try {
    unlinkSync(runningPath)
  } catch {
    // deletion failure does not block
  }

  const readBack = readFrozenProof(frozenPath)
  const frozen = readBack.frozen

  let verdictWritten = false
  let verdictPath: string | null = null
  let verdictError: string | null = null
  if (frozen) {
    verdictPath = getProofVerdictPath(projectRoot, name)
    try {
      writeVerdictMd(verdictPath, frozen)
      verdictWritten = true
    } catch (e) {
      verdictError = e instanceof Error ? e.message : String(e)
      process.stderr.write(`warning: verdict.md write failed: ${verdictError}\n`)
    }
  }

  if (frozen) {
    try {
      const statsPath = join(projectRoot, BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON)
      const existing = readProbeStatsFromFile(statsPath) ?? emptyProbeStats(projectRoot)
      const updated = updateProbeStats(existing, frozen)
      writeProbeStatsToFile(statsPath, updated)
    } catch (e) {
      process.stderr.write(`warning: probe-stats.json update failed: ${e instanceof Error ? e.message : String(e)}\n`)
    }
  }

  return {
    ok: true,
    name,
    verdict: frozen?.verdict ?? 'FAILED',
    totalCount: frozen?.totalCount ?? 0,
    passedCount: frozen?.passedCount ?? 0,
    failedCount: frozen?.failedCount ?? 0,
    frozenPath,
    verdictPath,
    verdictWritten,
    verdictError,
    readOnly: isFrozenFileReadOnly(frozenPath),
  }
}

async function parseProofFile(oxnPath: string): Promise<{ ok: boolean; proof?: ProofDeclaration; errors: string[] }> {
  if (!existsSync(oxnPath)) {
    return { ok: false, errors: [`proof file not found: ${oxnPath}`] }
  }
  const content = readFileSync(oxnPath, 'utf-8')
  const parser = createOxnParser()
  const r = await parser.parse(content)
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const ast = r.ast
  const proof = ast.entities.find(isProofDeclaration) as ProofDeclaration | undefined
  if (!proof) {
    return { ok: false, errors: ['no proof declaration found'] }
  }
  return { ok: true, proof, errors: [] }
}

export function renderProbeDescribeHuman(info: ReturnType<typeof describeProbe> & object): string {
  const lines: string[] = []
  lines.push(`# ${info.name}`)
  lines.push(info.description)
  lines.push('')
  lines.push('Inputs:')
  for (const inp of info.inputs) {
    const req = inp.required ? '(required)' : '(optional)'
    lines.push(`  - ${inp.name}: ${inp.type} ${req} — ${inp.description}`)
  }
  if (info.examples.length > 0) {
    lines.push('')
    lines.push('Examples:')
    for (const ex of info.examples) {
      const inputs = JSON.stringify(ex.inputs)
      lines.push(`  - ${ex.name}:`)
      lines.push(`      oxn proof probe add <proof> ${info.name} --input-json '${inputs}'`)
    }
  }
  return lines.join('\n')
}

export function renderVerdictHuman(
  name: string,
  frozen: NonNullable<ReturnType<typeof readFrozenProof>['frozen']>,
  projectRoot: string,
  verdictPath: string | null = null,
  verdictWritten: boolean = false,
): string {
  const lines: string[] = []
  lines.push(`Proof "${name}" verdict: ${frozen.verdict} (${frozen.passedCount}/${frozen.totalCount})`)
  for (const p of frozen.probes) {
    const icon = p.passed ? '✅' : '❌'
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.durationMs}ms`)
  }
  lines.push(`\nProof saved: ${join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON)}`)
  lines.push(`Read-only: ${isFrozenFileReadOnly(join(getProofDir(projectRoot, name), PROOF_FROZEN_JSON))}`)
  if (verdictWritten && verdictPath) {
    lines.push(`Verdict doc: ${verdictPath}`)
  }
  return lines.join('\n')
}
