/**
 * src/kernel/verdicts/trust-baseline.ts
 * v0.2 T4 Probe Signal Taint v2 PR-1: TRUST_BASELINE + applyTrustBaseline
 *
 * 设计：硬编码 12 项 flag → RED/YELLOW 映射，拒绝"阈值调参"哲学
 *   - 信任是系统决策，不是用户决策
 *   - 硬编码语义可审计（git blame 一行即知）
 *   - 行为可复现（版本号锁死 → 行为锁死）
 *
 * RED flag → 短路返回 INCONCLUSIVE（YIELD_TO_HUMAN 决策门）
 * YELLOW flag → 透传 + 记录（仍 PASS/FAIL，flag 写入 interferenceFlags）
 * 无 flag → 透传
 */

import type { InterferenceFlag } from '../contracts/io-primitive'
import type { ProbeVerdict } from '../contracts/probe-port'

/**
 * 12 项 flag 的硬编码基线映射
 * - RED: 短路返回 INCONCLUSIVE
 * - YELLOW: 透传 + 记录到 interferenceFlags
 */
export const TRUST_BASELINE: Readonly<Record<InterferenceFlag, 'RED' | 'YELLOW'>> = Object.freeze({
  waf_detected: 'RED', // WAF 拦截的响应不算业务事实
  cdn_cache: 'YELLOW', // CDN 缓存可作为"缓存内的事实"，仅记录不阻断
  cache_path: 'YELLOW', // .cache / node_modules 是"工程文件"，业务上合法
  just_modified: 'RED', // mtimeMs 距 now < 1000ms 必是构建残留
  symlink: 'YELLOW', // 符号链接在 OXN 部署中合法
  detached_head: 'RED', // git HEAD detached = 工程状态未受版本控制
  shallow_clone: 'RED', // git 历史不完整
  sandbox_violation: 'RED', // shell 命令被沙箱拦截 = 实际没执行（PR-4 触发）
  network_timeout: 'RED', // 超时 = 没拿到响应
  response_truncated: 'RED', // 截断 = 响应不完整
  permission_denied: 'RED', // 权限拦截 = 不可读
  unknown: 'RED', // 未识别的 flag 一律 RED（保守策略）
})

/**
 * 应用 Trust Baseline 到 flags
 * - 任一 RED flag → 短路返回 INCONCLUSIVE
 * - 仅 YELLOW flag → 透传 + 记录
 * - 无 flag → 走 normalJudge() 原 strategy
 */
export function applyTrustBaseline(flags: readonly InterferenceFlag[], normalJudge: () => ProbeVerdict): ProbeVerdict {
  const redFlags = flags.filter((f) => TRUST_BASELINE[f] === 'RED')
  if (redFlags.length > 0) {
    return {
      verdict: 'INCONCLUSIVE',
      passed: false,
      message: `signal tainted by ${redFlags.length} red flag(s): ${redFlags.join(', ')}`,
      failureMessage: `INCONCLUSIVE: ${redFlags.join(', ')} — YIELD_TO_HUMAN required`,
      actual: { redFlags, allFlags: [...flags] },
    }
  }
  const verdict = normalJudge()
  if (flags.length > 0) {
    return { ...verdict, interferenceFlags: [...flags] }
  }
  return verdict
}
