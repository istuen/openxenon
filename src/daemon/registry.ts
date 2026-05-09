import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { AssetState, AssetType } from '../../arsenals/paths'
import { ARSENALS_ROOT } from '../../arsenals/paths'

export interface ArsenalSemantics {
  intent: string
  tags: string[]
  useWhen: string
  relatedAssets: string[]
}

export interface ArsenalEntry {
  name: string
  type: AssetType
  state: AssetState
  path: string
  semantics: ArsenalSemantics
}

export class ArsenalRegistry {
  private entries: Map<string, ArsenalEntry> = new Map()

  buildIndex(projectBoundary: string): void {
    this.entries.clear()

    this.scanDirectory(ARSENALS_ROOT, 'global')

    const projectArsenals = join(projectBoundary, 'arsenals')
    if (existsSync(projectArsenals)) {
      this.scanDirectory(projectArsenals, 'project')
    }
  }

  private scanDirectory(rootPath: string, scope: 'project' | 'global'): void {
    const types: AssetType[] = ['probes', 'proofs', 'stages', 'blueprints']

    for (const type of types) {
      const typePath = join(rootPath, type)
      if (!existsSync(typePath)) continue

      const entries = readdirSync(typePath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const assetName = entry.name
        const canonicalPath = join(typePath, assetName, 'canonical.yaml')
        const draftPath = join(typePath, assetName, 'draft.yaml')

        const assetPath = existsSync(canonicalPath) ? canonicalPath :
                         existsSync(draftPath) ? draftPath : null

        if (!assetPath) continue

        try {
          const content = readFileSync(assetPath, 'utf-8')
          const parsed = JSON.parse(content)
          const semantics = this.extractSemantics(parsed)

          const entry: ArsenalEntry = {
            name: assetName,
            type,
            state: assetPath.endsWith('canonical.yaml') ? 'canonical' : 'draft',
            path: assetPath,
            semantics
          }

          this.entries.set(assetPath, entry)
        } catch {
          // Skip malformed YAML files
        }
      }
    }
  }

  private extractSemantics(parsed: Record<string, unknown>): ArsenalSemantics {
    if (parsed.semantics && typeof parsed.semantics === 'object') {
      const sem = parsed.semantics as Record<string, unknown>
      return {
        intent: typeof sem.intent === 'string' ? sem.intent : '',
        tags: Array.isArray(sem.tags) ? sem.tags as string[] : [],
        useWhen: typeof sem.useWhen === 'string' ? sem.useWhen : '',
        relatedAssets: Array.isArray(sem.relatedAssets) ? sem.relatedAssets as string[] : []
      }
    }
    return { intent: '', tags: [], useWhen: '', relatedAssets: [] }
  }

  search(query: string): ArsenalEntry[] {
    const normalizedQuery = query.toLowerCase()
    const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0)

    const results: ArsenalEntry[] = []
    for (const entry of this.entries.values()) {
      const score = this.calculateMatchScore(entry, queryTerms)
      if (score > 0) {
        results.push(entry)
      }
    }

    return results.sort((a, b) => {
      const scoreA = this.calculateMatchScore(a, queryTerms)
      const scoreB = this.calculateMatchScore(b, queryTerms)
      return scoreB - scoreA
    })
  }

  private calculateMatchScore(entry: ArsenalEntry, queryTerms: string[]): number {
    let score = 0

    for (const term of queryTerms) {
      if (entry.name.toLowerCase().includes(term)) {
        score += 10
      }
      if (entry.semantics.intent.toLowerCase().includes(term)) {
        score += 5
      }
      if (entry.semantics.useWhen.toLowerCase().includes(term)) {
        score += 3
      }
      if (entry.semantics.tags.some(tag => tag.toLowerCase().includes(term))) {
        score += 8
      }
    }

    return score
  }

  getByType(type: AssetType): ArsenalEntry[] {
    const results: ArsenalEntry[] = []
    for (const entry of this.entries.values()) {
      if (entry.type === type) {
        results.push(entry)
      }
    }
    return results
  }

  size(): number {
    return this.entries.size
  }

  get(assetPath: string): ArsenalEntry | undefined {
    return this.entries.get(assetPath)
  }

  updateEntry(assetPath: string, entry: ArsenalEntry): void {
    this.entries.set(assetPath, entry)
  }

  removeEntry(assetPath: string): void {
    this.entries.delete(assetPath)
  }
}

export const globalArsenalRegistry = new ArsenalRegistry()