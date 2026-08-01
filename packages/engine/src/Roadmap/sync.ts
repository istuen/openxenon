/**
 * Roadmap/sync.ts — sync Roadmap with actual Asset state
 *
 * Per user decision B (manual hint, NOT auto-sync): sync is invoked by
 * `oxn roadmap sync` AFTER Asset create/edit. Default dry-run. --apply writes changes.
 *
 * Sync algorithm:
 *   1. Scan all 6 AssetKinds under assetRoot
 *   2. For each link in Roadmap scene:
 *      - Dangling: link target (kind+name) does NOT exist in any Asset list
 *      - Outdated: link.description != Asset.abstract
 *   3. Orphans: Assets that exist but are NOT referenced in any Roadmap scene
 *      (informational; not auto-added because scene assignment needs human judgment)
 *
 * Output: SyncReport (separate from --apply's actual modifications)
 *
 * Implementation note: Asset abstract extraction reads from .md (canonical).
 * Reads frontmatter abstract field.
 */

import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveAssetDir, ALL_ASSET_KINDS, type AssetKind } from '../infra/paths.js'
import type { RoadmapLink, RoadmapScene } from './types.js'
import { parseRoadmapMd } from './parser.js'

const ALL_KINDS: readonly AssetKind[] = ALL_ASSET_KINDS

export interface SyncReport {
  /** Roadmap name */
  roadmap: string
  /** Scene name (if scoped) or 'all' */
  scene: string
  /** Links in scope that point to non-existent Assets */
  dangling: Array<{ scene: string; link: RoadmapLink }>
  /** Links whose description differs from Asset.abstract */
  outdated: Array<{ scene: string; link: RoadmapLink; currentAbstract: string }>
  /** Assets that exist but are not referenced anywhere in the Roadmap */
  orphans: Array<{ kind: AssetKind; name: string }>
  /** When --apply: number of links removed (dangling) */
  removedCount: number
  /** When --apply: number of descriptions updated */
  refreshedCount: number
  /** True if --apply actually modified the .md */
  applied: boolean
}

export interface SyncOptions {
  projectRoot: string
  roadmap: string
  /** Optional: scope to one scene */
  scene?: string
  /** If true, write changes; if false (default), dry-run only */
  apply?: boolean
}

export function syncRoadmap(opts: SyncOptions): SyncReport {
  const { projectRoot, roadmap: name, scene: sceneName, apply = false } = opts
  const { roadmap } = parseRoadmapMd(projectRoot, name)

  const liveAssets = scanAllAssets(projectRoot)
  const liveSet = new Set(liveAssets.map((a) => `${a.kind}::${a.name}`))

  const report: SyncReport = {
    roadmap: name,
    scene: sceneName ?? 'all',
    dangling: [],
    outdated: [],
    orphans: [],
    removedCount: 0,
    refreshedCount: 0,
    applied: false,
  }

  const allLinkKeys = new Set<string>()
  const scenesToProcess: RoadmapScene[] = sceneName
    ? roadmap.scenes.filter((s) => s.name === sceneName)
    : roadmap.scenes

  for (const s of scenesToProcess) {
    for (const link of s.links) {
      const key = `${link.kind}::${link.name}`
      allLinkKeys.add(key)

      if (!liveSet.has(key)) {
        report.dangling.push({ scene: s.name, link })
        continue
      }
      // Check description staleness
      const currentAbstract = readAssetAbstract(projectRoot, link.kind, link.name)
      if (currentAbstract !== null && currentAbstract !== link.description) {
        report.outdated.push({ scene: s.name, link, currentAbstract })
      }
    }
  }

  // Orphans: live assets not referenced anywhere
  const referencedSet = new Set<string>()
  for (const s of roadmap.scenes) {
    for (const l of s.links) referencedSet.add(`${l.kind}::${l.name}`)
  }
  for (const a of liveAssets) {
    const k = `${a.kind}::${a.name}`
    if (!referencedSet.has(k) && a.kind !== 'roadmap') {
      // Don't count Roadmap itself as orphan
      report.orphans.push({ kind: a.kind, name: a.name })
    }
  }

  if (apply) {
    const mdPath = join(projectRoot, '.openxenon', 'assets', 'assetmaps', `${name}.md`)
    if (existsSync(mdPath)) {
      let content = readFileSync(mdPath, 'utf-8')

      // 1. Remove dangling links (rewrite table rows)
      for (const d of report.dangling) {
        const rowPattern = new RegExp(
          `^\\|\\s*${escapeRegex(d.link.kind)}\\s*\\|\\s*${escapeRegex(d.link.name)}\\s*\\|.*\\|$`,
          'gm',
        )
        const before = content
        content = content.replace(rowPattern, '')
        if (content !== before) report.removedCount++
        // Also remove leading blank line after header+separator (3 lines)
        content = content.replace(/\n\n### scene: /g, '\n\n### scene: ')
      }

      // 2. Refresh outdated descriptions
      for (const o of report.outdated) {
        const rowPattern = new RegExp(
          `^(\\|\\s*${escapeRegex(o.link.kind)}\\s*\\|\\s*${escapeRegex(o.link.name)}\\s*\\|).*(\\|)\\s*$`,
          'gm',
        )
        const before = content
        content = content.replace(rowPattern, `$1 ${o.currentAbstract} $2`)
        if (content !== before) report.refreshedCount++
      }

      writeFileSync(mdPath, content, 'utf-8')
      report.applied = true
    }
  }

  return report
}

interface ScannedAsset {
  kind: AssetKind
  name: string
  path: string
}

function scanAllAssets(projectRoot: string): ScannedAsset[] {
  const out: ScannedAsset[] = []
  for (const kind of ALL_KINDS) {
    const dir = resolveAssetDir(projectRoot, kind, null)
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const name = f.replace(/\.md$/, '')
      const path = join(dir, f)
      out.push({ kind, name, path })
    }
  }
  return out
}

/**
 * Read Asset abstract from .md frontmatter.
 * Returns null if not found or asset doesn't exist.
 */
function readAssetAbstract(projectRoot: string, kind: AssetKind, name: string): string | null {
  const dir = resolveAssetDir(projectRoot, kind, null)
  // Try .md first (canonical v0.6.1+)
  const mdPath = join(dir, `${name}.md`)
  if (existsSync(mdPath)) {
    const abstract = extractAbstractFromMd(readFileSync(mdPath, 'utf-8'))
    if (abstract) return abstract
  }
  return null
}

function extractAbstractFromMd(content: string): string | null {
  const match = content.match(/^abstract:\s*\|\s*\n((?:[ \t]+.*\n)*)/m)
  if (!match?.[1]) {
    // Try single-line abstract
    const single = content.match(/^abstract:\s*(.+)$/m)
    return single?.[1]?.trim() ?? null
  }
  return (
    match[1]
      .split('\n')
      .map((l) => l.trimStart())
      .join('\n')
      .trim() || null
  )
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
