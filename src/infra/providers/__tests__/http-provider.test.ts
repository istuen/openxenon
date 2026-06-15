// =============================================================================
// HttpProvider tests (v0.2 Sprint 3c T6)
//
// 父文档 T3.6 表 3 case:
//   1. WAF 拦截: mock fetch 返 cf-ray 头 → flags: ['waf_detected']
//   2. CDN 缓存: mock fetch 返 age 头 → flags: ['cdn_cache']
//   3. 响应截断: content-length 超 maxBytes → flags: ['response_truncated']
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { HttpProvider } from '../http-provider'

/** 构造 mock fetch 返回 (Response-like) */
function mockFetch(headers: Record<string, string>, body: string = '', contentLength?: number): typeof fetch {
  return (async () => {
    const respHeaders = new Headers(headers)
    if (contentLength !== undefined && !respHeaders.has('content-length')) {
      respHeaders.set('content-length', String(contentLength))
    }
    return new Response(body, { status: 200, headers: respHeaders })
  }) as unknown as typeof fetch
}

describe('HttpProvider', () => {
  test('case 1: WAF 拦截 → flags 包含 waf_detected (cf-ray 头)', async () => {
    const provider = new HttpProvider({ fetchFn: mockFetch({ 'cf-ray': '8a3f2b1c0d9e4f5b-SJC' }) })
    const r = await provider.ioRead({ path: 'https://example.com/api', maxBytes: 1_000_000 })
    expect(r.interference.flags).toContain('waf_detected')
  })

  test('case 1b: WAF 拦截 (x-sucuri-id 头)', async () => {
    const provider = new HttpProvider({ fetchFn: mockFetch({ 'x-sucuri-id': '14013' }) })
    const r = await provider.ioRead({ path: 'https://example.com/api' })
    expect(r.interference.flags).toContain('waf_detected')
  })

  test('case 2: CDN 缓存 (age 头) → flags 包含 cdn_cache', async () => {
    const provider = new HttpProvider({ fetchFn: mockFetch({ age: '3600' }) })
    const r = await provider.ioRead({ path: 'https://cdn.example.com/data' })
    expect(r.interference.flags).toContain('cdn_cache')
  })

  test('case 2b: CDN 缓存 (x-cache: HIT) → flags 包含 cdn_cache', async () => {
    const provider = new HttpProvider({ fetchFn: mockFetch({ 'x-cache': 'HIT from edge' }) })
    const r = await provider.ioRead({ path: 'https://cdn.example.com/data' })
    expect(r.interference.flags).toContain('cdn_cache')
  })

  test('case 3: 响应截断 (content-length > maxBytes) → flags 包含 response_truncated', async () => {
    const provider = new HttpProvider({
      fetchFn: mockFetch({}, 'x'.repeat(100), 100),
    })
    const r = await provider.ioRead({ path: 'https://example.com/big', maxBytes: 10 })
    expect(r.interference.flags).toContain('response_truncated')
    expect(r.result.truncated).toBe(true)
    expect(r.result.bytes).toBe(10)
  })

  test('ioExec 必须抛 IAPError (http provider 不实现 io.exec)', async () => {
    const provider = new HttpProvider({ fetchFn: mockFetch({}) })
    await expect(provider.ioExec({ command: 'curl' })).rejects.toThrow(/http provider does not implement io\.exec/)
  })
})
