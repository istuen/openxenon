// =============================================================================
// Probe Catalog (v0.1.2)
//
// 单一真相源：把"AI 看得到的语义层"与"OXN 内部的实现层"清晰分离。
//
// 关键设计：
//   - semanticName / description / inputs[] / examples → AI 可见（白名单）
//   - ref / inputMap                            → AI 不可见（黑盒内部）
//   - 新增 probe 只需在 PROBE_CATALOG 加一条，无需改 grammar / CLI / runner
//
// 与 IAP 三轴对齐：
//   - Intent 侧（Blueprint 内 observe）→ 引用 internalRef
//   - Proof 侧（proof.oxn）→ 引用 semanticName，CLI 翻译到 internalRef
//   - AI 永远不直接看到 internalRef（封装边界）
// =============================================================================

export type ProbeInputType = 'string' | 'number' | 'boolean'

export interface ProbeInputDef {
  /** 语义 input 名（AI 可见） */
  name: string
  type: ProbeInputType
  required: boolean
  /** 描述（AI 可见，--input-json 校验时显示） */
  description: string
}

export interface ProbeExample {
  name: string
  inputs: Record<string, string | number | boolean>
}

export interface ProbeCatalogEntry {
  /** 语义名（AI 可见）。如 `fs-exists` / `shell-exec` */
  semanticName: string
  /** 一句话描述（AI 可见） */
  description: string
  /** 输入契约（AI 可见） */
  inputs: ProbeInputDef[]
  /** 用法示例（AI 可见） */
  examples: ProbeExample[]
  /** 内部 ref（AI 不可见，CLI 翻译使用） */
  internalRef: string
  /** input 名翻译表（AI 不可见）：semanticName → internalName */
  inputMap: Record<string, string>
  /** 归属 builtin 类别 */
  builtin: 'oxn'
}

/**
 * PROBE_CATALOG: 唯一真相源。
 * 新增 probe 只需在此加一条（grammars/CLI/runner 自动适配）。
 */
export const PROBE_CATALOG: ProbeCatalogEntry[] = [
  {
    semanticName: 'fs-exists',
    description: '检查指定路径的文件或 glob 模式是否存在',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: '要检查的文件路径或 glob 模式（如 "./dist/index.js"）',
      },
    ],
    examples: [
      { name: 'build-output-exists', inputs: { path: './dist/index.js' } },
      { name: 'test-fixture-exists', inputs: { path: './src/__tests__/fixture.json' } },
    ],
    internalRef: '@oxn/probes/fs-exists',
    inputMap: { path: 'pattern' },
    builtin: 'oxn',
  },
  {
    semanticName: 'shell-exec',
    description: '执行 shell 命令并检查退出码（exit 0 → PASS）',
    inputs: [
      {
        name: 'command',
        type: 'string',
        required: true,
        description: '要执行的 shell 命令（如 "bun test"）',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: '超时时间（毫秒），默认 30000',
      },
    ],
    examples: [
      { name: 'tests-pass', inputs: { command: 'bun test', timeout: 60000 } },
      { name: 'build-success', inputs: { command: 'bun run build' } },
    ],
    internalRef: '@oxn/probes/shell-exec',
    inputMap: { command: 'command', timeout: 'timeout' },
    builtin: 'oxn',
  },
]

// ---------------------------------------------------------------------------
// 查询 API
// ---------------------------------------------------------------------------

/** 列出所有 probe（AI 调 `probe list` 时返回的形态） */
export function listProbesSummary(): Array<{
  name: string
  description: string
  requiredInputs: string[]
}> {
  return PROBE_CATALOG.map((p) => ({
    name: p.semanticName,
    description: p.description,
    requiredInputs: p.inputs.filter((i) => i.required).map((i) => i.name),
  }))
}

/** AI 调 `probe describe <name>` 时返回的形态 */
export function describeProbe(name: string): {
  name: string
  description: string
  inputs: ProbeInputDef[]
  examples: ProbeExample[]
} | null {
  const entry = PROBE_CATALOG.find((p) => p.semanticName === name)
  if (!entry) return null
  return {
    name: entry.semanticName,
    description: entry.description,
    inputs: entry.inputs,
    examples: entry.examples,
  }
}

/** 内部用：从 catalog 取 entry（含 internalRef + inputMap） */
export function getCatalogEntry(name: string): ProbeCatalogEntry | null {
  return PROBE_CATALOG.find((p) => p.semanticName === name) ?? null
}

// ---------------------------------------------------------------------------
// 翻译层
// ---------------------------------------------------------------------------

import { IAPError, IAPAction } from '../../core/errors'

export interface TranslatedProbe {
  internalRef: string
  internalParams: Record<string, unknown>
}

/**
 * 把 AI 传来的 `{semanticName, inputs: Record<string, primitive>}` 翻译成
 * `internalRef + internalParams`（CLI/runner 内部使用）。
 *
 *   1. 校验 semanticName 存在
 *   2. 校验必填 input 都齐
 *   3. 校验 input 类型
 *   4. 应用 inputMap 翻译 key 名
 *
 * 错误契约（v1.0 双轨制）：
 *   抛 `IAPError('PROOF', 'INFRA_FAIL', YIELD_TO_HUMAN, ...)`，CLI 顶层 catch
 *   转成 `{code: 'IAP_PROOF_INFRA_FAIL', axis, action, context, message}` 输出。
 *   4 个老 OXN_PROBE_* 码（UNKNOWN / INPUT_MISSING / INPUT_TYPE / INPUT_UNKNOWN）
 *   合并为 1 个 IAPError（语义统一为"Probe Infra 跑不到，AI 检查输入"）；
 *   具体原因走 `context.reason` 字段。
 */
export function translateProbeInputs(semanticName: string, inputs: Record<string, unknown>): TranslatedProbe {
  const entry = getCatalogEntry(semanticName)
  if (!entry) {
    throw new IAPError(
      'PROOF',
      'INFRA_FAIL',
      IAPAction.YIELD_TO_HUMAN,
      `unknown probe: ${semanticName}. Run \`oxn proof probe list\` to see available probes.`,
      { probe: semanticName, reason: 'unknown_semantic_name' },
    )
  }

  const internalParams: Record<string, unknown> = {}

  for (const inputDef of entry.inputs) {
    const raw = inputs[inputDef.name]

    if (raw === undefined || raw === null) {
      if (inputDef.required) {
        throw new IAPError(
          'PROOF',
          'INFRA_FAIL',
          IAPAction.YIELD_TO_HUMAN,
          `probe "${semanticName}" requires input "${inputDef.name}" (${inputDef.description})`,
          {
            probe: semanticName,
            input: inputDef.name,
            reason: 'input_missing',
          },
        )
      }
      continue
    }

    // 类型校验
    if (inputDef.type === 'string' && typeof raw !== 'string') {
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `probe "${semanticName}" input "${inputDef.name}" must be string, got ${typeof raw}`,
        {
          probe: semanticName,
          input: inputDef.name,
          actualType: typeof raw,
          expectedType: 'string',
          reason: 'input_type_mismatch',
        },
      )
    }
    if (inputDef.type === 'number' && typeof raw !== 'number') {
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `probe "${semanticName}" input "${inputDef.name}" must be number, got ${typeof raw}`,
        {
          probe: semanticName,
          input: inputDef.name,
          actualType: typeof raw,
          expectedType: 'number',
          reason: 'input_type_mismatch',
        },
      )
    }
    if (inputDef.type === 'boolean' && typeof raw !== 'boolean') {
      throw new IAPError(
        'PROOF',
        'INFRA_FAIL',
        IAPAction.YIELD_TO_HUMAN,
        `probe "${semanticName}" input "${inputDef.name}" must be boolean, got ${typeof raw}`,
        {
          probe: semanticName,
          input: inputDef.name,
          actualType: typeof raw,
          expectedType: 'boolean',
          reason: 'input_type_mismatch',
        },
      )
    }

    // 翻译 key 名：semantic → internal
    const internalName = entry.inputMap[inputDef.name] ?? inputDef.name
    internalParams[internalName] = raw
  }

  return {
    internalRef: entry.internalRef,
    internalParams,
  }
}

// ---------------------------------------------------------------------------
// Schema 一致性自检（catalog 内部不变量）
// ---------------------------------------------------------------------------

/**
 * 启动时一次性检查：所有 inputMap keys 都必须在 inputs[] 里存在。
 * 防止 catalog 写错时 late fail。
 */
export function assertCatalogConsistency(): { ok: true } | { ok: false; error: string } {
  for (const entry of PROBE_CATALOG) {
    // 1. semanticName 唯一
    const dup = PROBE_CATALOG.find((e) => e !== entry && e.semanticName === entry.semanticName)
    if (dup) {
      return { ok: false, error: `duplicate semanticName: ${entry.semanticName}` }
    }
    // 2. inputs[] name 唯一
    const seen = new Set<string>()
    for (const inp of entry.inputs) {
      if (seen.has(inp.name)) {
        return { ok: false, error: `probe "${entry.semanticName}" has duplicate input "${inp.name}"` }
      }
      seen.add(inp.name)
    }
    // 3. inputMap keys ⊆ inputs[].names
    for (const k of Object.keys(entry.inputMap)) {
      if (!seen.has(k)) {
        return { ok: false, error: `probe "${entry.semanticName}" inputMap has key "${k}" not in inputs[]` }
      }
    }
  }
  return { ok: true }
}
