import type { RefDiagnostic } from '../oxl/compiler/ref-diagnostic'
import { buildDomainDiagnostic, buildBlueprintDiagnostic } from '../oxl/compiler/ref-diagnostic'
import { resolveDomainFile } from './per-work-domains-merger'
import { resolveBlueprintFile } from './per-work-blueprints-merger'

interface WorkFileRef {
  name: string
  ref?: string
}

interface WorkFileSummary {
  domains: WorkFileRef[]
  blueprints: WorkFileRef[]
}

export function collectUnresolvedRefDiagnostics(work: WorkFileSummary, projectRoot: string): RefDiagnostic[] {
  const diagnostics: RefDiagnostic[] = []
  for (const d of work.domains) {
    if (!resolveDomainFile(d.ref ?? null, d.name, projectRoot)) {
      const reason = d.ref?.startsWith('@oxn/')
        ? '@oxn/ scope has no builtin domain registry (V1)'
        : `domain file not found for ref "${d.ref ?? d.name}"`
      diagnostics.push(buildDomainDiagnostic(d.name, d.ref ?? null, reason))
    }
  }
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
