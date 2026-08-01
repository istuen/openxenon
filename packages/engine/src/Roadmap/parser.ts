/**
 * Roadmap/parser.ts — scene-based .md parser (v0.7+ 命名收敛为 AssetMap)
 *
 * Input: `.openxenon/assets/assetmaps/<name>.md` (scene-based; v0.7 已从 `roadmaps/` 收敛为 `assetmaps/`)
 * Output: `Roadmap` AST (in-memory; 类型名沿用 'Roadmap'，AssetKind 枚举值仍为 'roadmap')
 *
 * Format (v0.6.x scene-based):
 * ```
 * ---
 * entity: roadmap
 * version: 1
 * name: oxn-system
 * abstract: |
 *   ...
 * ---
 *
 * # Roadmap: oxn-system
 *
 * ## Scenes
 *
 * ### scene: doc
 * > Scenario description
 *
 * | kind | name | description |
 * |---|---|---|
 * | domain | Foo | Foo description |
 * ```
 *
 * Note: roadmap-compiler.ts (oxl/md-bridge) was the .oxn-based path (deprecated in v0.7).
 *       This parser is the .md-based path for AI Agent consumption.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ALL_ASSET_KINDS, type AssetKind } from '../infra/paths.js'
import type { RoadmapLink, RoadmapParseResult, RoadmapScene } from './types.js'

const VALID_KINDS: readonly AssetKind[] = ALL_ASSET_KINDS

/**
 * Parse a Roadmap .md file from disk.
 *
 * @param projectRoot project root (e.g. /path/to/repo)
 * @param name Roadmap name (e.g. 'oxn-system')
 * @returns parse result with roadmap + warnings
 * @throws if file not found
 */
export function parseRoadmapMd(projectRoot: string, name: string): RoadmapParseResult {
  const path = join(projectRoot, '.openxenon', 'assets', 'assetmaps', `${name}.md`)
  if (!existsSync(path)) {
    throw new Error(`Roadmap not found: ${path}`)
  }
  const content = readFileSync(path, 'utf-8')
  return parseRoadmapMdContent(content)
}

/**
 * Parse Roadmap .md content (string). Used by tests and by parseRoadmapMd.
 */
export function parseRoadmapMdContent(content: string): RoadmapParseResult {
  const warnings: string[] = []

  // 1. Parse frontmatter
  const fm = parseFrontmatter(content)
  if (!fm.name) throw new Error('Roadmap .md missing frontmatter name')
  if (!fm.entity || fm.entity !== 'roadmap') {
    throw new Error(`Roadmap .md frontmatter entity must be 'roadmap', got '${fm.entity}'`)
  }
  const version = parseVersion(fm.version) ?? 1
  const abstract = fm.abstract ?? ''

  // 2. Parse scenes (between ## Scenes and end of body)
  const body = stripFrontmatter(content)
  const scenesBlock = extractSection(body, '## Scenes')
  if (!scenesBlock) {
    warnings.push('Roadmap .md missing ## Scenes section')
    return { roadmap: { name: fm.name, version, abstract, scenes: [] }, warnings }
  }

  const scenes = parseScenesBlock(scenesBlock, warnings)

  return { roadmap: { name: fm.name, version, abstract, scenes }, warnings }
}

/**
 * Parse simple YAML frontmatter (handles just the fields Roadmap needs:
 * entity, version, name, abstract, citations). Not a full YAML parser.
 */
function parseFrontmatter(content: string): {
  entity?: string
  version?: string
  name?: string
  abstract?: string
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/m)
  if (!match?.[1]) return {}
  const block = match[1]
  const result: Record<string, string> = {}
  // Multi-line abstract (abstract: |)
  const abstractMatch = block.match(/^abstract:\s*\|\s*\n((?:[ \t]+.*\n)*)/m)
  if (abstractMatch?.[1]) {
    result.abstract = abstractMatch[1]
      .split('\n')
      .map((l) => l.trimStart())
      .join('\n')
      .trim()
  }
  // Single-line fields
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/)
    if (m && m[1] !== 'abstract') result[m[1]!] = m[2]!.trim()
  }
  return result
}

function parseVersion(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
}

function extractSection(body: string, heading: string): string | null {
  const lines = body.split('\n')
  const startIdx = lines.findIndex((l) => l.trim() === heading)
  if (startIdx < 0) return null
  // Section ends at next ## (H2) or end of body
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i] ?? '')) {
      endIdx = i
      break
    }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n')
}

function parseScenesBlock(block: string, warnings: string[]): RoadmapScene[] {
  const scenes: RoadmapScene[] = []
  // Split by ### scene: <name>
  const lines = block.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const sceneMatch = line.match(/^###\s+scene:\s*(\S+)\s*$/)
    if (sceneMatch) {
      const sceneName = sceneMatch[1]!
      const sceneLines: string[] = []
      i++
      while (i < lines.length && !/^###\s/.test(lines[i] ?? '')) {
        sceneLines.push(lines[i] ?? '')
        i++
      }
      const scene = parseSceneBlock(sceneName, sceneLines.join('\n'), warnings)
      scenes.push(scene)
    } else {
      i++
    }
  }
  return scenes
}

function parseSceneBlock(name: string, block: string, warnings: string[]): RoadmapScene {
  // Description: first > blockquote line(s)
  const descMatch = block.match(/^>\s*(.+?)(?:\n|$)/m)
  const description = descMatch?.[1]?.trim() ?? ''

  // Links: markdown table with | kind | name | description |
  const links = parseLinksTable(block, name, warnings)

  if (links.length === 0) {
    warnings.push(`Scene '${name}' has no links`)
  }

  return { name, description, links }
}

function parseLinksTable(block: string, sceneName: string, warnings: string[]): RoadmapLink[] {
  const links: RoadmapLink[] = []
  const lines = block.split('\n')
  let inTable = false
  let headerSeen = false
  let separatorSeen = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!headerSeen) {
        inTable = true
        const cols = trimmed
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
        if (cols.length < 3 || cols[0] !== 'kind' || cols[1] !== 'name') {
          warnings.push(`Scene '${sceneName}' table header should be: | kind | name | description |`)
          inTable = false
        } else {
          headerSeen = true
        }
      } else if (!separatorSeen && /^[|\s\-:]+$/.test(trimmed)) {
        separatorSeen = true
      } else if (headerSeen && separatorSeen) {
        const cols = trimmed
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
        if (cols.length < 3) {
          warnings.push(`Scene '${sceneName}' row has <3 columns: "${trimmed}"`)
          continue
        }
        const kind = cols[0]!
        const name = cols[1]!
        const description = cols.slice(2).join(' | ')
        if (!VALID_KINDS.includes(kind as AssetKind)) {
          warnings.push(`Scene '${sceneName}' link has invalid kind '${kind}' for '${name}'`)
          continue
        }
        links.push({ kind: kind as AssetKind, name, description })
      }
    } else if (inTable) {
      inTable = false
      headerSeen = false
      separatorSeen = false
    }
  }
  return links
}
