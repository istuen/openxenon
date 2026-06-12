// =============================================================================
// Runtime Detection
//
// 设计依据：.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md §6
//
// 3 种策略（按可靠性 + 速度排序）：
//   1. globalThis.Bun 检测（最可靠，最快，已缓存）  ← 主用
//   2. process.versions 检测（fallback，debug 上下文）
//   3. cmdline 检测（兜底，log / debug）
//
// §16 Q2 拍板：优先级 globalThis.Bun > process.versions.bun > cmdline
//   - bun --bun oxn 启动时 globalThis.Bun 存在 → 走 Bun 快速路径正是用户期望的（不误判）
//
// §6 缓存：模块加载时一次性求值并缓存（避免每次 probe handler 调用都重检）
// =============================================================================

/**
 * 模块加载时一次性求值（缓存）
 * - Bun 启动时 globalThis.Bun 存在 → _isBun=true
 * - Deno 启动时 globalThis.Deno 存在 → _isDeno=true
 * - Node 18+ 启动时 globalThis.Bun/Deno 都 undefined → 两者都 false
 * - 若用 `bun --bun oxn` 启动（用户主动选 Bun），globalThis.Bun 存在
 *   走 Bun 快速路径正是用户想要的 —— **不**误判
 */
const _isBun = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined'
const _isDeno = typeof (globalThis as { Deno?: unknown }).Deno !== 'undefined'

/**
 * 1. globalThis.Bun 检测（最可靠，最快，已缓存）
 */
export function isBun(): boolean {
  return _isBun
}

/**
 * 1b. globalThis.Deno 检测（v0.1.6 Deno 扩展）
 */
export function isDeno(): boolean {
  return _isDeno
}

/**
 * 2. process.versions 检测（fallback，更稳）
 * 适用：debug 上下文 / 日志输出
 */
export function getRuntimeName(): 'bun' | 'node' | 'deno' | 'unknown' {
  if (_isBun) return 'bun'
  if (_isDeno) return 'deno'
  if (typeof process !== 'undefined' && process.versions?.node) return 'node'
  return 'unknown'
}

/**
 * 3. cmdline 检测（兜底，用于 log / debug 上下文）
 * 适用：当 Bun 用 `bun --bun` 启动 Node 兼容模式时，globalThis.Bun 仍存在
 * 但 process.execArgv 可能含 'bun'
 */
export function detectViaCmdline(): 'bun' | 'node' {
  const execArgv = process.execArgv ?? []
  return execArgv.some((a) => a.includes('bun')) || _isBun ? 'bun' : 'node'
}
