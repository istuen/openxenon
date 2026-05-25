import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import type { AssetState, AssetType } from '../infra/paths'
import { GLOBAL_ARSENALS_ROOT, GLOBAL_FORGES_ROOT } from '../infra/paths'
import { resolveBoundary } from '../infra/paths'
import type { Scope as InfraScope } from '../infra/paths'

export const ProbeTypeSchema = z.enum(['fs_exists', 'fs_not_exists', 'fs_match', 'shell_exec'])

export type Scope = InfraScope | 'fallback' | 'builtin'

export type ProbeNamespace = 'oxn' | 'scope' | 'project'

export interface ParsedProbeRef {
  namespace: ProbeNamespace
  scopeName?: string
  probeName: string
  raw: string
}

export function parseProbeNamespace(ref: string): ParsedProbeRef | null {
  if (ref.startsWith('oxn/')) {
    return { namespace: 'oxn', probeName: ref.slice(3), raw: ref }
  }
  if (ref.startsWith('@')) {
    const slashIndex = ref.indexOf('/')
    if (slashIndex === -1) return null
    return { namespace: 'scope', scopeName: ref.slice(1, slashIndex), probeName: ref.slice(slashIndex + 1), raw: ref }
  }
  if (ref.startsWith('./') || ref.startsWith('project/')) {
    const probeName = ref.startsWith('./') ? ref.slice(2) : ref.slice(8)
    return { namespace: 'project', probeName, raw: ref }
  }
  return null
}

export function isValidProbeRef(ref: string): boolean {
  return parseProbeNamespace(ref) !== null
}

export function isBareProbeRef(ref: string): boolean {
  return parseProbeNamespace(ref) === null
}

export interface StandardAsset {
  name: string
  type: AssetType
  state: AssetState
  path: string
  content: string
}

export function scanFlatStructure(boundary: string, type: AssetType, scanForges: boolean = false): StandardAsset[] {
  const typePath = join(boundary, type)

  if (!existsSync(typePath)) {
    return []
  }

  const assets: StandardAsset[] = []
  const entries = readdirSync(typePath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const assetName = entry.name
      if (scanForges) {
        const draftFile = join(typePath, assetName, 'draft.oxn')
        if (existsSync(draftFile)) {
          const content = readFileSync(draftFile, 'utf-8')
          assets.push({
            name: assetName,
            type,
            state: 'draft',
            path: draftFile,
            content,
          })
        }
      } else {
        const canonicalFile = join(typePath, assetName, 'canonical.oxn')
        if (existsSync(canonicalFile)) {
          const content = readFileSync(canonicalFile, 'utf-8')
          assets.push({
            name: assetName,
            type,
            state: 'canonical',
            path: canonicalFile,
            content,
          })
        }
      }
    } else if (
      entry.name.endsWith('.yaml') ||
      entry.name.endsWith('.yml') ||
      entry.name.endsWith('.json') ||
      entry.name.endsWith('.oxn')
    ) {
      const name = entry.name.replace(/\.(yaml|yml|json|oxn)$/, '')
      const filePath = join(typePath, entry.name)
      const content = readFileSync(filePath, 'utf-8')
      const isCanonical = !scanForges
      assets.push({
        name,
        type,
        state: isCanonical ? 'canonical' : 'draft',
        path: filePath,
        content,
      })
    }
  }

  return assets
}

function getTypeFromPath(assetPath: string): AssetType | null {
  if (assetPath.includes('/probes/') || assetPath.includes('/probe/')) {
    return 'probes'
  }
  if (assetPath.includes('/blueprints/') || assetPath.includes('/blueprint/')) {
    return 'blueprints'
  }
  if (assetPath.includes('/parts/') || assetPath.includes('/part/')) {
    return 'parts'
  }
  return null
}

function scanArsenalsDirectory(scope: Scope, projectBoundary: string | undefined, type: AssetType): StandardAsset[] {
  function scanProjectBoundary(type: AssetType): StandardAsset[] {
    if (!projectBoundary) return []
    return scanFlatStructure(join(projectBoundary, 'arsenals'), type)
  }

  function scanGlobal(type: AssetType): StandardAsset[] {
    return scanFlatStructure(GLOBAL_ARSENALS_ROOT, type)
  }

  let projectAssets: StandardAsset[] = []
  let globalAssets: StandardAsset[] = []

  if (scope === 'project' || scope === 'fallback') {
    projectAssets = scanProjectBoundary(type)
  }
  if (scope === 'global' || (scope === 'fallback' && projectAssets.length === 0)) {
    globalAssets = scanGlobal(type)
  }

  const allAssets = [...projectAssets, ...globalAssets]
  const seen = new Set<string>()
  return allAssets.filter((asset) => {
    if (seen.has(asset.path)) return false
    seen.add(asset.path)
    return true
  })
}

function scanForgesDirectory(scope: Scope, projectBoundary: string | undefined, type: AssetType): StandardAsset[] {
  function scanProjectForges(type: AssetType): StandardAsset[] {
    if (!projectBoundary) return []
    const forgePath = join(projectBoundary, 'forges', type)
    if (!existsSync(forgePath)) return []
    return scanFlatStructure(forgePath, type, true)
  }

  function scanGlobalForges(type: AssetType): StandardAsset[] {
    const forgePath = join(GLOBAL_FORGES_ROOT, type)
    if (!existsSync(forgePath)) return []
    return scanFlatStructure(forgePath, type, true)
  }

  let projectAssets: StandardAsset[] = []
  let globalAssets: StandardAsset[] = []

  if (scope === 'project' || scope === 'fallback') {
    projectAssets = scanProjectForges(type)
  }
  if (scope === 'global' || (scope === 'fallback' && projectAssets.length === 0)) {
    globalAssets = scanGlobalForges(type)
  }

  return [...projectAssets, ...globalAssets]
}

export function loadArsenalsByState(
  scope: Scope,
  projectBoundary: string | undefined,
  state: AssetState,
): StandardAsset[] {
  if (state === 'draft') {
    return []
  }
  const projectProbes = scanArsenalsDirectory(scope, projectBoundary, 'probes')
  const projectBlueprints = scanArsenalsDirectory(scope, projectBoundary, 'blueprints')
  const projectParts = scanArsenalsDirectory(scope, projectBoundary, 'parts')

  return [...projectProbes, ...projectBlueprints, ...projectParts]
}

export function loadArsenalsByTypeAndState(
  scope: Scope,
  projectBoundary: string | undefined,
  type: AssetType,
  state: AssetState,
): StandardAsset[] {
  if (state === 'draft') {
    return []
  }
  return scanArsenalsDirectory(scope, projectBoundary, type)
}

export function loadForgesByType(scope: Scope, projectBoundary: string | undefined, type: AssetType): StandardAsset[] {
  return scanForgesDirectory(scope, projectBoundary, type)
}

export function loadStandardByPath(assetPath: string): StandardAsset | null {
  if (!existsSync(assetPath)) {
    return null
  }

  const content = readFileSync(assetPath, 'utf-8')
  const type = getTypeFromPath(assetPath)
  if (!type) {
    return null
  }

  const isForge = assetPath.includes('/forges/')
  const isArsenal = assetPath.includes('/arsenals/')

  if (!isForge && !isArsenal) {
    return null
  }

  const parts = assetPath.split('/')
  const typeIndex = parts.findIndex((p) => p === 'forges' || p === 'arsenals')
  if (typeIndex === -1) return null

  const nameIndex = typeIndex + 2
  if (nameIndex >= parts.length) return null

  const name = parts[nameIndex]
  if (!name || name === 'probes' || name === 'blueprints' || name === 'parts') {
    return null
  }

  const isDraft = isForge || assetPath.endsWith('/draft.oxn') || assetPath.endsWith('/draft.yaml')
  const state: AssetState = isDraft ? 'draft' : 'canonical'

  return {
    name,
    type,
    state,
    path: assetPath,
    content,
  }
}

export function generateCompiledArtifact(assetPath: string, boundary: string): string | null {
  if (!existsSync(assetPath)) return null

  const content = readFileSync(assetPath, 'utf-8')
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12)
  const type = getTypeFromPath(assetPath)
  if (!type) return null

  const parsed = JSON.parse(content) as Record<string, unknown>
  const compiled = {
    ...parsed,
    _compiled_hash: hash,
    _compiled_at: new Date().toISOString(),
    _source_path: assetPath,
  }

  const cacheDir = join(boundary, 'cache', 'compiled', type)
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }

  const name =
    assetPath
      .split('/')
      .pop()
      ?.replace(/\.(yaml|oxn)$/, '') || 'unknown'
  const compiledPath = join(cacheDir, `${name}.compiled.json`)
  writeFileSync(compiledPath, JSON.stringify(compiled, null, 2), 'utf-8')

  updateCacheManifest(boundary, type, name, hash)

  return compiledPath
}

export function updateCacheManifest(boundary: string, type: string, name: string, hash: string): void {
  const manifestPath = join(boundary, 'cache', 'manifest.json')
  let manifest: Record<string, Record<string, string>> = {}
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      /* use empty */
    }
  }
  if (!manifest[type]) manifest[type] = {}
  manifest[type][name] = hash
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

export function loadStandardByName(
  scope: Scope,
  projectBoundary: string | undefined,
  name: string,
  type: AssetType,
): StandardAsset | null {
  const boundary =
    scope === 'global' ? resolveBoundary(scope) : projectBoundary ? projectBoundary : resolveBoundary('project')

  if (type === 'parts' || type === 'probes') {
    const flatPath = join(boundary, 'arsenals', type, `${name}.oxn`)
    if (existsSync(flatPath)) {
      const content = readFileSync(flatPath, 'utf-8')
      return { name, type, state: 'canonical' as const, path: flatPath, content }
    }
    const nestedPath = join(boundary, 'arsenals', type, name, 'canonical.oxn')
    if (existsSync(nestedPath)) {
      const content = readFileSync(nestedPath, 'utf-8')
      return { name, type, state: 'canonical' as const, path: nestedPath, content }
    }
  } else {
    const canonicalPath = join(boundary, 'arsenals', type, name, 'canonical.oxn')
    if (existsSync(canonicalPath)) {
      const content = readFileSync(canonicalPath, 'utf-8')
      return { name, type, state: 'canonical' as const, path: canonicalPath, content }
    }
  }

  const forgeDraftPath =
    type === 'parts' || type === 'probes'
      ? join(boundary, 'forges', type, `${name}.oxn`)
      : join(boundary, 'forges', type, name, 'draft.oxn')
  if (existsSync(forgeDraftPath)) {
    const content = readFileSync(forgeDraftPath, 'utf-8')
    return { name, type, state: 'draft' as const, path: forgeDraftPath, content }
  }

  return null
}

export function resolveAssetPath(
  scope: Scope,
  projectBoundary: string | undefined,
  name: string,
  type: AssetType,
  state: AssetState,
): string | null {
  const boundary =
    scope === 'global' ? resolveBoundary(scope) : projectBoundary ? projectBoundary : resolveBoundary('project')

  if (type === 'parts' || type === 'probes') {
    const flatPath = join(boundary, 'arsenals', type, `${name}.oxn`)
    if (existsSync(flatPath)) return flatPath
  } else {
    const assetPath = join(boundary, 'arsenals', type, name, state === 'draft' ? 'draft.oxn' : 'canonical.oxn')
    if (existsSync(assetPath)) return assetPath
  }

  return null
}

export function listStandards(scope: Scope, projectBoundary: string | undefined, state?: AssetState): StandardAsset[] {
  if (state) {
    return loadArsenalsByState(scope, projectBoundary, state)
  }

  const draft = loadArsenalsByState(scope, projectBoundary, 'draft')
  const canonical = loadArsenalsByState(scope, projectBoundary, 'canonical')
  return [...draft, ...canonical]
}

export interface CompileDependencies {
  parts: Map<string, Record<string, unknown>>
  probes: Map<string, Record<string, unknown>>
}

export function preloadCompileDependencies(projectBoundary: string): CompileDependencies {
  const parts = new Map<string, Record<string, unknown>>()
  const probes = new Map<string, Record<string, unknown>>()

  const { BUILTIN_PROBES, BUILTIN_PARTS } = require('../arsenals/builtin')
  for (const [name, def] of Object.entries(BUILTIN_PROBES)) {
    probes.set(`oxn/${name}`, def as Record<string, unknown>)
  }

  for (const [name, def] of Object.entries(BUILTIN_PARTS)) {
    parts.set(`oxn/${name}`, def as Record<string, unknown>)
  }

  const projectProbes = loadArsenalsByTypeAndState('fallback', projectBoundary, 'probes', 'canonical')
  for (const asset of projectProbes) {
    try {
      const compiledPath = join(projectBoundary, 'cache', 'compiled', 'probes', `${asset.name}.compiled.json`)
      const content = existsSync(compiledPath)
        ? (JSON.parse(readFileSync(compiledPath, 'utf-8')) as Record<string, unknown>)
        : null
      if (!content) continue
      const ref = asset.path.includes('/.openxenon/') ? `project/${asset.name}` : asset.name
      probes.set(ref, content)
      probes.set(`./${asset.name}`, content)
    } catch {
      // skip invalid asset
    }
  }

  const projectParts = loadArsenalsByTypeAndState('fallback', projectBoundary, 'parts', 'canonical')
  for (const asset of projectParts) {
    try {
      const compiledPath = join(projectBoundary, 'cache', 'compiled', 'parts', `${asset.name}.compiled.json`)
      const content = existsSync(compiledPath)
        ? (JSON.parse(readFileSync(compiledPath, 'utf-8')) as Record<string, unknown>)
        : null
      if (!content) continue
      const ref = asset.path.includes('/.openxenon/') ? `project/${asset.name}` : asset.name
      parts.set(ref, content)
      parts.set(`./${asset.name}`, content)
    } catch {
      // skip invalid asset
    }
  }

  return { parts, probes }
}
