// =============================================================================
// `oxn proof` — Proof-First 入口（v0.1.3 PR-2）
//
// 5 子命令（与 README §4 字面一致）：
//   create           — 创 .openxenon/proofs/<name>/proof.md 骨架
//   probe list       — 列所有 probe（语义名 + 描述）★ AI 入口
//   probe describe   — 详述单个 probe 的输入契约 ★ AI 入口
//   probe add        — 追加 probe（语义名 + --input-json）★ AI 主操作
//   run              — 调 runner（Kernel + Infra）→ 写 frozen.json
//   list             — 列所有 proof
//   show             — 读 frozen.json + 验签 + 输出人话
//
// IAP 封装边界：AI 通过 probe list/describe/add 看到的是**语义层**
//   (semanticName + description + inputs[])。内部 ref / inputMap / verdict 逻辑
//   在 catalog 内部，不出现在 CLI 输出 / 也不出现在 skill 文件里。
//
// v0.1.3 PR-2：.running.json 三阶段协议
//   run 时序：
//     Phase 1: 写 .running.json（name/totalCount/failedCount/probes[].errorMessage=pending）
//              → 状态对 self-ref probe 可见
//     Phase 2: 串行执行 probes
//     Phase 3: 写 frozen.json → unlink .running.json
//   dry-run：只跑 Phase 1（不跑 probe、不写 frozen.json），用于探测期
//   list/show：检测 .running.json 残留 → 标 [in-progress] / ⚠️ 警告
// =============================================================================

import { defineCommand } from 'citty'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  chmodSync,
} from '@openxenon/engine/infra/filesystem'
import { createHash } from 'crypto'
import { join } from 'path'
import { t } from '@openxenon/engine/infra/i18n'
import {
  BOUNDARY_DIR,
  CACHE_DIR,
  PROBE_STATS_JSON,
  PROOFS_DIR,
  PROOF_FROZEN_JSON,
  PROOF_MD_FILE,
  PROOF_OXN_FILE,
  PROOF_VERDICT_MD,
  PROOF_WORK_HASH_FILE,
} from '@openxenon/engine/kernel'
import type { ProofDeclaration } from '@openxenon/engine/oxl'
import type { ProofProbeIR as ProofProbeDecl } from '@openxenon/engine/oxl/md-pipeline/transformers/proof'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import { executeProbe, type ProofProbeIR } from '@openxenon/engine/Proof/runner'
import {
  buildFrozenProof,
  isFrozenFileReadOnly,
  readFrozenProof,
  writeFrozenProof,
} from '@openxenon/engine/Proof/proof-frozen-writer'
import { writeVerdictMd } from '@openxenon/engine/Proof/verdict-writer'
import { renderProbeDescribeHuman, renderVerdictHuman } from '@openxenon/engine/Proof/proof-manager'
import { describeProbe, listProbesSummary, translateProbeInputs } from '@openxenon/engine/kernel'
import { updateProbeStats } from '@openxenon/engine/kernel'
import { emptyProbeStats } from '@openxenon/engine/kernel'
import { readProbeStatsFromFile, writeProbeStatsToFile } from '@openxenon/engine/infra/probes/probe-stats-store'
import { IAPError } from '@openxenon/engine/errors'
import { assertDirNameConsistent } from '@openxenon/engine/kernel'

// v0.1.3 PR-2: 临时 .running.json（proof 运行中状态）
//   物理位置: .openxenon/proofs/<name>/.running.json
//   写入时点: run Phase 1（probe 执行前）
//   删除时点: run Phase 3（frozen.json 写完后）
//   残留检测: list / show 命令检测存在 → 标 [in-progress] / ⚠️
const PROOF_RUNNING_JSON = '.running.json'

// ---------------------------------------------------------------------------
// 路径工具
// ---------------------------------------------------------------------------

function getProjectRoot(): string {
  return process.cwd()
}

function getProofsDir(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, PROOFS_DIR)
}

function getProofDir(name: string): string {
  return join(getProofsDir(), name)
}

function getProofOxnPath(name: string): string {
  return join(getProofDir(name), PROOF_OXN_FILE)
}

function getProofFrozenPath(name: string): string {
  return join(getProofDir(name), PROOF_FROZEN_JSON)
}

function getProofRunningPath(name: string): string {
  return join(getProofDir(name), PROOF_RUNNING_JSON)
}

function getProofVerdictPath(name: string): string {
  return join(getProofDir(name), PROOF_VERDICT_MD)
}

// v0.4 PR-B (Q4-A): proof 持有 work.md 不可变快照 + work-hash
//   - proof.md       = work.md 的 byte-equal 副本 (immutable, 0o444)
//   - work-hash.txt  = 该副本的 SHA-256 hex (用于 hash drift 校验)
function getProofMdPath(name: string): string {
  return join(getProofDir(name), PROOF_MD_FILE)
}

function getProofWorkHashPath(name: string): string {
  return join(getProofDir(name), PROOF_WORK_HASH_FILE)
}

// ---------------------------------------------------------------------------
// v0.4 PR-B (Q4-A): proof ↔ work 快照机制
// ---------------------------------------------------------------------------
//
// 背景：v0.3.4 proof 验证 live work.md — AI 改了 work.md 后，proof 仍验证
// "老 work.md + 新 frozen.json" 的不一致快照，证据稳定性弱。
//
// v0.4 修复：proof.md 注释含 `// proofs-target-work: <path>` 时，run 时：
//   1. 计算 work.md SHA-256 = H_live
//   2. 读 work-hash.txt 中 H_prev（首次不存在）
//   3. 一致 → 跳过拷贝（走 probe 流程）
//   4. 不一致 / 首次 → 复制 work.md → proof.md (immutable, 0o444)
//      写 H_live → work-hash.txt
//   5. 跑 probe，写 frozen.json
//
// `oxn proof verify` 重新计算 H_live 与 H_prev 比对，不一致抛 E_PROOF_WORKHASH_DRIFT
//
// proof.md 不可变（0o444）；AI 改 work.md 不影响已存 proof.md；
// 重新提交 proof 时做 hash 校验，原子写 (chmod 0o644 → write → chmod 0o444)。

/** proof.md 头部注释中可识别的元数据键 */
interface ProofMetadata {
  /** work.md 路径（相对 proof.md 或绝对） */
  'proofs-target-work'?: string
  /** 历史遗留：proof frozen.json 路径（不参与快照机制） */
  'proofs-target-frozen'?: string
}

/** 从 proof.md 头部 `//` 注释中提取元数据 */
function parseProofMetadata(oxnPath: string): ProofMetadata {
  if (!existsSync(oxnPath)) return {}
  const content = readFileSync(oxnPath, 'utf-8')
  const lines = content.split('\n')
  const meta: ProofMetadata = {}
  // 扫前 30 行（proof 头部注释通常 < 30 行）
  for (const line of lines.slice(0, 30)) {
    // 匹配 `// proofs-target-work: <value>` 形式
    const m = line.match(/^\/\/\s*(proofs-target-(?:work|frozen))\s*:\s*(.+?)\s*$/)
    if (m) {
      meta[m[1] as keyof ProofMetadata] = m[2]
    }
  }
  return meta
}

/** 算文件 SHA-256 hex */
function computeFileHash(filePath: string): string {
  const content = readFileSync(filePath)
  return createHash('sha256').update(content).digest('hex')
}

/** 解析 proofs-target-work 路径：相对 proof.md 或绝对 */
function resolveWorkPath(proofOxnPath: string, target: string): string {
  if (target.startsWith('/')) return target
  // 相对路径基于 proof.md 所在目录
  const proofDir = join(proofOxnPath, '..')
  return join(proofDir, target)
}

export type SnapshotStatus = 'unchanged' | 'updated' | 'no-target' | 'error'

export interface SnapshotResult {
  status: SnapshotStatus
  workPath?: string
  workHash?: string
  prevHash?: string
  error?: string
}

/**
 * 拷贝 work.md → proof.md (immutable, 0o444)，写 work-hash.txt
 *  - 条件：proofs-target-work 注释存在 + work.md 路径有效
 *  - 短路：H_live === H_prev 时跳过拷贝
 */
function snapshotWorkMd(proofName: string, proofOxnPath: string): SnapshotResult {
  const meta = parseProofMetadata(proofOxnPath)
  const target = meta['proofs-target-work']
  if (!target) {
    return { status: 'no-target' }
  }

  const workPath = resolveWorkPath(proofOxnPath, target)
  if (!existsSync(workPath)) {
    return {
      status: 'error',
      workPath,
      error: `work file not found at: ${workPath}`,
    }
  }

  const liveHash = computeFileHash(workPath)
  const hashPath = getProofWorkHashPath(proofName)
  const mdPath = getProofMdPath(proofName)
  const prevHash = existsSync(hashPath) ? readFileSync(hashPath, 'utf-8').trim() : undefined

  if (prevHash === liveHash && existsSync(mdPath)) {
    return { status: 'unchanged', workPath, workHash: liveHash, prevHash }
  }

  // 原子写：work-hash.txt → proof.md (immutable)
  const workContent = readFileSync(workPath, 'utf-8')

  // 1. 写 work-hash.txt (chmod 0o444, 跟 frozen.json 一致)
  const hashDir = join(hashPath, '..')
  if (!existsSync(hashDir)) mkdirSync(hashDir, { recursive: true })
  if (existsSync(hashPath)) chmodSync(hashPath, 0o644)
  try {
    writeFileSync(hashPath, `${liveHash}\n`, { mode: 0o444 })
  } finally {
    chmodSync(hashPath, 0o444)
  }

  // 2. 写 proof.md (immutable, 0o444)
  if (existsSync(mdPath)) chmodSync(mdPath, 0o644)
  try {
    writeFileSync(mdPath, workContent, { mode: 0o444 })
  } finally {
    chmodSync(mdPath, 0o444)
  }

  return { status: 'updated', workPath, workHash: liveHash, prevHash }
}

/** 比对当前 work.md hash 与 work-hash.txt */
export interface VerifyResult {
  ok: boolean
  status: 'match' | 'drift' | 'no-snapshot' | 'no-target' | 'work-missing'
  workPath?: string
  liveHash?: string
  prevHash?: string
  error?: string
}

function verifyWorkHash(proofName: string, proofOxnPath: string): VerifyResult {
  const meta = parseProofMetadata(proofOxnPath)
  const target = meta['proofs-target-work']
  if (!target) {
    return { status: 'no-target', ok: true }
  }

  const workPath = resolveWorkPath(proofOxnPath, target)
  if (!existsSync(workPath)) {
    return { status: 'work-missing', ok: false, workPath, error: `work file not found: ${workPath}` }
  }

  const liveHash = computeFileHash(workPath)
  const hashPath = getProofWorkHashPath(proofName)

  if (!existsSync(hashPath)) {
    return { status: 'no-snapshot', ok: false, workPath, liveHash, error: 'no work-hash.txt — proof never run' }
  }

  const prevHash = readFileSync(hashPath, 'utf-8').trim()

  if (liveHash === prevHash) {
    return { status: 'match', ok: true, workPath, liveHash, prevHash }
  }
  return {
    status: 'drift',
    ok: false,
    workPath,
    liveHash,
    prevHash,
    error: 'work file changed since last proof run',
  }
}

// ---------------------------------------------------------------------------
// proof file 解析（md-native → IR）
// ---------------------------------------------------------------------------

async function parseProofFile(filePath: string): Promise<{
  ok: boolean
  proof?: ProofDeclaration
  errors: string[]
}> {
  if (!existsSync(filePath)) {
    return { ok: false, errors: [`proof file not found: ${filePath}`] }
  }
  const content = readFileSync(filePath, 'utf-8')
  try {
    const { parseMarkdown } = await import('@openxenon/engine/oxl/md-pipeline/utils')
    const { extractProofIR } = await import('@openxenon/engine/oxl/md-pipeline/transformers/proof')
    const parsed = parseMarkdown(content)
    const proof = extractProofIR(parsed.tree, parsed.frontmatter)
    return { ok: true, proof, errors: [] }
  } catch (e) {
    return { ok: false, errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`] }
  }
}

/** proof IR probes → runner IR (v0.7.0: params already in correct format) */
function proofProbesToIR(proof: ProofDeclaration): ProofProbeIR[] {
  return (proof.probes ?? []).map((p: ProofProbeDecl) => {
    return {
      probeName: p.probeName,
      ref: p.ref,
      params: p.params ?? {},
    }
  })
}

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------

const createSubcommand = defineCommand({
  meta: {
    name: 'create',
    description: t('proof.create.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('proof.create.name') },
    force: { type: 'boolean', alias: 'f', description: t('proof.create.force') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const force = ctx.args.force === true || ctx.args.f === true

    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
      return outputUserInputError('OXN_INVALID_NAME', `invalid proof name: ${JSON.stringify(name)}`, {
        suggestion: 'use kebab-case / snake_case starting with a letter (e.g. "check-deploy")',
        format,
      })
    }

    const dir = getProofDir(name)
    const oxnPath = getProofOxnPath(name)
    const frozenPath = getProofFrozenPath(name)

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    if (existsSync(oxnPath) && !force) {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `proof already exists: ${oxnPath}`, {
        suggestion: 'use --force / -f to overwrite',
        format,
      })
    }

    const template = `// Proof: ${name}
// Created by: oxn proof create ${name}
//
// 物理边界：
//   - .openxenon/proofs/${name}/proof.md  — Probe 声明（你可编辑）
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

    // v1.1: 写入后回查 proof.md name ↔ 目录名 一致性（macOS-safe）
    // Proof 没有独立 validate 子命令,在 create 阶段硬阻断。
    try {
      assertDirNameConsistent(name, dir, 'proof')
    } catch (err) {
      if (err instanceof IAPError) {
        return outputError(
          {
            code: err.name,
            message: err.message,
            ...(err.context?.suggestion !== undefined ? { suggestion: String(err.context.suggestion) } : {}),
          },
          format,
        )
      }
      throw err
    }

    output(
      {
        ok: true,
        data: { name, path: oxnPath, frozenPath },
        human: t('proof.create.created', { name, path: oxnPath }),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: probe list  ★ AI 入口
// ---------------------------------------------------------------------------

const probeListSubcommand = defineCommand({
  meta: {
    name: 'list',
    description: t('proof.probeList.description'),
  },
  args: {
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const probes = listProbesSummary()
    output(
      {
        ok: true,
        data: { probes },
        human:
          probes.length === 0
            ? 'No probes available.'
            : probes
                .map((p) => `  ${p.name}\n    ${p.description}\n    requires: ${p.requiredInputs.join(', ')}`)
                .join('\n'),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: probe describe <name>  ★ AI 入口
// ---------------------------------------------------------------------------

const probeDescribeSubcommand = defineCommand({
  meta: {
    name: 'describe',
    description: t('proof.probeDescribe.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('proof.probeDescribe.name') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const info = describeProbe(name)
    if (!info) {
      return outputUserInputError('OXN_PROBE_UNKNOWN', `unknown probe: ${name}`, {
        suggestion: 'run `oxn proof probe list` to see available probes',
        format,
      })
    }
    output(
      {
        ok: true,
        data: info,
        human: renderProbeDescribeHuman(info),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: probe add <proof> <probe> --input-json '{...}'
// ---------------------------------------------------------------------------

const probeAddSubcommand = defineCommand({
  meta: {
    name: 'add',
    description: t('proof.probeAdd.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('proof.probeAdd.name') },
    probe: { type: 'positional', required: true, description: t('proof.probeAdd.probe') },
    'input-json': {
      type: 'string',
      required: true,
      description: t('proof.probeAdd.inputJson'),
    },
    probeName: { type: 'string', description: t('proof.probeAdd.probeName') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const probeSemantic = ctx.args.probe as string
    const inputJson = ctx.args['input-json'] as string
    const oxnPath = getProofOxnPath(name)

    if (!existsSync(oxnPath)) {
      return outputUserInputError('OXN_PROOF_NOT_FOUND', `proof "${name}" not found: ${oxnPath}`, {
        suggestion: `run \`oxn proof create ${name}\` first`,
        format,
      })
    }

    // 1. 解析 + 翻译（catalog 干这件事）
    let rawInputs: Record<string, unknown>
    try {
      rawInputs = JSON.parse(inputJson)
      if (typeof rawInputs !== 'object' || rawInputs === null || Array.isArray(rawInputs)) {
        throw new Error('--input-json must be a JSON object (e.g. \'{"path":"./x"}\')')
      }
    } catch (err) {
      return outputUserInputError(
        'OXN_INPUT_JSON_INVALID',
        `failed to parse --input-json: ${err instanceof Error ? err.message : String(err)}`,
        { format },
      )
    }

    let translated
    try {
      translated = translateProbeInputs(probeSemantic, rawInputs)
    } catch (err) {
      if (err instanceof IAPError) {
        // catalog 抛 IAPError（业务流阻断）→ 输出 IAP 字段供 AI 决策
        return outputError(
          {
            code: err.name,
            axis: err.axis,
            action: err.action,
            message: err.message,
            context: err.context,
          },
          format,
        )
      }
      throw err
    }

    // 2. 写 proof.md（CLI 翻译后写内部 ref + 内部 param 名 — 这就是封装边界）
    const existing = readFileSync(oxnPath, 'utf-8')
    const probeName = (ctx.args.probeName as string) ?? nextProbeName(existing)
    const paramsEntries = Object.entries(translated.internalParams)
      .map(([k, v]) => `      ${k} = "${escapeString(String(v))}"`)
      .join(',\n')

    const newBlock = `  probe "${probeName}" {
    ref "${translated.internalRef}"
    params {
${paramsEntries}
    }
  }
`
    const lastBrace = existing.lastIndexOf('}')
    const updated = existing.slice(0, lastBrace) + newBlock + existing.slice(lastBrace)
    writeFileSync(oxnPath, updated, 'utf-8')

    output(
      {
        ok: true,
        data: {
          name,
          probeName,
          semanticProbe: probeSemantic,
          internalRef: translated.internalRef,
          internalParams: translated.internalParams,
          path: oxnPath,
        },
        human: `Added probe "${probeName}" (${probeSemantic}) to proof "${name}"`,
      },
      format,
    )
  },
})

function nextProbeName(content: string): string {
  const matches = content.match(/probe "p(\d+)"/g) ?? []
  let max = 0
  for (const m of matches) {
    const n = Number(m.match(/p(\d+)/)?.[1] ?? '0')
    if (n > max) max = n
  }
  return `p${max + 1}`
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

const probeSubcommand = defineCommand({
  meta: { name: 'probe', description: t('proof.probe.description') },
  subCommands: {
    list: probeListSubcommand,
    describe: probeDescribeSubcommand,
    add: probeAddSubcommand,
  },
})

// ---------------------------------------------------------------------------
// Subcommand: run
// ---------------------------------------------------------------------------

const runSubcommand = defineCommand({
  meta: {
    name: 'run',
    description: t('proof.run.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('proof.run.name') },
    'dry-run': { type: 'boolean', description: t('proof.run.dryRun') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const dryRun = ctx.args['dry-run'] === true
    const oxnPath = getProofOxnPath(name)
    const frozenPath = getProofFrozenPath(name)
    const runningPath = getProofRunningPath(name)

    const parsed = await parseProofFile(oxnPath)
    if (!parsed.ok || !parsed.proof) {
      return outputUserInputError('OXN_PROOF_PARSE_FAILED', parsed.errors.join('; '), { format })
    }

    const probeIRs = proofProbesToIR(parsed.proof)
    if (probeIRs.length === 0) {
      return outputUserInputError('OXN_PROOF_EMPTY', `proof "${name}" has no probe declarations`, {
        suggestion: 'add at least one probe: `oxn proof probe add ...`',
        format,
      })
    }

    // v0.4 PR-B (Q4-A): Phase 0.5 — work file 不可变快照
    //   若 proof.md 含 `// proofs-target-work: <path>` 注释：
    //     1. 计算 work file SHA-256 (v0.5 Phase 3: .md 均可)
    //     2. 对比 work-hash.txt: 一致 → 跳过；不一致 → 拷贝新快照 + 写新 hash
    //   缺注释 → 跳过（兼容旧 proof.md）
    //   work file 缺失 → 抛 E_PROOF_WORK_MISSING
    const snapshot = snapshotWorkMd(name, oxnPath)
    if (snapshot.status === 'error') {
      return outputUserInputError('OXN_PROOF_WORK_MISSING', snapshot.error ?? 'work file not found', {
        suggestion: snapshot.workPath
          ? `check that \`// proofs-target-work: ${snapshot.workPath}\` points to existing work file (.md)`
          : 'add `// proofs-target-work: <path>` comment to proof.md header',
        format,
      })
    }

    // v0.1.3 PR-2: Phase 1 — 写 .running.json（self-ref probe 可见）
    // 残留检测：若上一轮 run Phase 2/3 崩溃，.running.json 可能仍在
    // → 直接覆盖（保证 idempotent 启动），让本次 run 拿到 fresh 状态
    const proofDir = getProofDir(name)
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
      // --dry-run：写完 .running.json 立即退出（不跑 probe、不写 frozen.json）
      output(
        {
          ok: true,
          data: {
            name,
            dryRun: true,
            runningPath,
            totalCount: runningBody.totalCount,
            failedCount: runningBody.failedCount,
            verdict: 'FAILED',
          },
          human: `Dry run: wrote ${runningPath} (${runningBody.totalCount} probes pending).\nProbes were NOT executed; no frozen.json written.`,
        },
        format,
      )
      return
    }

    // v0.1.3 PR-2: Phase 2 — 串行执行 probes
    const results = []
    for (const probe of probeIRs) {
      const r = await executeProbe(probe, { projectRoot: getProjectRoot() })
      results.push(r)
    }

    // v0.1.3 PR-2: Phase 3 — 写 frozen.json → 删 .running.json
    const body = buildFrozenProof({ name, probes: results })
    writeFrozenProof(frozenPath, body)
    try {
      unlinkSync(runningPath)
    } catch {
      // 删除失败：保留 .running.json 供 list/show 检测（不阻断主流程）
    }

    // 重新读取以拿到 _xenon_meta（writer 已注入）
    const readBack = readFrozenProof(frozenPath)
    const frozen = readBack.frozen

    // v0.5 PR-A: Phase 3.5 — 写 verdict.md（人类可读结案文档）
    //   与 frozen.json 同时 chmod 0o444；frozen.json 已写入后再写 verdict.md
    //   verdict.md 写失败**不影响** frozen.json 已写入的主流程（仅 stderr warning）
    let verdictWritten = false
    let verdictPath: string | null = null
    let verdictError: string | null = null
    if (frozen) {
      verdictPath = getProofVerdictPath(name)
      try {
        writeVerdictMd(verdictPath, frozen)
        verdictWritten = true
      } catch (e) {
        verdictError = e instanceof Error ? e.message : String(e)
        process.stderr.write(`warning: verdict.md write failed: ${verdictError}\n`)
      }
    }

    // v0.1.2: 追加 probe 执行历史到全局 .cache/probe-stats.json
    // 编排仅发生在 L3-CLI：L0-Processor 纯函数合并 + L1-Infra IO 写盘。
    // 写失败不影响 verdict 返回（主流程已落 frozen.json）。
    if (frozen) {
      try {
        const projectRoot = getProjectRoot()
        const statsPath = join(projectRoot, BOUNDARY_DIR, CACHE_DIR, PROBE_STATS_JSON)
        const existing = readProbeStatsFromFile(statsPath) ?? emptyProbeStats(projectRoot)
        const updated = updateProbeStats(existing, frozen)
        writeProbeStatsToFile(statsPath, updated)
      } catch (e) {
        process.stderr.write(`warning: probe-stats.json update failed: ${e instanceof Error ? e.message : String(e)}\n`)
      }
    }

    output(
      {
        ok: true,
        data: {
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
        },
        human: frozen
          ? renderVerdictHuman(name, frozen, getProjectRoot(), verdictPath, verdictWritten)
          : 'frozen write failed',
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: verify (v0.4 PR-B Q4-A)
// ---------------------------------------------------------------------------
//
// 重新计算 work.md SHA-256，与 work-hash.txt 比对：
//   - match      → 证据一致，proof 可信
//   - drift      → work.md 已被 AI 改动，旧 proof.md 快照是当前唯一可信证据
//   - no-snapshot → proof 从未 run 过
//   - no-target  → proof.md 缺 `// proofs-target-work:` 注释（无快照机制）
//   - work-missing → 注释指向的 work.md 不存在
//
// 不会改任何文件（只读操作）。

const verifySubcommand = defineCommand({
  meta: {
    name: 'verify',
    description: 'Verify proof work-hash consistency (v0.4 PR-B Q4-A). Re-hash work.md and compare to work-hash.txt.',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Proof name' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const oxnPath = getProofOxnPath(name)
    if (!existsSync(oxnPath)) {
      return outputUserInputError('OXN_PROOF_NOT_FOUND', `proof "${name}" not found`, {
        suggestion: `run \`oxn proof create ${name}\` first`,
        format,
      })
    }

    // v0.6.1-alpha.0 #5-1: 先校验 frozen.json 自身 hash 完整性（防篡改）
    const frozenPath = getProofFrozenPath(name)
    if (existsSync(frozenPath)) {
      const fr = readFrozenProof(frozenPath)
      if (!fr.ok) {
        return outputError(
          {
            code: 'E_PROOF_HASH_DRIFT',
            message: `frozen.json signature mismatch: ${fr.reason}`,
            suggestion: 're-run `oxn proof run <name>` to refresh the snapshot',
          },
          format,
        )
      }
    }

    const v = verifyWorkHash(name, oxnPath)
    if (v.status === 'drift' || v.status === 'work-missing' || v.status === 'no-snapshot') {
      // 失败：抛 E_PROOF_WORKHASH_DRIFT (drift) / E_PROOF_WORK_MISSING (work-missing) / E_PROOF_NO_SNAPSHOT
      const code =
        v.status === 'drift'
          ? 'E_PROOF_WORKHASH_DRIFT'
          : v.status === 'work-missing'
            ? 'E_PROOF_WORK_MISSING'
            : 'E_PROOF_NO_SNAPSHOT'
      return outputError(
        {
          code,
          message: v.error ?? v.status,
          ...(v.workPath ? { context: { workPath: v.workPath, liveHash: v.liveHash, prevHash: v.prevHash } } : {}),
          suggestion:
            v.status === 'drift'
              ? 're-run `oxn proof run <name>` to refresh the snapshot'
              : v.status === 'work-missing'
                ? 'check that proofs-target-work path in proof.md header points to existing work file (.md)'
                : 'run `oxn proof run <name>` to create initial snapshot',
        },
        format,
      )
    }

    output(
      {
        ok: true,
        data: {
          name,
          status: v.status,
          workPath: v.workPath,
          liveHash: v.liveHash,
          prevHash: v.prevHash,
        },
        human: renderVerifyHuman(v),
      },
      format,
    )
  },
})

function renderVerifyHuman(v: ReturnType<typeof verifyWorkHash>): string {
  if (v.status === 'no-target') {
    return `Proof has no proofs-target-work annotation — no snapshot mechanism active.`
  }
  if (v.status === 'match') {
    return `✅ Work hash matches snapshot.\n  work file: ${v.workPath}\n  hash:      ${v.liveHash}`
  }
  return `${v.status}: ${v.error ?? 'unknown'}`
}

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------

const listSubcommand = defineCommand({
  meta: { name: 'list', description: t('proof.list.description') },
  args: {
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const proofsDir = getProofsDir()
    const proofs: Array<{ name: string; hasFrozen: boolean; frozenVerdict?: string; inProgress?: boolean }> = []

    if (existsSync(proofsDir)) {
      for (const entry of readdirSync(proofsDir)) {
        const dir = join(proofsDir, entry)
        if (!statSync(dir).isDirectory()) continue
        const frozenPath = join(dir, PROOF_FROZEN_JSON)
        const runningPath = join(dir, PROOF_RUNNING_JSON)
        const hasFrozen = existsSync(frozenPath)
        const inProgress = existsSync(runningPath)
        let frozenVerdict: string | undefined
        if (hasFrozen) {
          const r = readFrozenProof(frozenPath)
          if (r.ok && r.frozen) frozenVerdict = r.frozen.verdict
        }
        proofs.push({ name: entry, hasFrozen, frozenVerdict, inProgress })
      }
    }

    output(
      {
        ok: true,
        data: { proofs },
        human:
          proofs.length > 0
            ? `Registered proofs:\n${proofs
                .map((p) => {
                  // v0.1.3 PR-2: in-progress 优先于 frozen verdict 标记
                  if (p.inProgress) return `  - ${p.name} [in-progress]`
                  const verdict = p.frozenVerdict ? ` [${p.frozenVerdict}]` : ' [no run yet]'
                  return `  - ${p.name}${verdict}`
                })
                .join('\n')}`
            : 'No proofs registered. Run `oxn proof create <name>` to create one.',
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: show
// ---------------------------------------------------------------------------

const showSubcommand = defineCommand({
  meta: { name: 'show', description: t('proof.show.description') },
  args: {
    name: { type: 'positional', required: true, description: t('proof.show.name') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const frozenPath = getProofFrozenPath(name)
    const runningPath = getProofRunningPath(name)
    const verdictPath = getProofVerdictPath(name)
    const r = readFrozenProof(frozenPath)

    if (!r.ok || !r.frozen) {
      return outputUserInputError('OXN_PROOF_NOT_RUN', r.reason ?? `frozen.json missing for proof "${name}"`, {
        suggestion: `run \`oxn proof run ${name}\` first`,
        format,
      })
    }

    // v0.1.3 PR-2: 检测 .running.json 残留 → 报告 in-progress
    // 残留意味着上次 run Phase 3 删 .running.json 失败（崩溃/OS 错误/权限）
    // 不阻断读 frozen.json，但显眼提示数据可能 stale
    const inProgress = existsSync(runningPath)

    // v0.5 PR-A: 检测 verdict.md 是否存在（用于提示人类消费者）
    const hasVerdict = existsSync(verdictPath)

    output(
      {
        ok: true,
        data: { ...r.frozen, signatureValid: true, inProgress, hasVerdict, verdictPath },
        human: renderShowHuman(r.frozen, inProgress, hasVerdict ? verdictPath : null),
      },
      format,
    )
  },
})

function renderShowHuman(
  frozen: import('@openxenon/engine/kernel/schemas/proof-schema').FrozenProof,
  inProgress: boolean = false,
  verdictPath: string | null = null,
): string {
  const lines: string[] = []
  if (inProgress) {
    lines.push(`⚠️ Warning: .running.json residue found — last run may have crashed; verdict from previous frozen.json`)
    lines.push('')
  }
  // v0.5 PR-A: 提示 verdict.md 可读
  if (verdictPath) {
    lines.push(`📄 Human-readable verdict: ${verdictPath}`)
    lines.push('')
  }
  // v0.2 T5: 3-state verdict 展示 (PASSED/FAILED/INCONCLUSIVE) + 色彩降级
  //  - TTY 启用时: PASSED=green, FAILED=red, INCONCLUSIVE=yellow
  //  - 非 TTY / --no-color: 仅 emoji 区分
  //  emoji 与色彩互为冗余: 管道 (| cat) 仍可读, TTY 仍可一眼区分
  const ttyColor = process.stdout.isTTY === true
  const verdictIcon = frozen.verdict === 'PASSED' ? '✅' : frozen.verdict === 'INCONCLUSIVE' ? '⚠️ ' : '❌'
  let verdictText = `${frozen.verdict} (${frozen.passedCount}/${frozen.totalCount}`
  if (frozen.verdict === 'INCONCLUSIVE') {
    verdictText += `, INCONCLUSIVE probes`
  }
  verdictText += ')'
  if (ttyColor) {
    const colorCode =
      frozen.verdict === 'PASSED' ? '\u001b[32m' : frozen.verdict === 'INCONCLUSIVE' ? '\u001b[33m' : '\u001b[31m'
    verdictText = `${colorCode}${verdictText}\u001b[0m`
  }
  lines.push(`Proof: ${frozen.name}`)
  lines.push(`Verdict: ${verdictIcon} ${verdictText}`)
  lines.push(`Run at: ${frozen.runAt}`)
  lines.push(`Signature: ${frozen._xenon_meta.content_hash}`)
  lines.push('')
  lines.push('Probes:')
  for (const p of frozen.probes) {
    const icon = p.verdict === 'PASSED' ? '✅' : p.verdict === 'INCONCLUSIVE' ? '⚠️ ' : '❌'
    const err = p.errorMessage ? ` — ${p.errorMessage}` : ''
    const flags =
      p.interferenceFlags && p.interferenceFlags.length > 0 ? ` [flags: ${p.interferenceFlags.join(', ')}]` : ''
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.verdict}, ${p.durationMs}ms${err}${flags}`)
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// proof command
// ---------------------------------------------------------------------------

export default defineCommand({
  meta: {
    name: 'proof',
    description: t('proof.description'),
  },
  subCommands: {
    create: createSubcommand,
    probe: probeSubcommand,
    run: runSubcommand,
    verify: verifySubcommand,
    list: listSubcommand,
    show: showSubcommand,
  },
})

// 导出辅助函数（供测试与外部调用）
export {
  getProofDir,
  getProofFrozenPath,
  getProofMdPath,
  getProofOxnPath,
  getProofVerdictPath,
  getProofWorkHashPath,
  parseProofFile,
  parseProofMetadata,
  proofProbesToIR,
  renderShowHuman,
  resolveWorkPath,
  snapshotWorkMd,
  verifyWorkHash,
  computeFileHash,
}
