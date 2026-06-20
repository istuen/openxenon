// =============================================================================
// probe-sandbox.ts (v0.2 Sprint 3d T7)
//
// 第三方 Probe Provider 沙箱验证引擎 (v2 核心)
// 物理路径: src/cli/probe-sandbox.ts
// 父文档: .openxenon/forges/sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md
// PoC 结果: bun-poc/spike-t7-sandbox/RESULT.md (方案 A 通过)
//
// 核心机制:
//   1. Bun Transpiler: TS → JS (无 type-check)
//   2. node:vm SourceTextModule: JS 字符串作 ES Module 加载
//   3. vm.createContext 严格白名单 (无 process/require/fetch)
//   4. module.link() 拦截 module specifier (fs/child_process/etc)
//   5. evaluate + namespace.default 拿 class (new 实例化) / 拿 object
//   6. 越界 → throw IAPError SANDBOX_REJECTED → interference.flags = sandbox_violation
//
// L3-CLI 层 — 由 src/cli/probe-add.ts 调用
// 纯洁性约束: 可依赖 L0-Contract (IAPError / IAPAction / InfraProvider)
//            不得 import 上层 (L0-Processor / L2)
// =============================================================================

import { createHash } from 'node:crypto'
import { chmod, readFile, writeFile } from '../infra/filesystem-async'
import { join } from 'node:path'
import { SourceTextModule, createContext } from 'node:vm'
import { IAPError, IAPAction } from '../kernel/index'
import type { InfraProvider } from '../infra/registry/provider-registry'
import type { IOExecRequest, IOReadRequest, IOStatRequest } from '../kernel/contracts/io-primitive'

// ───────── 拦截白名单/黑名单 ─────────

/** 全局对象黑名单 (Bun 沙箱严格隔离, 多数自然未定义, 这里仅做文档化) */
const FORBIDDEN_GLOBALS = [
  'process.exit',
  'process.kill',
  'process.abort',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'globalThis.fetch',
] as const

/** import 模块黑名单 (link 阶段拦截) */
const FORBIDDEN_MODULES = [
  'fs',
  'fs/promises',
  'child_process',
  'net',
  'http',
  'https',
  'dgram',
  'cluster',
  'worker_threads',
  'vm',
  'inspector',
] as const

/** 沙箱评估结果 */
export interface SandboxResult {
  ok: boolean
  reason?: string
  /** sandbox_violation flag (越界时携带) */
  flags: string[]
  /** 评估后的 provider 实例 (ok=true 时) */
  provider?: InfraProvider
}

// ───────── Bun 内置 TS → JS 转译 ─────────

interface BunGlobal {
  Transpiler: new (opts: { loader: string }) => { transformSync(src: string): string }
}
const BunRuntime = (globalThis as { Bun?: BunGlobal }).Bun

function bunTranspile(src: string): string {
  if (BunRuntime?.Transpiler) {
    const t = new BunRuntime.Transpiler({ loader: 'ts' })
    return t.transformSync(src)
  }
  throw new IAPError(
    'INFRA',
    'SANDBOX_REJECTED',
    IAPAction.YIELD_TO_HUMAN,
    'Bun.Transpiler not available — sandbox requires Bun runtime',
    { component: 'probe-sandbox' },
  )
}

// ───────── 沙箱核心 ─────────

/**
 * 沙箱验证: sourcePath TS → 转译 → vm.SourceTextModule 加载 → 探测是否实现 InfraProvider
 * 触发沙箱拦截时, interference 携带 sandbox_violation flag.
 */
export async function sandboxValidate(sourcePath: string, expectedSchemes: string[]): Promise<SandboxResult> {
  const flags: string[] = []

  // 1. 读 TS 源
  let tsSource: string
  try {
    tsSource = await readFile(sourcePath, 'utf-8')
  } catch (err) {
    return { ok: false, reason: `read source failed: ${(err as Error).message}`, flags }
  }

  // 2. 转译
  let jsSource: string
  try {
    jsSource = bunTranspile(tsSource)
  } catch (err) {
    return { ok: false, reason: `transpile failed: ${(err as Error).message}`, flags: ['sandbox_violation'] }
  }

  // 3. 沙箱 context (严格白名单)
  const ctx = createContext(
    {
      // 静默 console (沙箱内 IO 都走 Provider)
      console: { log: () => {}, warn: () => {}, error: () => {} },
      // 允许
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      URL,
      URLSearchParams,
      TextEncoder,
      TextDecoder,
      // 故意不放: process, require, module, exports, __dirname, __filename, globalThis.fetch
    },
    {
      name: `probe-sandbox:${sourcePath}`,
      codeGeneration: { strings: false, wasm: false }, // 禁动态代码生成
    },
  )

  // 4. SourceTextModule
  const module = new SourceTextModule(jsSource, {
    identifier: `probe-sandbox:${sourcePath}`,
    context: ctx,
    initializeImportMeta: (meta: { url: string }) => {
      meta.url = `sandbox://${sourcePath}`
    },
  })

  // 5. link 阶段拦截 (import 模块名)
  try {
    await module.link(async (specifier: string) => {
      if (FORBIDDEN_MODULES.includes(specifier as (typeof FORBIDDEN_MODULES)[number])) {
        flags.push('sandbox_violation')
        throw new Error(`sandbox_violation: module ${specifier} is forbidden`)
      }
      return null as unknown as SourceTextModule
    })
  } catch (err) {
    const e = err as Error
    if (!flags.includes('sandbox_violation')) flags.push('sandbox_violation')
    return { ok: false, reason: e.message, flags }
  }

  // 6. evaluate
  try {
    await module.evaluate()
  } catch (err) {
    const e = err as Error
    if (!flags.includes('sandbox_violation')) flags.push('sandbox_violation')
    return { ok: false, reason: `evaluate failed: ${e.message}`, flags }
  }

  // 7. 取 namespace.default
  const ns = module.namespace as { default: unknown }
  const exported = ns.default
  if (!exported) {
    return {
      ok: false,
      reason: 'sandbox rejected: missing default export (no InfraProvider implementation)',
      flags: [],
    }
  }

  // ESM default export: 类 → 实例化; 对象 → 直接用
  let provider: InfraProvider
  try {
    if (typeof exported === 'function') {
      const Ctor = exported as new () => InfraProvider
      provider = new Ctor()
    } else {
      provider = exported as InfraProvider
    }
  } catch (err) {
    return { ok: false, reason: `instantiation failed: ${(err as Error).message}`, flags: [] }
  }

  // 8. 验证 InfraProvider 接口
  if (!isInfraProvider(provider)) {
    return {
      ok: false,
      reason:
        'sandbox rejected: default export does not implement InfraProvider (missing name/schemes/ioStat/ioRead/ioExec)',
      flags: [],
    }
  }

  // 9. 验证 schemes 一致
  for (const scheme of expectedSchemes) {
    if (!provider.schemes.includes(scheme)) {
      return { ok: false, reason: `sandbox rejected: missing scheme "${scheme}"`, flags: [] }
    }
  }

  // 10. 试调一次 ioStat 验证 runtime 不抛 (PoC 第 1 case)
  try {
    await provider.ioStat({ path: '' } as IOStatRequest)
  } catch (err) {
    const e = err as Error
    if (e.message.includes('is not defined') || e.message.includes('is not a function')) {
      flags.push('sandbox_violation')
      return { ok: false, reason: `runtime sandbox violation: ${e.message}`, flags }
    }
    // 其他错误 (e.g. path 解析失败) 视为合法 provider 内部错误, 不标 sandbox_violation
  }

  return { ok: true, flags, provider }
}

/** InfraProvider 鸭子类型检测 */
function isInfraProvider(x: unknown): x is InfraProvider {
  if (
    typeof x === 'object' &&
    x !== null &&
    'name' in x &&
    'schemes' in x &&
    'ioStat' in x &&
    'ioRead' in x &&
    'ioExec' in x
  ) {
    const obj = x as Record<string, unknown>
    return (
      typeof obj.name === 'string' &&
      Array.isArray(obj.schemes) &&
      typeof obj.ioStat === 'function' &&
      typeof obj.ioRead === 'function' &&
      typeof obj.ioExec === 'function'
    )
  }
  return false
}

// ───────── 工具: 计算 cachePath 期望 hash ─────────

export async function sha256OfFile(path: string): Promise<string> {
  const content = await readFile(path, 'utf-8')
  return createHash('sha256').update(content).digest('hex')
}

/** 落盘 provider 源 (写 0o644 立即 0o444 — 参照 frozen-immutable 写权独占) */
export async function writeProviderSource(cachePath: string, source: string): Promise<void> {
  await writeFile(cachePath, source, { mode: 0o644 })
  // 立刻 chmod 0o444 (防 AI / 工程师手改, 参照 frozen.json)
  await chmod(cachePath, 0o444)
}

// 导出常量供测试 + 文档
export { FORBIDDEN_GLOBALS, FORBIDDEN_MODULES }

// 内部 alias (避免 lint 报 unused 警告, 同时保持 L0-Contract import 链)
export type { IOExecRequest, IOReadRequest, IOStatRequest }

// re-export join (供 probe-add.ts 用)
export { join }
