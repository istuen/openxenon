import { existsSync, mkdirSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import type { AssetFormat, ProjectConfig } from '@openxenon/engine/infra/paths'
import { resolveAssetDir } from '@openxenon/engine/infra/paths'
import { getBlueprintIndexPath, writeBlueprintIndex } from '@openxenon/engine/oxl/compiler/blueprint-index-builder'
import { compileOxnToMd } from '@openxenon/engine/oxl/md-bridge/oxl-md-decompiler.js'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractBlueprintIR } from '@openxenon/engine/oxl/md-pipeline/transformers/blueprint.js'
import { serializeBlueprintToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import {
  computeSha256,
  readSyncMetadata,
  composeSyncContent,
  writeCacheSha,
  getCachePath,
  getCacheMdPath,
} from '@openxenon/engine/oxl/md-pipeline/sync-hash.js'
import { validateOxnParseable, verifyBlueprintRoundTrip } from '@openxenon/engine/oxl/md-pipeline/sync-validation.js'

type BlueprintFormat = AssetFormat

export function blueprintCreateTemplate(
  name: string,
  slotsBlock: string,
  slotsArg: string,
  format: BlueprintFormat,
): string {
  if (format === 'md') {
    const slotNames: string[] = []
    for (const line of slotsBlock.split('\n')) {
      const m = line.match(/^ {2}slot "([^"]+)" \{/)
      if (m) slotNames.push(m[1]!)
    }
    const mdSlots = slotNames.map((slotName) => `### ${slotName}\n- deps: []`).join('\n\n')
    return `---
entity: blueprint
version: 0.3.0
name: ${name}
---

# Blueprint: ${name}

> TODO: one-line description of what this blueprint does

## Slots

${mdSlots}
`
  }
  return `// Blueprint: ${name}
// Created by: oxn blueprint create ${name} ${slotsArg ? `--slots ${slotsArg}` : ''}
//
// ──────────────────────────────────────────────────────────────────
// HINTS — read before editing. \`oxn blueprint validate\` will reject
// anything that violates these rules.
// ──────────────────────────────────────────────────────────────────
//  1. slot names: kebab-case (recommended), never PascalCase.
//  2. slot deps: form a DAG. Cycles are rejected by the validator.
//  3. The first slot MUST have deps = [] (entry point).
//  4. prop type: string | number | boolean | any | list<T> | map<T> | enum(...)
//  5. observe: reference builtin probes via @oxn/probes/{shell-exec|fs-exists|...}
//     or describe the physical signal (e.g. ["ShellExec"]).
//  6. Validate:  oxn blueprint validate ${name}
//  7. Trial run: oxn work create --work-id trial-${name} --blueprint verify-pipeline
//  8. Share via Git (this file IS the source of truth):
//        git add .openxenon/blueprints/${name}.oxn && git commit
// ──────────────────────────────────────────────────────────────────
//
// Edit goal/description/props/slots as needed. The mvp-style
// \`context\` and per-part \`skill\` blocks are optional (unified grammar superset).
// After editing, validate with:
//   oxn blueprint validate ${name}
// Then drive it with:
//   oxn work create <work-name> --blueprint ${name} --json

blueprint "${name}" {
  assetVersion = 1
  description = "TODO: one-line description of what this blueprint does"

${slotsBlock}
}
`
}

export function autoRebuildBlueprintIndex(
  projectRoot: string,
  config?: ProjectConfig,
): {
  ok: boolean
  indexPath?: string
  error?: string
} {
  try {
    const blueprintsDir = resolveAssetDir(projectRoot, 'blueprint', config ?? null)
    if (!existsSync(blueprintsDir)) return { ok: true }
    const outPath = getBlueprintIndexPath(projectRoot)
    writeBlueprintIndex({ projectRoot, blueprintsDir, outPath })
    return { ok: true, indexPath: outPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

export interface BlueprintSyncResult {
  name: string
  status: 'updated' | 'unchanged' | 'error'
  oxnSha?: string
  mdSha?: string
  error?: string
}

export async function syncBlueprintOxnToMd(params: {
  projectRoot: string
  name: string
  dryRun?: boolean
}): Promise<BlueprintSyncResult> {
  const { projectRoot, name, dryRun = false } = params
  const blueprintsDir = resolveAssetDir(projectRoot, 'blueprint')
  const oxnPath = join(blueprintsDir, `${name}.oxn`)
  const mdPath = join(projectRoot, BOUNDARY_DIR, 'blueprints-md', `${name}.md`)
  const cachePath = getCachePath(projectRoot, 'blueprint', name)

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
    result = await compileOxnToMd(oxnContent, { entity: 'blueprint', frontmatter: true })
  } catch (err) {
    return { name, status: 'error', error: err instanceof Error ? err.message : String(err) }
  }

  const mdDir = join(projectRoot, BOUNDARY_DIR, 'blueprints-md')
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

export async function syncBlueprintMdToOxn(params: {
  projectRoot: string
  name: string
  dryRun?: boolean
  noChain?: boolean
  oxnPriority?: boolean
  noRoundtrip?: boolean
  noParseCheck?: boolean
}): Promise<BlueprintSyncResult & { errorCode?: string }> {
  const {
    projectRoot,
    name,
    dryRun = false,
    noChain = false,
    oxnPriority = false,
    noRoundtrip = false,
    noParseCheck = false,
  } = params
  const mdDir = join(projectRoot, BOUNDARY_DIR, 'blueprints-md')
  const oxnDir = resolveAssetDir(projectRoot, 'blueprint')
  const mdPath = join(mdDir, `${name}.md`)
  const oxnPath = join(oxnDir, `${name}.oxn`)
  const mdCachePath = getCacheMdPath(projectRoot, 'blueprint', name)

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
      const mdResult = await compileOxnToMd(oxnRaw, { entity: 'blueprint', frontmatter: true })
      const finalContent = composeSyncContent(mdResult.md, {
        oxnSourceSha: oxnSha,
        syncedAt: new Date().toISOString(),
      })
      const mdSha = computeSha256(finalContent)
      writeFileSync(mdPath, finalContent, 'utf-8')
      writeCacheSha(getCachePath(projectRoot, 'blueprint', name), mdSha)
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
    ir = extractBlueprintIR(tree, frontmatter)
  } catch (err) {
    return { name, status: 'error', error: `IR extract: ${String(err)}` }
  }

  const oxnContent = serializeBlueprintToOxn(ir)
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
    const rtResult = await verifyBlueprintRoundTrip(ir, oxnContent)
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
      const mdResult = await compileOxnToMd(oxnRaw, { entity: 'blueprint', frontmatter: true })
      const finalContent = composeSyncContent(mdResult.md, {
        oxnSourceSha: oxnShaNew,
        syncedAt: new Date().toISOString(),
      })
      const mdSha = computeSha256(finalContent)
      writeFileSync(mdPath, finalContent, 'utf-8')
      writeCacheSha(getCachePath(projectRoot, 'blueprint', name), mdSha)
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
