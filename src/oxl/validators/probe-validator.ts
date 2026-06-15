// =============================================================================
// probe-validator.ts (v0.2 Sprint 5b T10)
//
// OXL 1.3 Probe scheme 静态校验器
// 物理路径: src/oxl/validators/probe-validator.ts
// 父文档: .openxenon/forges/sprints/sprint-5b/2026-06-15-probe-taint-oxl-grammar-pr6.md §T6.4
//
// 校验规则 (3 条):
//   1. scheme 格式合法: 必须以 "scheme://" 结尾
//   2. scheme 已在 ProviderRegistry 注册 (builtin 或 cli-add)
//   3. scheme 与 target URI 前缀一致 (若两者都有)
//
// L0-OXL 层 — 可依赖 L0-Contract (ProviderRegistry) + L1-Infra 物理层
// =============================================================================

import type { ProbeDeclaration } from '../generated/ast'
import type { ProviderRegistry } from '../../infra/registry/provider-registry'

export interface ProbeSchemeError {
  probeName: string
  reason: string
}

export type ValidateProbeSchemesResult = { ok: true } | { ok: false; errors: ProbeSchemeError[] }

/**
 * 校验一组 ProbeDeclaration 的 scheme 字段
 * @param probes 要校验的 probe 列表 (从 OXL 解析后传入)
 * @param registry ProviderRegistry (用于 scheme 已注册检查)
 */
export function validateProbeSchemes(
  probes: ProbeDeclaration[],
  registry: ProviderRegistry,
): ValidateProbeSchemesResult {
  const errors: ProbeSchemeError[] = []

  for (const probe of probes) {
    if (!probe.scheme) continue // scheme 是可选字段; 未声明则跳过 (向后兼容)

    const scheme = probe.scheme

    // 规则 1: scheme 格式 — 必须以 "://" 结尾
    if (!scheme.endsWith('://')) {
      errors.push({
        probeName: probe.name,
        reason: `scheme "${scheme}" must end with "://" (e.g. "file://", "http://", "git://")`,
      })
      continue
    }

    // 规则 2: scheme 已在 registry 注册 (builtin 或 cli-add)
    if (registry.getStatus(scheme) === 'UNREGISTERED') {
      errors.push({
        probeName: probe.name,
        reason:
          `scheme "${scheme}" is not registered. ` +
          `Run 'oxn probe add <source> --name <name> --schemes ${scheme}' to register a provider.`,
      })
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }
  return { ok: true }
}
