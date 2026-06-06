// =============================================================================
// Proof Runner (v0.1.2: 真运行时 — Kernel + Infra 分离)
//
// IAP 三轴分离兑现：
//   - Infra (L1 src/infra/probes/): 物理观测 — fs-exists / shell-exec 等
//   - Kernel (L0 src/kernel/probes/verdict.ts): 纯函数判定 — observation + params → ProbeVerdict
//   - 本 runner: Align 编排层，把"probe 声明"分发到 Infra + Kernel，
//     返回 FrozenProofProbeResult 给 frozen-writer 写判决书。
//
// ref 解析规则：
//   - "@oxn/probe/fs-exists"   → kind = "fs-exists"
//   - "@oxn/probe/shell-exec"  → kind = "shell-exec"
//   - "fs-exists" / "fs_exists"  → kind = "fs-exists"
//   - "shell_exec" / "shell-exec" → kind = "shell-exec"
//   解析失败 → 抛 ProbeNotFound，frozen.verdict = FAILED
// =============================================================================

import { getProbeHandler, hasProbeHandler, type ProbeContext } from '../infra/probes'
import { judge } from '../kernel/probes/verdict'
import type { FrozenProofProbeResult } from '../kernel/schemas/proof-schema'

/** 内存中的 proof.oxn 解析结果（来自 Langium AST → IR 映射） */
export interface ProofProbeIR {
  probeName: string
  ref: string
  params: Record<string, unknown>
}

/**
 * 把 proof.oxn 里的"工程友好"param 名翻译成 Infra handler 期望的"内核契约"param 名。
 * 这是 IAP Align 轴的语义翻译：工程师说 `target`，Infra 收 `pattern`。
 *
 * Key 同时支持 kebab-case（ref 直名）和 snake_case（handler registry 名）。
 */
const PARAM_TRANSLATIONS: Record<string, Record<string, string>> = {
  fs_exists: { target: 'pattern', path: 'pattern' },
  'fs-exists': { target: 'pattern', path: 'pattern' },
  fs_not_exists: { target: 'pattern', path: 'pattern' },
  'fs-not-exists': { target: 'pattern', path: 'pattern' },
  fs_match: { target: 'path', file: 'path' },
  'fs-match': { target: 'path', file: 'path' },
  shell_exec: {}, // command / timeout 直通
  'shell-exec': {},
  exec_exit_zero: {},
  'exec-exit-zero': {},
  exec_output_match: {},
  'exec-output-match': {},
}

function translateParams(kind: string, params: Record<string, unknown>): Record<string, unknown> {
  const map = PARAM_TRANSLATIONS[kind]
  if (!map) return params
  const out: Record<string, unknown> = { ...params }
  for (const [from, to] of Object.entries(map)) {
    if (from in out && !(to in out)) {
      out[to] = out[from]
    }
  }
  return out
}

/** 把 "@oxn/probe/fs-exists" → "fs-exists"；"fs_exists" 不变；"shell-exec" → "shell-exec" */
export function resolveProbeKind(ref: string): string | null {
  // 1. 去掉 @oxn/probe/ 前缀
  if (ref.startsWith('@oxn/probe/')) {
    return ref.slice('@oxn/probe/'.length)
  }
  // 2. 已是裸 type
  if (hasProbeHandler(ref)) return ref
  // 3. 兼容别名（fs-exists / fs_exists 都行）
  const aliases: Record<string, string> = {
    'fs-exists': 'fs_exists',
    'fs-not-exists': 'fs_not_exists',
    'fs-content-match': 'fs_match',
    'exec-exit-zero': 'shell_exec',
    'shell-exec': 'shell_exec',
  }
  if (aliases[ref]) {
    return aliases[ref]
  }
  return null
}

/**
 * 真实执行一个 probe（Kernel + Infra 分离）
 *   1. resolveProbeKind(ref) → kind（路由失败抛 ProbeNotFound）
 *   2. getProbeHandler(kind) → Infra handler（物理观测）
 *   3. Infra.execute(params, ctx) → ProbeObservation（事实）
 *   4. Kernel.judge(observation, params) → ProbeVerdict（纯函数判定）
 *   5. 转换为 FrozenProofProbeResult
 */
export async function executeProbe(
  probe: ProofProbeIR,
  context?: Partial<ProbeContext>,
): Promise<FrozenProofProbeResult> {
  const start = Date.now()
  const ctx: ProbeContext = {
    projectRoot: context?.projectRoot ?? process.cwd(),
  }

  // 1. 路由
  const kind = resolveProbeKind(probe.ref)
  if (!kind) {
    return {
      probeName: probe.probeName,
      ref: probe.ref,
      passed: false,
      errorMessage: `unknown probe ref: ${probe.ref} (no Infra handler)`,
      durationMs: Date.now() - start,
    }
  }
  const handler = getProbeHandler(kind)
  if (!handler) {
    return {
      probeName: probe.probeName,
      ref: probe.ref,
      passed: false,
      errorMessage: `no Infra handler for kind: ${kind}`,
      durationMs: Date.now() - start,
    }
  }

  // 2. Infra 物理观测
  let observation
  try {
    const translatedParams = translateParams(kind, probe.params)
    observation = await handler(translatedParams, ctx)
  } catch (err) {
    return {
      probeName: probe.probeName,
      ref: probe.ref,
      passed: false,
      errorMessage: `Infra exception: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - start,
    }
  }

  // 3. Kernel 纯函数判定
  const verdict = judge(observation, probe.params)

  return {
    probeName: probe.probeName,
    ref: probe.ref,
    passed: verdict.passed,
    output: { observation, verdict },
    errorMessage: verdict.passed ? undefined : (verdict.failureMessage ?? verdict.message),
    durationMs: Date.now() - start,
  }
}
