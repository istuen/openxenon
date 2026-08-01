// =============================================================================
// oxn-runtime-version probe (RFC-0015 D6.4)
//
// 验证 .openxenon/config.json 中声明的 runtime.oxnVersion 与 packages/engine/package.json
// 实际 version 是否一致。
//
// 一等公民 verdict: project 期望的 OXN engine version 不一致时,
//  work / proof 跑在错的 runtime 行为上 — silent drift.
//
// L0 Kernel 严格: 读文件走 L1-Infra filesystem 接口
// =============================================================================

import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface OxnRuntimeVersionParams {
  /** 项目根（默认 process.cwd()） */
  root?: string
}

export interface OxnRuntimeVersionResult {
  /** exit 0 = match (或 expected 未配置 → skip), passed */
  passed: boolean
  /** skipped: 未配置 expected version, 跳过检查 */
  skipped: boolean
  /** 实际 engine version (从 packages/engine/package.json) */
  actual: string | null
  /** 项目期望 version (从 .openxenon/config.json runtime.oxnVersion) */
  expected: string | null
  /** mismatch 详情 */
  mismatch?: { expected: string; actual: string }
}

function readProjectRootConfig(root: string): { expected?: string; error?: string } {
  const configPath = join(root, '.openxenon', 'config.json')
  if (!existsSync(configPath)) return { error: 'config.json not found' }
  try {
    const content = readFileSync(configPath, 'utf-8')
    const cfg = JSON.parse(content) as Record<string, unknown>
    const runtime = cfg['runtime'] as Record<string, unknown> | undefined
    const expected = (runtime?.['oxnVersion'] ?? runtime?.['version']) as string | undefined
    if (typeof expected === 'string' && expected.length > 0) {
      return { expected }
    }
    return {} // 未配置
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

function readEnginePackageVersion(): { version: string | null; error?: string } {
  // 通过 import.meta.dirname 推到 packages/engine/package.json
  // 在源码运行时 = packages/engine/src/infra/probes/
  // 往上 4 层 = packages/engine/
  let here: string
  try {
    here = dirname(fileURLToPath(import.meta.url))
  } catch {
    return { version: null, error: 'import.meta.url unavailable (CommonJS runtime)' }
  }
  const candidates = [
    join(here, '../../../../package.json'), // bun dev mode (from packages/engine/src/infra/probes/)
    join(here, '../../../package.json'), // bundled mode
    join(here, '../../package.json'),
    join(here, '../package.json'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8')
        const pkg = JSON.parse(content) as { name?: string; version?: string }
        if (pkg.name === '@openxenon/engine' && pkg.version) {
          return { version: pkg.version }
        }
        // Fallback: first match with version field
        if (pkg.version) {
          return { version: pkg.version }
        }
      } catch (e) {
        return { version: null, error: e instanceof Error ? e.message : String(e) }
      }
    }
  }
  return { version: null, error: 'engine package.json not found' }
}

export async function executeOxnRuntimeVersion(
  params: OxnRuntimeVersionParams,
  context: ProbeContext,
): Promise<OxnRuntimeVersionResult> {
  const root = params.root ?? context.projectRoot
  const cfg = readProjectRootConfig(root)
  const engine = readEnginePackageVersion()

  if (engine.error || engine.version === null) {
    // 引擎 version 不可读 → fail
    return {
      passed: false,
      skipped: false,
      actual: engine.version,
      expected: cfg.expected ?? null,
      mismatch: cfg.expected && engine.version ? { expected: cfg.expected, actual: engine.version } : undefined,
    }
  }

  if (!cfg.expected) {
    // 未配置期望 version → skip (passed 不报错)
    return {
      passed: true,
      skipped: true,
      actual: engine.version,
      expected: null,
    }
  }

  const match = cfg.expected === engine.version
  return {
    passed: match,
    skipped: false,
    actual: engine.version,
    expected: cfg.expected,
    mismatch: match ? undefined : { expected: cfg.expected, actual: engine.version },
  }
}
