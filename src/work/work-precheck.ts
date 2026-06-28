// =============================================================================
// work-precheck.ts (v0.2 Sprint 5a T9 — Probe Signal Taint v2 PR-5)
//
// Work 前置校验: 调 ProviderRegistry.checkWorkDependencies 精准阻断
// 父文档: .openxenon/forges/sprints/sprint-5a/2026-06-15-probe-taint-daemon-workcheck-pr5.md §1.2
//
// v2 核心倒置: 仅阻断**该 Work** (不引用坏 probe 的 Work 正常运行)
// 调用点: work run / work submit / work migrate 阶段前 (T9 实施 1-2 处即可)
//
// requiredSchemes 由调用方注入 (work file 不直接带 scheme — probe 抽象不匹配 Provider
// scheme 抽象, T9 阶段保守设计, 后续 PR 可基于 probe.type 自动 derive)
// =============================================================================

import { IAPError, IAPAction } from '@openxenon/engine/kernel'
import { getProviderRegistry } from '@openxenon/engine/infra/registry/provider-registry'

/** Work 启动前的前置校验, 仅阻断**该 Work** (其他 Work 不受影响) */
export async function workPrecheck(requiredSchemes: string[]): Promise<void> {
  if (requiredSchemes.length === 0) return

  const reg = getProviderRegistry()
  const check = reg.checkWorkDependencies(requiredSchemes)

  if (!check.ok) {
    // 精准阻断**该 Work** — 第一个 blocked 抛 IAPError (按 reason 区分 CORRUPTED / MISSING)
    const first = check.blocked[0]
    if (!first) return

    let code: 'PROBE_CORRUPTED' | 'PROBE_MISSING' = 'PROBE_MISSING'
    if (first.reason.includes('corrupted')) {
      code = 'PROBE_CORRUPTED'
    } else if (first.reason.includes('missing')) {
      code = 'PROBE_MISSING'
    }

    throw new IAPError('PROOF', code, IAPAction.YIELD_TO_HUMAN, `Probe scheme "${first.scheme}" ${first.reason}`, {
      component: 'work-precheck',
      scheme: first.scheme,
      reason: first.reason,
      allBlocked: check.blocked,
    })
  }
}
