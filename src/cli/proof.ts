// =============================================================================
// `oxn proof` — Proof-First 入口（v0.1.3 PR-2）
//
// 5 子命令（与 README §4 字面一致）：
//   create           — 创 .openxenon/proofs/<name>/proof.oxn 骨架
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
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { t } from '../infra/i18n'
import { URI } from 'langium'
import {
  BOUNDARY_DIR,
  CACHE_DIR,
  PROBE_STATS_JSON,
  PROOFS_DIR,
  PROOF_FROZEN_JSON,
  PROOF_OXN_FILE,
} from '../kernel/index'
import {
  createOxnParser,
  isProofDeclaration,
  type OXNDocument,
  type ProofDeclaration,
  type ProofProbeDecl,
} from '../oxl'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import { executeProbe, type ProofProbeIR } from './proof-runner'
import { buildFrozenProof, isFrozenFileReadOnly, readFrozenProof, writeFrozenProof } from './proof-frozen-writer'
import { describeProbe, listProbesSummary, translateProbeInputs } from '../kernel/index'
import { updateProbeStats } from '../kernel/index'
import { emptyProbeStats } from '../kernel/index'
import { readProbeStatsFromFile, writeProbeStatsToFile } from '../infra/probes/probe-stats-store'
import { IAPError } from '../core/errors'
import { assertDirNameConsistent } from '../kernel/index'

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

// ---------------------------------------------------------------------------
// proof.oxn 解析（Langium → IR）
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
  const parser = createOxnParser()
  const r = await parser.parse(content, URI.file(filePath))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const ast = r.ast as OXNDocument
  const proof = ast.entities.find(isProofDeclaration)
  if (!proof) {
    return { ok: false, errors: ['no ProofDeclaration found in file'] }
  }
  return { ok: true, proof, errors: [] }
}

/** proof.oxn 里的 ref/params → 内部 IR（用于 runner） */
function proofProbesToIR(proof: ProofDeclaration): ProofProbeIR[] {
  return (proof.probes ?? []).map((p: ProofProbeDecl) => {
    const params: Record<string, unknown> = {}
    if (p.params) {
      for (const pair of p.params.pairs) {
        params[pair.key] = literalToString(pair.value)
      }
    }
    return {
      probeName: p.name,
      ref: p.ref,
      params,
    }
  })
}

function literalToString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value && typeof value === 'object' && '$cstNode' in (value as Record<string, unknown>)) {
    const text = (value as { $cstNode: { text: string } }).$cstNode.text
    if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
      return text.slice(1, -1)
    }
    return text
  }
  return String(value)
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

    // v1.1: 写入后回查 proof.oxn name ↔ 目录名 一致性（macOS-safe）
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

function renderProbeDescribeHuman(info: ReturnType<typeof describeProbe> & object): string {
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

    // 2. 写 proof.oxn（CLI 翻译后写内部 ref + 内部 param 名 — 这就是封装边界）
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
          readOnly: isFrozenFileReadOnly(frozenPath),
        },
        human: frozen ? renderVerdictHuman(name, frozen) : 'frozen write failed',
      },
      format,
    )
  },
})

function renderVerdictHuman(name: string, frozen: NonNullable<ReturnType<typeof readFrozenProof>['frozen']>): string {
  const lines: string[] = []
  lines.push(`Proof "${name}" verdict: ${frozen.verdict} (${frozen.passedCount}/${frozen.totalCount})`)
  for (const p of frozen.probes) {
    const icon = p.passed ? '✅' : '❌'
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.durationMs}ms`)
  }
  lines.push(`\nProof saved: ${join(getProofDir(name), PROOF_FROZEN_JSON)}`)
  lines.push(`Read-only: ${isFrozenFileReadOnly(join(getProofDir(name), PROOF_FROZEN_JSON))}`)
  return lines.join('\n')
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

    output(
      {
        ok: true,
        data: { ...r.frozen, signatureValid: true, inProgress },
        human: renderShowHuman(r.frozen, inProgress),
      },
      format,
    )
  },
})

function renderShowHuman(
  frozen: import('../kernel/schemas/proof-schema').FrozenProof,
  inProgress: boolean = false,
): string {
  const lines: string[] = []
  if (inProgress) {
    lines.push(`Warning: .running.json residue found — last run may have crashed; verdict from previous frozen.json`)
    lines.push('')
  }
  lines.push(`Proof: ${frozen.name}`)
  lines.push(`Verdict: ${frozen.verdict} (${frozen.passedCount}/${frozen.totalCount})`)
  lines.push(`Run at: ${frozen.runAt}`)
  lines.push(`Signature: ${frozen._xenon_meta.content_hash}`)
  lines.push('')
  lines.push('Probes:')
  for (const p of frozen.probes) {
    const icon = p.passed ? '✅' : '❌'
    const err = p.errorMessage ? ` — ${p.errorMessage}` : ''
    lines.push(`  ${icon} ${p.probeName} (${p.ref}) — ${p.durationMs}ms${err}`)
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
    list: listSubcommand,
    show: showSubcommand,
  },
})

// 导出辅助函数（供测试与外部调用）
export { getProofDir, getProofFrozenPath, getProofOxnPath, parseProofFile, proofProbesToIR }
