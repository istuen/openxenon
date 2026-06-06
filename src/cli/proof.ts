// =============================================================================
// `oxn proof` — Proof-First 入口（v0.1.2）
//
// 5 子命令（与 README §4 / iap-paradigm §9.3 / document §4.3 字面一致）：
//   create     — 创 .openxenon/proofs/<name>/proof.oxn 骨架
//   probe add  — 追加 probe 到 proof.oxn
//   run        — 调 runner（Phase A: stub）→ 写 frozen.json（带签名 + chmod 0o444）
//   list       — 列所有 proof
//   show       — 读 frozen.json + 输出人话
//
// IAP 守护：frozen.json 写路径只在本 CLI（proof-frozen-writer）内，
//   AI 不得绕过本 CLI 直接写 .openxenon/proofs/<name>/frozen.json。
// =============================================================================

import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR, PROOFS_DIR, PROOF_FROZEN_JSON, PROOF_OXN_FILE } from '../kernel/constants'
import {
  createOxnParser,
  isProofDeclaration,
  type OXNDocument,
  type ProofDeclaration,
  type ProofProbeDecl,
} from '../oxn-dsl'
import { getFormatFromArgs, output, outputError } from './output'
import { executeProbe, type ProofProbeIR } from './proof-runner'
import { buildFrozenProof, isFrozenFileReadOnly, readFrozenProof, writeFrozenProof } from './proof-frozen-writer'

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

// ---------------------------------------------------------------------------
// proof.oxn 解析（用 Langium parser）
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
    description: '在 .openxenon/proofs/<name>/ 生成 proof.oxn 骨架',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Proof 名称（kebab-case 推荐）' },
    force: { type: 'boolean', alias: 'f', description: '覆盖已存在的 proof.oxn' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const force = ctx.args.force === true || ctx.args.f === true

    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
      return outputError(
        {
          code: 'OXN_INVALID_NAME',
          message: `invalid proof name: ${JSON.stringify(name)}`,
          suggestion: 'use kebab-case / snake_case starting with a letter (e.g. "check-deploy" or "build_artifact")',
        },
        format,
      )
    }

    const dir = getProofDir(name)
    const oxnPath = getProofOxnPath(name)
    const frozenPath = getProofFrozenPath(name)

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    if (existsSync(oxnPath) && !force) {
      return outputError(
        {
          code: 'OXN_OUTPUT_FILE_EXISTS',
          message: `proof already exists: ${oxnPath}`,
          suggestion: 'use --force / -f to overwrite',
        },
        format,
      )
    }

    const template = `// Proof: ${name}
// Created by: oxn proof create ${name}
//
// 物理边界：
//   - .openxenon/proofs/${name}/proof.oxn  — Probe 声明（你可编辑）
//   - .openxenon/proofs/${name}/frozen.json — 判决书（不可手改，由 Core 独占）
//
// 校验：oxn proof show ${name}
// 运行：oxn proof run ${name}
// 列出全部 probe：oxn proof probe add --help

proof "${name}" {
  description = "TODO: 一句话描述这个 proof 验收什么"

  probe "p1" {
    ref "@oxn/probe/fs-exists"
    params {
      target = "./package.json"
    }
  }
}
`
    writeFileSync(oxnPath, template, 'utf-8')

    output(
      {
        ok: true,
        data: {
          name,
          path: oxnPath,
          frozenPath,
        },
        human: `Created proof "${name}" at ${oxnPath}\n\nNext:\n  1. Edit ${oxnPath} (or use \`oxn proof probe add\`)\n  2. Run: \`oxn proof run ${name}\`\n  3. Show verdict: \`oxn proof show ${name}\``,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: probe add
// ---------------------------------------------------------------------------

const probeAddSubcommand = defineCommand({
  meta: {
    name: 'add',
    description: '追加一个 probe 到已存在的 proof.oxn',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Proof 名称（已存在）' },
    ref: { type: 'string', required: true, description: 'Probe 引用（如 @oxn/probe/fs-exists）' },
    target: { type: 'string', description: 'fs-exists 的 pattern 参数' },
    command: { type: 'string', description: 'shell-exec 的 command 参数' },
    timeout: { type: 'string', description: 'shell-exec 的 timeout 参数（ms）' },
    probeName: { type: 'string', description: '自定义 probe 名（默认 p1/p2/...）' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const ref = ctx.args.ref as string
    const oxnPath = getProofOxnPath(name)

    if (!existsSync(oxnPath)) {
      return outputError(
        {
          code: 'OXN_PROOF_NOT_FOUND',
          message: `proof "${name}" not found: ${oxnPath}`,
          suggestion: `run \`oxn proof create ${name}\` first`,
        },
        format,
      )
    }

    // 根据 ref 类型决定 params schema
    const params: Record<string, string> = {}
    if (ref === '@oxn/probe/fs-exists' || ref.endsWith('/fs-exists')) {
      if (!ctx.args.target) {
        return outputError(
          {
            code: 'OXN_MISSING_PARAM',
            message: 'fs-exists probe requires --target <pattern>',
            suggestion: 'pass --target with a glob pattern (e.g. --target "./dist/index.js")',
          },
          format,
        )
      }
      params.target = ctx.args.target as string
    } else if (ref === '@oxn/probe/shell-exec' || ref.endsWith('/shell-exec')) {
      if (!ctx.args.command) {
        return outputError(
          {
            code: 'OXN_MISSING_PARAM',
            message: 'shell-exec probe requires --command "<cmd>"',
            suggestion: 'pass --command (e.g. --command "bun test")',
          },
          format,
        )
      }
      params.command = ctx.args.command as string
      if (ctx.args.timeout) params.timeout = ctx.args.timeout as string
    } else {
      return outputError(
        {
          code: 'OXN_UNKNOWN_PROBE',
          message: `unknown probe ref: ${ref}`,
          suggestion: 'Phase A 支持：@oxn/probe/fs-exists / @oxn/probe/shell-exec',
        },
        format,
      )
    }

    // 计算下一个 probe 编号
    const existing = readFileSync(oxnPath, 'utf-8')
    const probeName = (ctx.args.probeName as string) ?? nextProbeName(existing)
    const paramsBlock = Object.entries(params)
      .map(([k, v]) => `      ${k} = "${escapeString(v)}"`)
      .join('\n')

    const newBlock = `  probe "${probeName}" {
    ref "${ref}"
    params {
${paramsBlock}
    }
  }
`
    // 在最后一个 '}' 之前插入
    const lastBrace = existing.lastIndexOf('}')
    const updated = existing.slice(0, lastBrace) + newBlock + existing.slice(lastBrace)
    writeFileSync(oxnPath, updated, 'utf-8')

    output(
      {
        ok: true,
        data: {
          name,
          probeName,
          ref,
          params,
          path: oxnPath,
        },
        human: `Added probe "${probeName}" (${ref}) to proof "${name}"`,
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
  meta: { name: 'probe', description: '操作 proof 内的 probe' },
  subCommands: {
    add: probeAddSubcommand,
  },
})

// ---------------------------------------------------------------------------
// Subcommand: run
// ---------------------------------------------------------------------------

const runSubcommand = defineCommand({
  meta: {
    name: 'run',
    description: '执行 proof 内所有 probe，写 frozen.json（不可篡改）',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Proof 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const oxnPath = getProofOxnPath(name)
    const frozenPath = getProofFrozenPath(name)

    const parsed = await parseProofFile(oxnPath)
    if (!parsed.ok || !parsed.proof) {
      return outputError({ code: 'OXN_PROOF_PARSE_FAILED', message: parsed.errors.join('; ') }, format)
    }

    const probeIRs = proofProbesToIR(parsed.proof)
    if (probeIRs.length === 0) {
      return outputError(
        {
          code: 'OXN_PROOF_EMPTY',
          message: `proof "${name}" has no probe declarations`,
          suggestion: 'add at least one probe: `oxn proof probe add ...`',
        },
        format,
      )
    }

    // 顺序执行所有 probe（Phase A: stub；Phase B: 真实 Kernel+Infra）
    const results = []
    for (const probe of probeIRs) {
      const r = await executeProbe(probe)
      results.push(r)
    }

    // 构造 + 写 frozen.json（带 SHA-256 签名 + chmod 0o444）
    const frozen = buildFrozenProof({ name, probes: results })
    writeFrozenProof(frozenPath, frozen)

    output(
      {
        ok: true,
        data: {
          name,
          verdict: frozen.verdict,
          totalCount: frozen.totalCount,
          passedCount: frozen.passedCount,
          failedCount: frozen.failedCount,
          frozenPath,
          readOnly: isFrozenFileReadOnly(frozenPath),
        },
        human: renderVerdictHuman(name, frozen),
      },
      format,
    )
  },
})

function renderVerdictHuman(name: string, frozen: ReturnType<typeof buildFrozenProof>): string {
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
  meta: { name: 'list', description: '列出 .openxenon/proofs/ 下所有 proof' },
  args: {
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const proofsDir = getProofsDir()
    const proofs: Array<{ name: string; hasFrozen: boolean; frozenVerdict?: string }> = []

    if (existsSync(proofsDir)) {
      for (const entry of readdirSync(proofsDir)) {
        const dir = join(proofsDir, entry)
        if (!statSync(dir).isDirectory()) continue
        const frozenPath = join(dir, PROOF_FROZEN_JSON)
        const hasFrozen = existsSync(frozenPath)
        let frozenVerdict: string | undefined
        if (hasFrozen) {
          const r = readFrozenProof(frozenPath)
          if (r.ok && r.frozen) frozenVerdict = r.frozen.verdict
        }
        proofs.push({ name: entry, hasFrozen, frozenVerdict })
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
  meta: { name: 'show', description: '读 frozen.json 并输出 verdict + 详情' },
  args: {
    name: { type: 'positional', required: true, description: 'Proof 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const frozenPath = getProofFrozenPath(name)
    const r = readFrozenProof(frozenPath)

    if (!r.ok || !r.frozen) {
      return outputError(
        {
          code: 'OXN_PROOF_NOT_RUN',
          message: r.reason ?? `frozen.json missing for proof "${name}"`,
          suggestion: `run \`oxn proof run ${name}\` first`,
        },
        format,
      )
    }

    output(
      {
        ok: true,
        data: { ...r.frozen, signatureValid: true },
        human: renderShowHuman(r.frozen),
      },
      format,
    )
  },
})

function renderShowHuman(frozen: ReturnType<typeof buildFrozenProof>): string {
  const lines: string[] = []
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
    description: 'Proof-First 入口（v0.1.2）：probe + frozen.json 闭环，跳过 Domain/Blueprint',
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
