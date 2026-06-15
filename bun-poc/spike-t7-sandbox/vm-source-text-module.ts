// =============================================================================
// Bun `vm.SourceTextModule` PoC (T7 v0.2 Sprint 3d 闸门)
//
// 目的: 验证 Bun runtime 下 vm.SourceTextModule + Bun 内置 TS loader 能:
//   1. 加载 TS 转译后 JS 字符串作为 ES Module
//   2. 调用 ESM default export 的 ioStat/ioRead/ioExec
//   3. 拦截 require('fs') / process.exit(1) / fetch('https://...') 等越界调用
//   4. 触发越界时 interference.flags 携带 sandbox_violation
//
// 父文档: .openxenon/forges/sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md §1.2
// 闸门决策:
//   - PoC 成功 → T7 继续方案 A (vm.SourceTextModule)
//   - PoC 失败 → 降级方案 B (Worker) / C (Bun.spawn) / D (推迟 PR-4)
//
// 运行: bun bun-poc/spike-t7-sandbox/vm-source-text-module.ts
// =============================================================================

import { SourceTextModule, createContext } from 'node:vm'
import { transpileModule } from 'typescript' // 注: Bun 默认带 TS, 不需此 import, 仅为 Node 兼容占位

// ───────── fixture 1: 合法 Provider ─────────

const LEGAL_PROVIDER_TS = `
import type { InfraProvider, IOStatRequest, IOReadRequest, IOExecRequest, IOStatResult, IOReadResult, IOExecResult, IOInterference } from '../../src/infra/registry/provider-registry'

class S3Provider implements InfraProvider {
  readonly name = 's3-fixture'
  readonly schemes = ['s3://', 's3s://']

  async ioStat(req: IOStatRequest) {
    return {
      result: { exists: true, isFile: true, isDir: false, mtimeMs: Date.now(), size: 1024, symlink: false },
      interference: { flags: [] }
    }
  }
  async ioRead(req: IOReadRequest) {
    return { result: { bytes: 12, text: 's3-fixture-content', truncated: false }, interference: { flags: [] } }
  }
  async ioExec(req: IOExecRequest) {
    return { result: { exitCode: 0, stdout: 's3 ok', stderr: '', durationMs: 5 }, interference: { flags: [] } }
  }
}

export default S3Provider
`

// ───────── fixture 2: 越界 provider (require fs) ─────────

const EVIL_PROVIDER_TS = `
const fs = require('fs')
export default {
  name: 'evil',
  schemes: ['evil://'],
  async ioStat() { fs.writeFileSync('/tmp/pwned', 'pwned'); return { result: { exists: true, isFile: true, isDir: false, mtimeMs: 0, size: 0, symlink: false }, interference: { flags: [] } } },
  async ioRead() { return { result: { bytes: 0, text: '', truncated: false }, interference: { flags: [] } } },
  async ioExec() { return { result: { exitCode: 0, stdout: '', stderr: '', durationMs: 0 }, interference: { flags: [] } } }
}
`

// ───────── fixture 3: 越界 provider (process.exit) ─────────

const EVIL_EXIT_TS = `
export default {
  name: 'evil-exit',
  schemes: ['exit://'],
  async ioStat() { process.exit(1); return { result: { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false }, interference: { flags: [] } } },
  async ioRead() { return { result: { bytes: 0, text: '', truncated: false }, interference: { flags: [] } } },
  async ioExec() { return { result: { exitCode: 0, stdout: '', stderr: '', durationMs: 0 }, interference: { flags: [] } } }
}
`

// ───────── fixture 4: 越界 provider (globalThis.fetch) ─────────

const EVIL_FETCH_TS = `
export default {
  name: 'evil-fetch',
  schemes: ['fetch://'],
  async ioStat() {
    const r = await globalThis.fetch('https://evil.example.com/')
    return { result: { exists: true, isFile: true, isDir: false, mtimeMs: 0, size: 0, symlink: false }, interference: { flags: [] } }
  },
  async ioRead() { return { result: { bytes: 0, text: '', truncated: false }, interference: { flags: [] } } },
  async ioExec() { return { result: { exitCode: 0, stdout: '', stderr: '', durationMs: 0 }, interference: { flags: [] } } }
}
`

// ───────── helpers ─────────

const FORBIDDEN_GLOBALS = ['process.exit', 'process.kill', 'process.abort', 'require', 'module', 'exports', '__dirname', '__filename', 'globalThis.fetch']
const FORBIDDEN_MODULES = ['fs', 'fs/promises', 'child_process', 'net', 'http', 'https', 'dgram', 'cluster', 'worker_threads', 'vm', 'inspector']

/** Bun 自带 TS → JS 转译 (无 type-check) */
function bunTranspile(src: string): string {
  // Bun runtime: 直接用 Bun.Transpiler (内置, 无外部 tsc 依赖)
  // biome-ignore lint/suspicious/noExplicitAny: Bun.Transpiler TS API
  if (typeof Bun !== 'undefined' && (Bun as any).Transpiler) {
    const t = new (Bun as any).Transpiler({ loader: 'ts' })
    return t.transformSync(src)
  }
  // 退化路径: typescript 包 (PoC 兜底, 不期望)
  // biome-ignore lint/suspicious/noExplicitAny: PoC fallback
  return transpileModule(src, { compilerOptions: { module: 99 /* ESNext */, target: 1 /* ES2022 */ } } as any).outputText
}

async function sandboxLoad(tsSource: string, label: string): Promise<{ ok: boolean; reason?: string; provider?: any; flags: string[]; runtimeCallOk?: boolean; runtimeCallReason?: string }> {
  const flags: string[] = []
  try {
    const jsSource = bunTranspile(tsSource)

    // sandbox context: 无 require / process.exit / globalThis.fetch
    const ctx = createContext(
      {
        console: { log: () => {}, warn: () => {}, error: () => {} },
        setTimeout, clearTimeout, setInterval, clearInterval,
        Buffer, URL, URLSearchParams, TextEncoder, TextDecoder,
        // 不放: require, process, module, exports, __dirname, __filename, globalThis.fetch
      },
      { name: `probe-sandbox:${label}`, codeGeneration: { strings: false, wasm: false } },
    )

    const module = new SourceTextModule(jsSource, {
      identifier: `probe-sandbox:${label}`,
      context: ctx,
      initializeImportMeta: (meta: { url: string }) => {
        meta.url = `sandbox://${label}`
      },
    })

    // link: 拦截 dynamic import + static import
    await module.link(async (specifier: string) => {
      if (FORBIDDEN_MODULES.includes(specifier)) {
        flags.push('sandbox_violation')
        throw new Error(`sandbox_violation: module ${specifier} is forbidden`)
      }
      return null
    })

    await module.evaluate()

    // biome-ignore lint/suspicious/noExplicitAny: PoC introspection
    const ns = module.namespace as any
    const exported = ns.default
    if (!exported) {
      return { ok: false, reason: 'no default export', flags }
    }
    // ESM default export: 类 → 拿 class; 对象 → 直接用
    const provider = typeof exported === 'function' ? new exported() : exported

    // 额外: 实际调一次 ioStat 看 runtime 是否被拦截
    let runtimeCallOk = true
    let runtimeCallReason: string | undefined
    if (typeof provider.ioStat === 'function') {
      try {
        await provider.ioStat({ path: 's3://bucket/key' })
      } catch (err) {
        runtimeCallOk = false
        runtimeCallReason = (err as Error).message
        flags.push('sandbox_violation')
      }
    }
    return { ok: true, provider, flags, runtimeCallOk, runtimeCallReason }
  } catch (err) {
    const e = err as Error
    flags.push('sandbox_violation')
    return { ok: false, reason: e.message, flags }
  }
}

// ───────── PoC main ─────────

async function main() {
  console.log('=== Bun vm.SourceTextModule PoC (T7 闸门) ===\n')

  // 1. 合法 Provider
  console.log('[1/4] 合法 S3 Provider:')
  const r1 = await sandboxLoad(LEGAL_PROVIDER_TS, 'legal-s3')
  console.log('  ok:', r1.ok)
  console.log('  flags:', r1.flags)
  console.log('  runtimeCallOk:', r1.runtimeCallOk)
  if (r1.provider && r1.runtimeCallOk) {
    const statResult = await r1.provider.ioStat({ path: 's3://bucket/key' })
    console.log('  ioStat 返回:', JSON.stringify(statResult.result))
  } else if (r1.reason) {
    console.log('  reason:', r1.reason)
  }
  if (r1.runtimeCallReason) console.log('  runtimeCallReason:', r1.runtimeCallReason)

  // 2. 越界 require('fs')
  console.log('\n[2/4] 越界 require("fs"):')
  const r2 = await sandboxLoad(EVIL_PROVIDER_TS, 'evil-fs')
  console.log('  ok:', r2.ok)
  console.log('  flags:', r2.flags)
  console.log('  reason:', r2.reason)
  console.log('  runtimeCallOk:', r2.runtimeCallOk)
  if (r2.runtimeCallReason) console.log('  runtimeCallReason:', r2.runtimeCallReason)

  // 3. 越界 process.exit
  console.log('\n[3/4] 越界 process.exit(1):')
  const r3 = await sandboxLoad(EVIL_EXIT_TS, 'evil-exit')
  console.log('  ok:', r3.ok)
  console.log('  flags:', r3.flags)
  console.log('  reason:', r3.reason)
  console.log('  runtimeCallOk:', r3.runtimeCallOk)
  if (r3.runtimeCallReason) console.log('  runtimeCallReason:', r3.runtimeCallReason)

  // 4. 越界 globalThis.fetch
  console.log('\n[4/4] 越界 globalThis.fetch():')
  const r4 = await sandboxLoad(EVIL_FETCH_TS, 'evil-fetch')
  console.log('  ok:', r4.ok)
  console.log('  flags:', r4.flags)
  console.log('  reason:', r4.reason)
  console.log('  runtimeCallOk:', r4.runtimeCallOk)
  if (r4.runtimeCallReason) console.log('  runtimeCallReason:', r4.runtimeCallReason)

  // 闸门决策: 合法 OK + 3 类越界都拦截
  const pass =
    r1.ok &&
    r1.runtimeCallOk &&
    !r2.runtimeCallOk &&
    r2.flags.includes('sandbox_violation') &&
    !r3.runtimeCallOk &&
    r3.flags.includes('sandbox_violation') &&
    !r4.runtimeCallOk &&
    r4.flags.includes('sandbox_violation')
  console.log('\n=== 闸门决策 ===')
  console.log('  合法 Provider 加载 + runtime 调用:', r1.ok && r1.runtimeCallOk ? '✅' : '❌')
  console.log('  require("fs") 拦截:', !r2.runtimeCallOk ? '✅' : '❌')
  console.log('  process.exit 拦截:', !r3.runtimeCallOk ? '✅' : '❌')
  console.log('  globalThis.fetch 拦截:', !r4.runtimeCallOk ? '✅' : '❌')
  console.log('  闸门总体:', pass ? '✅ 通过 (方案 A 继续)' : '❌ 失败 (降级 B/C/D)')

  process.exit(pass ? 0 : 1)
}

main().catch((err) => {
  console.error('PoC crash:', err)
  process.exit(2)
})
