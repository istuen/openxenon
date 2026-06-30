// =============================================================================
// HttpProvider (v0.2 Sprint 3c T6 — Probe Signal Taint v2 PR-3)
//
// L1-Infra 层 — http(s):// scheme 的 IO Provider
// 物理路径: src/infra/providers/http-provider.ts
// 父文档: .openxenon/forges/2026-06-14-probe-signal-taint-design.md v2 §5.3
//
// 实现 InfraProvider 接口 (3 个 IO Primitive):
//   - ioStat: fetch HEAD (仅取 headers, 不读 body)
//   - ioRead: fetch GET + maxBytes 截断
//   - ioExec: 抛 IAPError (http provider 不实现 io.exec; 用 shell:// URI)
//
// 干涉 flag 检测 (4 项):
//   - waf_detected: 命中 WAF 头黑名单 6 项
//   - cdn_cache: age 头 / x-cache: HIT
//   - response_truncated: content-length 超 maxBytes
//   - network_timeout: fetch AbortError
//
// 测试: 父文档 T3.6 表 - mock fetch 注入 3 类响应
// =============================================================================

import { IAPError, IAPAction } from '@openxenon/engine/kernel/index'
import type {
  IOExecRequest,
  IOExecResult,
  IOInterference,
  IOReadRequest,
  IOReadResult,
  IOStatRequest,
  IOStatResult,
  InterferenceFlag,
} from '@openxenon/engine/kernel/contracts/io-primitive'
import type { InfraProvider, ProviderManifest } from '../registry/provider-registry'

// ───────── WAF 头黑名单 (6 项) ─────────

const WAF_HEADERS = [
  'cf-ray', // Cloudflare
  'x-sucuri-id', // Sucuri
  'x-akamai-transformed', // Akamai
  'x-imperva-id', // Imperva
  'x-azure-ref', // Azure WAF
  'x-aws-waf-token', // AWS WAF
]

// ───────── flag 检测函数 ─────────

function detectFlagsFromHeaders(headers: Headers, contentLength: number, maxBytes: number): InterferenceFlag[] {
  const flags: InterferenceFlag[] = []

  // 1. WAF 检测
  for (const h of WAF_HEADERS) {
    if (headers.has(h)) {
      flags.push('waf_detected')
      break
    }
  }

  // 2. CDN 缓存: age 头存在 (非 0) 或 x-cache: HIT
  const age = headers.get('age')
  if (age && Number(age) > 0) {
    flags.push('cdn_cache')
  } else {
    const xcache = headers.get('x-cache')
    if (xcache?.toUpperCase().includes('HIT')) {
      flags.push('cdn_cache')
    }
  }

  // 3. response_truncated: content-length > maxBytes
  if (contentLength > maxBytes) {
    flags.push('response_truncated')
  }

  return flags
}

function detectFlagsFromError(err: unknown): InterferenceFlag[] {
  if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
    return ['network_timeout']
  }
  return ['unknown']
}

// ───────── HttpProvider ─────────

export class HttpProvider implements InfraProvider {
  readonly name = 'http'
  readonly schemes: readonly string[] = ['http://', 'https://']

  /** 测试用: 注入 mock fetch. 默认 = globalThis.fetch */
  private readonly _fetchFn: typeof fetch

  constructor(opts?: { fetchFn?: typeof fetch; timeoutMs?: number }) {
    this._fetchFn = opts?.fetchFn ?? globalThis.fetch
  }

  async ioStat(req: IOStatRequest): Promise<{ result: IOStatResult; interference: IOInterference }> {
    const url = req.path // IOStatRequest 借用 path 字段做 URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        result: { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false },
        interference: { flags: [] },
      }
    }

    try {
      const resp = await this._fetchFn(url, { method: 'HEAD' })
      const flags = detectFlagsFromHeaders(resp.headers, Number(resp.headers.get('content-length') ?? 0), Infinity)
      return {
        result: {
          exists: resp.ok,
          isFile: true,
          isDir: false,
          mtimeMs: null,
          size: Number(resp.headers.get('content-length') ?? 0),
          symlink: false,
        },
        interference: { flags },
      }
    } catch (err) {
      return {
        result: { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false },
        interference: { flags: detectFlagsFromError(err) },
      }
    }
  }

  async ioRead(req: IOReadRequest): Promise<{ result: IOReadResult; interference: IOInterference }> {
    const url = req.path
    const maxBytes = req.maxBytes ?? Infinity
    const encoding = req.encoding ?? 'utf-8'

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        result: { bytes: 0, text: '', truncated: false },
        interference: { flags: [] },
      }
    }

    let resp: Response
    try {
      resp = await this._fetchFn(url, { method: 'GET' })
    } catch (err) {
      return {
        result: { bytes: 0, text: '', truncated: false },
        interference: { flags: detectFlagsFromError(err) },
      }
    }

    const contentLength = Number(resp.headers.get('content-length') ?? 0)
    const flags = detectFlagsFromHeaders(resp.headers, contentLength, maxBytes)

    // 读 body + 截断
    let buf: Uint8Array
    try {
      buf = new Uint8Array(await resp.arrayBuffer())
    } catch {
      return { result: { bytes: 0, text: '', truncated: false }, interference: { flags } }
    }
    const truncated = buf.length > maxBytes
    const slice = truncated ? buf.subarray(0, maxBytes) : buf
    const text = encoding === 'base64' ? Buffer.from(slice).toString('base64') : new TextDecoder().decode(slice)

    return {
      result: { bytes: slice.length, text, truncated },
      interference: { flags },
    }
  }

  async ioExec(_req: IOExecRequest): Promise<{ result: IOExecResult; interference: IOInterference }> {
    throw new IAPError(
      'INFRA',
      'PROVIDER_UNSUPPORTED',
      IAPAction.YIELD_TO_HUMAN,
      'http provider does not implement io.exec; use shell:// URI',
      {
        component: 'http-provider',
        method: 'ioExec',
      },
    )
  }
}

// ───────── Manifest ─────────

export const HTTP_PROVIDER_MANIFEST: ProviderManifest = {
  name: 'http',
  version: '0.1.0',
  schemes: ['http://', 'https://'],
  source: 'builtin',
  expectedHash: '',
  cachePath: '',
  registeredAt: Date.now(),
}

// 导出常量供测试
export { WAF_HEADERS }
