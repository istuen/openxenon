import type { RefDiagnostic } from '../oxl/compiler/ref-diagnostic'
// 🆕 v0.6.1-alpha.4 Phase B: 删 buildDomainDiagnostic import（Domain 引用走 Blueprint ## Refs）
import { buildBlueprintDiagnostic } from '../oxl/compiler/ref-diagnostic'
import { resolveBlueprintFile } from './per-work-blueprints-merger'

interface WorkFileRef {
  name: string
  ref?: string
}

interface WorkFileSummary {
  // 🆕 Phase B: 删 domains 字段（Domain 引用完全由 Blueprint ## Refs 承担）
  blueprints: WorkFileRef[]
}

export function collectUnresolvedRefDiagnostics(work: WorkFileSummary, projectRoot: string): RefDiagnostic[] {
  const diagnostics: RefDiagnostic[] = []
  // 🆕 Phase B: 删 domain ref 诊断（Domain 引用走 Blueprint ## Refs）
  for (const b of work.blueprints) {
    if (!resolveBlueprintFile(b.ref ?? null, b.name, projectRoot)) {
      const reason = b.ref?.startsWith('@oxn/')
        ? '@oxn/ scope has no builtin blueprint registry (V1)'
        : `blueprint file not found for ref "${b.ref ?? b.name}"`
      diagnostics.push(buildBlueprintDiagnostic(b.name, b.ref ?? null, reason))
    }
  }
  return diagnostics
}
