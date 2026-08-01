// =============================================================================
// oxn-runtime-version probe (RFC-0015 D6.4)
//
// 验证 .openxenon/config.json 中声明的 runtime.oxnVersion 与 engine version
// (从 ProbeContext.engineVersion 注入) 一致。
//
// 一等公民 verdict: project 期望的 OXN engine version 不一致时,
//  work / proof 跑在错的 runtime 行为上 — silent drift.
//
// L0 Kernel 严格: handler 不读文件 (ProbeRunner 已注入 engineVersion);
//   唯一 IO 是读 .openxenon/config.json (走 L1-Infra filesystem 接口)
//
// v0.6.2 修复 (D6.4): 删除 import.meta.url 路径上溯, 改为 context.engineVersion 注入
// =============================================================================

import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
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
  /** 实际 engine version (从 ProbeContext.engineVersion 注入) */
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
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function executeOxnRuntimeVersion(
  params: OxnRuntimeVersionParams,
  context: ProbeContext,
): Promise<OxnRuntimeVersionResult> {
  const root = params.root ?? context.projectRoot
  const cfg = readProjectRootConfig(root)

  // D6.4: 从 ProbeContext.engineVersion 读取 (ProbeRunner 注入), 不再做物理路径解析
  const actual = context.engineVersion ?? null

  if (!actual) {
    // engine version 未注入 → fail (ProbeRunner 应负责注入, 缺失表明 runner 配置错误)
    return {
      passed: false,
      skipped: false,
      actual: null,
      expected: cfg.expected ?? null,
      mismatch: cfg.expected ? { expected: cfg.expected, actual: 'null' } : undefined,
    }
  }

  if (!cfg.expected) {
    return {
      passed: true,
      skipped: true,
      actual,
      expected: null,
    }
  }

  const match = cfg.expected === actual
  return {
    passed: match,
    skipped: false,
    actual,
    expected: cfg.expected,
    mismatch: match ? undefined : { expected: cfg.expected, actual },
  }
}
