import { existsSync } from '@openxenon/engine/infra/filesystem'
import type { AssetFormat, ProjectConfig } from '@openxenon/engine/infra/paths'
import { resolveAssetDir } from '@openxenon/engine/infra/paths'
import { getDomainIndexPath, writeDomainIndex } from '@openxenon/engine/oxl/compiler/domain-index-builder'

export function domainCreateTemplate(name: string, format: AssetFormat): string {
  if (format === 'md') {
    return `---
entity: domain
version: 0.3.0
name: ${name}
---

# Domain: ${name}

> TODO: one-line description of the bounded context's business boundary

## Terms

### TODO_Term
- desc: TODO: domain term definition

## Bans

- items:
  - TODO_BannedTerm1
  - TODO_BannedTerm2

## Invariants

- value: TODO: business invariant rule 1
- value: TODO: business invariant rule 2
`
  }
  // v0.7.0+: .oxn format no longer supported, always return .md template
  return `---
entity: domain
version: 0.3.0
name: ${name}
---

# Domain: ${name}

> TODO: one-line description of the bounded context's business boundary

## Terms

### TODO_Term
- desc: TODO: domain term definition

## Bans

- items:
  - TODO_BannedTerm1
  - TODO_BannedTerm2

## Invariants

- value: TODO: business invariant rule 1
- value: TODO: business invariant rule 2
`
}

export function autoRebuildDomainIndex(
  projectRoot: string,
  config?: ProjectConfig,
): {
  ok: boolean
  indexPath?: string
  error?: string
} {
  try {
    const domainsDir = resolveAssetDir(projectRoot, 'domain', config ?? null)
    if (!existsSync(domainsDir)) return { ok: true }
    const outPath = getDomainIndexPath(projectRoot)
    writeDomainIndex({ projectRoot, domainsDir, outPath })
    return { ok: true, indexPath: outPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
