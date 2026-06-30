/**
 * Intent module — analyze-boundaries use case (v0.6 PR-5b实现)
 *
 * Scans work.oxn for domain/blueprint ref declarations and resolves them.
 */
import { readFileSync, existsSync } from '@openxenon/engine/infra/filesystem'
import { getWorkOxnPath } from '@openxenon/engine/Work/dual-state-io'

export interface BoundaryRef {
  kind: 'domain' | 'blueprint'
  name: string
  ref: string
  found: boolean
}

export function analyzeBoundaries(projectRoot: string, workName: string): BoundaryRef[] {
  const oxnPath = getWorkOxnPath(projectRoot, workName)
  if (!existsSync(oxnPath)) return []

  const content = readFileSync(oxnPath, 'utf-8')
  const results: BoundaryRef[] = []

  // Parse domain refs: domain "X" ref "@prj/domains/X";
  const domainRe = /domain\s+"([^"]+)"\s+ref\s+"([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = domainRe.exec(content)) !== null) {
    const name = m[1] as string
    const ref = m[2] as string
    const found = existsSync(oxnPath.replace(/works\/[^/]+\/work\.oxn$/, `domains/${name}.oxn`))
    results.push({ kind: 'domain', name, ref, found })
  }

  // Parse blueprint refs
  const bpRe = /blueprint\s+"([^"]+)"\s+ref\s+"([^"]+)"/g
  while ((m = bpRe.exec(content)) !== null) {
    const name = m[1] as string
    const ref = m[2] as string
    const found = existsSync(oxnPath.replace(/works\/[^/]+\/work\.oxn$/, `blueprints/${name}.oxn`))
    results.push({ kind: 'blueprint', name, ref, found })
  }

  return results
}
