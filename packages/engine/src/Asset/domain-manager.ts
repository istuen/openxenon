import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import type { AssetFormat, ProjectConfig } from '@openxenon/engine/infra/paths'
import {
  resolveAssetDir,
} from '@openxenon/engine/infra/paths'
import {
  getDomainIndexPath,
  writeDomainIndex,
} from '@openxenon/engine/oxl/compiler/domain-index-builder'
import { compileOxnToMd } from '@openxenon/engine/oxl/md-bridge/oxl-md-decompiler.js'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractDomainIR } from '@openxenon/engine/oxl/md-pipeline/transformers/domain.js'
import { serializeDomainToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import {
  computeSha256,
  readSyncMetadata,
  composeSyncContent,
  writeCacheSha,
  getCachePath,
  getCacheMdPath,
} from '@openxenon/engine/oxl/md-pipeline/sync-hash.js'
import { validateOxnParseable, verifyDomainRoundTrip } from '@openxenon/engine/oxl/md-pipeline/sync-validation.js'

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
  return `// Domain: ${name}
// Created by: oxn domain create ${name}
//
// ──────────────────────────────────────────────────────────────────
// HINTS — read before editing. \`oxn domain validate\` will reject
// anything that violates these rules.
// ──────────────────────────────────────────────────────────────────
//  1. Domain name: PascalCase recommended (e.g. MemberContext).
//  2. term: ≥3 core entities, key=word, value=definition. AI MUST use
//     these words when writing code in this context.
//  3. ban: ≥2 forbidden words. AI MUST NOT use these words (prevents
//     cross-context terminology drift like User/Customer/Member mix).
//  4. invariant: ≥1 business hard-rule. v0.1 documents; v0.2 enforces
//     via language-ban-checker Probe. 写法决策见 oxn-cli skill
//     「invariant 写法决策树」章节（1 条→单块单条 / 同主题→单块多条 / 异主题→多块按 // ── <主题> ── 分组，IR 等价）。
//  5. Validate: oxn domain validate ${name}
//  6. Share via Git (this file IS the source of truth):
//        git add .openxenon/domains/${name}.oxn && git commit
// ──────────────────────────────────────────────────────────────────
//
// DDD bounded context skeleton. After filling in term / ban / invariant,
// reference it from work.oxn via:
//   domain "${name}" ref "@prj/domains/${name}";
//
// Validation:
//   oxn domain validate ${name}

domain "${name}" {
  description = "TODO: one-line description of the bounded context's business boundary"

  term {
    "TODO_Term": "TODO: domain term definition"
  }

  ban { "TODO_BannedTerm1", "TODO_BannedTerm2" }

  // invariant 写法决策：1 条→单块单条 / 同主题→单块多条 / 异主题→多块按 // ── <主题> ── 分组
  // 默认示范「单块多条」（IR 等价；详见 oxn-cli skill「invariant 写法决策树」）
  invariant {
    "TODO: business invariant rule 1"
    "TODO: business invariant rule 2"
  }
}
`
}

export function autoRebuildDomainIndex(projectRoot: string, config?: ProjectConfig): {
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

export interface SyncResult {
  name: string
  status: 'updated' | 'unchanged' | 'error'
  oxnSha?: string
  mdSha?: string
  error?: string
}

export async function syncDomainOxnToMd(params: {
  projectRoot: string
  name: string
  dryRun?: boolean
}): Promise<SyncResult> {
  const { projectRoot, name, dryRun = false } = params
  const domainsDir = resolveAssetDir(projectRoot, 'domain')
  const oxnPath = join(domainsDir, `${name}.oxn`)
  const mdPath = join(projectRoot, BOUNDARY_DIR, 'domains-md', `${name}.md`)
  const cachePath = getCachePath(projectRoot, 'domain', name)

  if (!existsSync(oxnPath)) {
    return { name, status: 'error', error: `.oxn not found: ${oxnPath}` }
  }

  const oxnContent = readFileSync(oxnPath, 'utf-8')
  const oxnSha = computeSha256(oxnContent)

  const prevMeta = existsSync(mdPath) ? readSyncMetadata(mdPath) : null
  const prevOxnSha = prevMeta?.oxnSourceSha

  if (prevOxnSha === oxnSha && existsSync(mdPath)) {
    return { name, status: 'unchanged', oxnSha, mdSha: prevMeta?.mdSelfSha }
  }

  if (dryRun) {
    return { name, status: 'updated', oxnSha }
  }

  let result
  try {
    result = await compileOxnToMd(oxnContent, { entity: 'domain', frontmatter: true })
  } catch (err) {
    return { name, status: 'error', error: err instanceof Error ? err.message : String(err) }
  }

  const mdDir = join(projectRoot, BOUNDARY_DIR, 'domains-md')
  if (!existsSync(mdDir)) mkdirSync(mdDir, { recursive: true })

  const finalContent = composeSyncContent(result.md, {
    oxnSourceSha: oxnSha,
    syncedAt: new Date().toISOString(),
  })
  const mdSha = computeSha256(finalContent)

  writeFileSync(mdPath, finalContent, 'utf-8')
  writeCacheSha(cachePath, mdSha)

  return { name, status: 'updated', oxnSha, mdSha }
}

export async function syncDomainMdToOxn(params: {
  projectRoot: string
  name: string
  dryRun?: boolean
  noChain?: boolean
  oxnPriority?: boolean
  noRoundtrip?: boolean
  noParseCheck?: boolean
}): Promise<SyncResult & { errorCode?: string }> {
  const {
    projectRoot,
    name,
    dryRun = false,
    noChain = false,
    oxnPriority = false,
    noRoundtrip = false,
    noParseCheck = false,
  } = params
  const mdDir = join(projectRoot, BOUNDARY_DIR, 'domains-md')
  const oxnDir = resolveAssetDir(projectRoot, 'domain')
  const mdPath = join(mdDir, `${name}.md`)
  const oxnPath = join(oxnDir, `${name}.oxn`)
  const mdCachePath = getCacheMdPath(projectRoot, 'domain', name)

  if (!existsSync(mdPath)) {
    return { name, status: 'error', error: `.md not found: ${mdPath}` }
  }

  const mdContent = readFileSync(mdPath, 'utf-8')
  const shaMdCurrent = computeSha256(mdContent)

  const oxnExists = existsSync(oxnPath)
  const oxnSha = oxnExists ? computeSha256(readFileSync(oxnPath, 'utf-8')) : ''
  const oxnPrevSha = oxnExists ? readSyncMetadata(mdPath)?.oxnSourceSha : undefined
  const bothChanged = oxnExists && oxnPrevSha && oxnPrevSha !== oxnSha
  if (bothChanged && oxnPriority) {
    try {
      const oxnRaw = readFileSync(oxnPath, 'utf-8')
      const mdResult = await compileOxnToMd(oxnRaw, { entity: 'domain', frontmatter: true })
      const finalContent = composeSyncContent(mdResult.md, {
        oxnSourceSha: oxnSha,
        syncedAt: new Date().toISOString(),
      })
      const mdSha = computeSha256(finalContent)
      writeFileSync(mdPath, finalContent, 'utf-8')
      writeCacheSha(getCachePath(projectRoot, 'domain', name), mdSha)
      writeFileSync(mdCachePath, `${mdSha}\n`, 'utf-8')
    } catch (err) {
      return { name, status: 'error', error: `oxn-priority sync: ${String(err)}` }
    }
    return { name, status: 'updated', mdSha: shaMdCurrent, oxnSha }
  }

  if (existsSync(mdCachePath)) {
    const shaMdPrev = readFileSync(mdCachePath, 'utf-8').trim()
    if (shaMdCurrent === shaMdPrev) {
      return { name, status: 'unchanged', mdSha: shaMdCurrent }
    }
  }

  if (dryRun) {
    return { name, status: 'updated', mdSha: shaMdCurrent }
  }

  let tree, frontmatter
  try {
    const parsed = parseMarkdown(mdContent)
    tree = parsed.tree
    frontmatter = parsed.frontmatter
  } catch (err) {
    return { name, status: 'error', error: `md parse: ${String(err)}` }
  }

  let ir
  try {
    ir = extractDomainIR(tree, frontmatter)
  } catch (err) {
    return { name, status: 'error', error: `IR extract: ${String(err)}` }
  }

  const oxnContent = serializeDomainToOxn(ir)
  const oxnShaNew = computeSha256(oxnContent)

  if (!noParseCheck) {
    const parseResult = await validateOxnParseable(oxnContent)
    if (!parseResult.ok) {
      return {
        name,
        status: 'error',
        error: `langium parse failed: ${parseResult.errors[0]}`,
        errorCode: 'E_SYNC_LANGIUM_VALIDATION_FAILED',
      }
    }
  }

  if (!noRoundtrip) {
    const rtResult = await verifyDomainRoundTrip(ir, oxnContent)
    if (!rtResult.ok) {
      return {
        name,
        status: 'error',
        error: `round-trip loss: ${rtResult.lostFields.join(', ')}`,
        errorCode: 'E_SYNC_ROUND_TRIP_LOSS',
      }
    }
  }

  if (!existsSync(oxnDir)) mkdirSync(oxnDir, { recursive: true })
  writeFileSync(oxnPath, oxnContent, 'utf-8')

  if (!noChain && existsSync(oxnPath)) {
    try {
      const oxnRaw = readFileSync(oxnPath, 'utf-8')
      const mdResult = await compileOxnToMd(oxnRaw, { entity: 'domain', frontmatter: true })
      const finalContent = composeSyncContent(mdResult.md, {
        oxnSourceSha: oxnShaNew,
        syncedAt: new Date().toISOString(),
      })
      const mdSha = computeSha256(finalContent)
      writeFileSync(mdPath, finalContent, 'utf-8')
      writeCacheSha(getCachePath(projectRoot, 'domain', name), mdSha)
    } catch {
      // chained sync fails silently
    }
  }

  const cacheDir = join(mdDir, '.cache')
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
  const finalMdSha = existsSync(mdPath) ? computeSha256(readFileSync(mdPath, 'utf-8')) : shaMdCurrent
  writeFileSync(mdCachePath, `${finalMdSha}\n`, 'utf-8')

  return { name, status: 'updated', mdSha: finalMdSha, oxnSha: oxnShaNew }
}
