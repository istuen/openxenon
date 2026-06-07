// =============================================================================
// http-responds handler (v1.1 P1 probe)
//
// HTTP GET/POST 检查 status code。
// 用 Bun fetch（global），无需 spawn。
// 复 ProgramContext.APIEndpoint term。
//
// 安全：默认 timeout 5s，不缓存，避免 AI 触发真实网络挂起或 SSRF。
// =============================================================================

import type { ProbeContextBase } from '../../kernel/contracts/probe-port'

export interface ProbeContext extends ProbeContextBase {}

export interface HttpRespondsParams {
  /** URL（必填） */
  url: string
  /** HTTP method（默认 GET） */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'
  /** 期望 status code（默认 200） */
  expectedStatus?: number
  /** 超时（毫秒，默认 5000） */
  timeout?: number
  /** 请求 body（POST/PUT 才有意义） */
  body?: string
  /** 请求 headers（可选） */
  headers?: Record<string, string>
}

export interface HttpRespondsResult {
  /** status code === expectedStatus → PASS */
  passed: boolean
  /** 实际 status code（null 表示请求失败） */
  status: number | null
  /** ok 布尔（status 在 200-299） */
  ok: boolean
  /** 请求耗时（ms） */
  durationMs: number
  /** 错误信息（请求失败时填） */
  error?: string
}

export async function executeHttpResponds(params: HttpRespondsParams): Promise<HttpRespondsResult> {
  const start = Date.now()
  const expectedStatus = params.expectedStatus ?? 200
  const timeout = params.timeout ?? 5000

  try {
    const response = await fetch(params.url, {
      method: params.method ?? 'GET',
      headers: params.body ? { 'Content-Type': 'application/json', ...params.headers } : params.headers,
      body: params.body,
      signal: AbortSignal.timeout(timeout),
    })

    const durationMs = Date.now() - start
    return {
      passed: response.status === expectedStatus,
      status: response.status,
      ok: response.ok,
      durationMs,
    }
  } catch (err) {
    return {
      passed: false,
      status: null,
      ok: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
