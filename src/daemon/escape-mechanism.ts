// =============================================================================
// escape-mechanism.ts (v0.2 T14 — Daemon PR-4)
// 在 planLock 边界外提供"逃逸"阻断的能力
// =============================================================================

export interface EscapeSignal {
  id: string
  reason: string
  timestamp: number
  allowed: boolean
}

let signals: EscapeSignal[] = []

/** 请求逃逸：当 planLock 校验失败时, 调用此函数决定是否中断该 Work */
export function requestEscape(signal: { id: string; reason: string }): EscapeSignal {
  const s: EscapeSignal = {
    id: signal.id,
    reason: signal.reason,
    timestamp: Date.now(),
    allowed: false, // 默认拒绝逃逸 (严格模式)
  }
  signals.push(s)
  return s
}

/** 强制允许逃逸 (operator override) */
export function allowEscape(id: string): boolean {
  const s = signals.find((x) => x.id === id)
  if (s) {
    s.allowed = true
    return true
  }
  return false
}

/** 获取所有未决逃逸请求 */
export function getPendingEscapes(): EscapeSignal[] {
  return signals.filter((s) => !s.allowed)
}

/** 清理已处理的逃逸 */
export function clearEscapes(): void {
  signals = []
}
