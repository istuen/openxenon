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
  /** v1.1: 关联的 ProgramContext term 名（如 'SourceFile' / 'TestCase'）。
   *  AI 可见——帮助 AI 理解 probe 服务的编程概念。
   *  5a builtin probes 留空（无对应 P1 term）；5b P1 probes 必填。 */
  domainTerm?: string
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
  {
    // v1.1: catalog 注册（非新实现——infra + kernel 早已存在，仅 catalog 缺失）
    semanticName: 'fs-not-exists',
    description: '检查指定路径不存在（命中数 === 0 → PASS）',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: '要检查的文件路径或 glob 模式（不应存在）',
      },
    ],
    examples: [
      { name: 'no-stale-build', inputs: { path: './dist/index.js' } },
      { name: 'no-debug-code', inputs: { path: 'src/console.log' } },
    ],
    internalRef: '@oxn/probes/fs-not-exists',
    inputMap: { path: 'pattern' },
    builtin: 'oxn',
  },
  {
    // v1.1: catalog 注册（fs_match 的语义层 alias，kebab-case 命名）
    // 实际仍是 fs_match 策略，但 AI 看到 'fs-content-match' 比 'fs_match' 更明确
    semanticName: 'fs-content-match',
    description: '检查文件内容是否匹配 regex 模式（matched: true → PASS）',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: '要读取的文件路径',
      },
      {
        name: 'contains',
        type: 'string',
        required: true,
        description: '要匹配的 regex 模式（如 "openxenon" / "^export const \\w+"）',
      },
    ],
    examples: [
      { name: 'package-declares-dep', inputs: { path: './package.json', contains: '"openxenon":' } },
      { name: 'file-exports-default', inputs: { path: './dist/index.js', contains: 'export default' } },
    ],
    internalRef: '@oxn/probes/fs-content-match',
    inputMap: { path: 'path', contains: 'contains' },
    builtin: 'oxn',
  },
  {
    // v1.1: 全新 Probe —— 文件可被 JSON 解析
    // 实现见 src/infra/probes/fs-parseable.ts (5a.2)
    semanticName: 'fs-parseable',
    description: '检查文件可被解析（当前支持 JSON 格式，valid → PASS）',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: true,
        description: '要解析的文件路径（当前仅 *.json）',
      },
    ],
    examples: [
      { name: 'package-json-valid', inputs: { path: './package.json' } },
      { name: 'tsconfig-valid', inputs: { path: './tsconfig.json' } },
    ],
    internalRef: '@oxn/probes/fs-parseable',
    inputMap: { path: 'path' },
    builtin: 'oxn',
  },
  {
    // v1.1 P1: test-pass — 跑 bun test + 解析退出码 + 简易 pass/fail 统计
    // 复 ProgramContext.TestCase term
    semanticName: 'test-pass',
    description: '跑 bun test 并验证全部通过（exit 0 → PASS）',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: '测试文件路径或目录（默认项目根）',
      },
      {
        name: 'pattern',
        type: 'string',
        required: false,
        description: 'bun test 接受的过滤 pattern（如 "auth"）',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: '超时（毫秒，默认 120000）',
      },
    ],
    examples: [
      { name: 'all-tests-pass', inputs: { timeout: 60000 } },
      { name: 'auth-tests-only', inputs: { path: './tests/auth', pattern: 'auth' } },
    ],
    internalRef: '@oxn/probes/test-pass',
    inputMap: { path: 'path', pattern: 'pattern', timeout: 'timeout' },
    builtin: 'oxn',
    domainTerm: 'TestCase',
  },
  {
    // v1.1 P1: deps-resolved — 验证 package.json 依赖都被 lockfile 解析
    // 复 ProgramContext.Package term。纯 JS，无 spawn。
    semanticName: 'deps-resolved',
    description: '验证 package.json 声明的所有依赖都被 lockfile 解析（missing.length === 0 → PASS）',
    inputs: [
      {
        name: 'packageJson',
        type: 'string',
        required: false,
        description: 'package.json 路径（默认项目根）',
      },
      {
        name: 'lockfile',
        type: 'string',
        required: false,
        description: 'lockfile 路径（默认自动检测：bun.lock > package-lock.json > pnpm-lock.yaml > yarn.lock）',
      },
    ],
    examples: [
      { name: 'default-detect', inputs: {} },
      { name: 'explicit-pkg', inputs: { packageJson: './packages/web/package.json' } },
    ],
    internalRef: '@oxn/probes/deps-resolved',
    inputMap: { packageJson: 'packageJson', lockfile: 'lockfile' },
    builtin: 'oxn',
    domainTerm: 'Package',
  },
  {
    // v1.1 P1: ts-compiles — 跑 tsc --noEmit
    // 复 ProgramContext.SourceFile term（与 lint-check 共享）。
    // Spawn: npx tsc --noEmit [--project tsconfig.json] [path]
    semanticName: 'ts-compiles',
    description: '跑 tsc --noEmit 验证类型检查通过（exit 0 → PASS）',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: '要编译的文件或目录（默认整个项目）',
      },
      {
        name: 'tsconfig',
        type: 'string',
        required: false,
        description: 'tsconfig.json 路径（默认 ./tsconfig.json 或 ./tsconfig.build.json）',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: '超时（毫秒，默认 120000）',
      },
    ],
    examples: [
      { name: 'whole-project', inputs: { timeout: 60000 } },
      { name: 'specific-file', inputs: { path: './src/foo.ts' } },
    ],
    internalRef: '@oxn/probes/ts-compiles',
    inputMap: { path: 'path', tsconfig: 'tsconfig', timeout: 'timeout' },
    builtin: 'oxn',
    domainTerm: 'SourceFile',
  },
  {
    // v1.1 P1: lint-check — 跑 biome check 验证代码风格
    // 复 ProgramContext.SourceFile term（与 ts-compiles 共享）。
    // 前置依赖：biome (devDep)
    semanticName: 'lint-check',
    description: '跑 biome check 验证代码风格（exit 0 → PASS；需项目装 biome）',
    inputs: [
      {
        name: 'path',
        type: 'string',
        required: false,
        description: '要 lint 的路径（默认项目根）',
      },
      {
        name: 'apply',
        type: 'boolean',
        required: false,
        description: '是否自动修复（--apply，默认 false）',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: '超时（毫秒，默认 60000）',
      },
    ],
    examples: [
      { name: 'check-only', inputs: { timeout: 60000 } },
      { name: 'check-and-apply', inputs: { apply: true } },
    ],
    internalRef: '@oxn/probes/lint-check',
    inputMap: { path: 'path', apply: 'apply', timeout: 'timeout' },
    builtin: 'oxn',
    domainTerm: 'SourceFile',
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
