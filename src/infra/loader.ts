import { existsSync, readdirSync, readFileSync, renameSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { type AssetState, type AssetType } from '../arsenals/paths'
import { BUILTIN_PROBES, BUILTIN_PARTS } from '../arsenals/builtin'
import { GLOBAL_ARSENALS_ROOT, GLOBAL_FORGES_ROOT, resolveBoundary, type Scope as InfraScope } from '../infra/paths'

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

function scanFlatStructure(boundary: string, type: AssetType, scanForges: boolean = false): StandardAsset[] {
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
        const draftFile = join(typePath, assetName, 'draft.yaml')
        if (existsSync(draftFile)) {
          const content = readFileSync(draftFile, 'utf-8')
          assets.push({
            name: assetName,
            type,
            state: 'draft',
            path: draftFile,
            content
          })
        }
      } else {
        const canonicalFile = join(typePath, assetName, 'canonical.yaml')
        if (existsSync(canonicalFile)) {
          const content = readFileSync(canonicalFile, 'utf-8')
          assets.push({
            name: assetName,
            type,
            state: 'canonical',
            path: canonicalFile,
            content
          })
        }
      }
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml') || entry.name.endsWith('.json')) {
      const name = entry.name.replace(/\.(yaml|yml|json)$/, '')
      const filePath = join(typePath, entry.name)
      const content = readFileSync(filePath, 'utf-8')
      const isCanonical = scanForges ? false : true
      assets.push({
        name,
        type,
        state: isCanonical ? 'canonical' : 'draft',
        path: filePath,
        content
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

  function scanBuiltin(type: AssetType, state: AssetState): StandardAsset[] {
    if (state !== 'canonical') return []

    const assets: StandardAsset[] = []

    if (type === 'probes') {
      for (const [name, def] of Object.entries(BUILTIN_PROBES)) {
        assets.push({
          name,
          type: 'probes' as AssetType,
          state: 'canonical' as AssetState,
          path: `builtin:${name}`,
          content: JSON.stringify(def)
        })
      }
    }

    if (type === 'parts') {
      for (const [name, def] of Object.entries(BUILTIN_PARTS)) {
        assets.push({
          name,
          type: 'parts' as AssetType,
          state: 'canonical' as AssetState,
          path: `builtin:${name}`,
          content: JSON.stringify(def)
        })
      }
    }

    return assets
  }

  let projectAssets: StandardAsset[] = []
  let globalAssets: StandardAsset[] = []
  let builtinAssets: StandardAsset[] = []

  if (scope === 'project' || scope === 'fallback') {
    projectAssets = scanProjectBoundary(type)
  }
  if (scope === 'global' || (scope === 'fallback' && projectAssets.length === 0)) {
    globalAssets = scanGlobal(type)
  }
  if (scope === 'builtin' || (scope === 'fallback' && globalAssets.length === 0)) {
    builtinAssets = scanBuiltin(type, 'canonical')
  }

  const allAssets = [...projectAssets, ...globalAssets, ...builtinAssets]
  const seen = new Set<string>()
  return allAssets.filter(asset => {
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

export function loadArsenalsByState(scope: Scope, projectBoundary: string | undefined, state: AssetState): StandardAsset[] {
  if (state === 'draft') {
    return []
  }
  const projectProbes = scanArsenalsDirectory(scope, projectBoundary, 'probes')
  const projectBlueprints = scanArsenalsDirectory(scope, projectBoundary, 'blueprints')
  const projectParts = scanArsenalsDirectory(scope, projectBoundary, 'parts')

  return [...projectProbes, ...projectBlueprints, ...projectParts]
}

export function loadArsenalsByTypeAndState(scope: Scope, projectBoundary: string | undefined, type: AssetType, state: AssetState): StandardAsset[] {
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
  const typeIndex = parts.findIndex(p => p === 'forges' || p === 'arsenals')
  if (typeIndex === -1) return null

  const nameIndex = typeIndex + 2
  if (nameIndex >= parts.length) return null

  const name = parts[nameIndex]
  if (!name || name === 'probes' || name === 'blueprints' || name === 'parts') {
    return null
  }

  const isDraft = isForge || assetPath.endsWith('/draft.yaml')
  const state: AssetState = isDraft ? 'draft' : 'canonical'

  return {
    name,
    type,
    state,
    path: assetPath,
    content
  }
}

export function promoteStandard(fromPath: string): StandardAsset | null {
  const isForgeFormat = fromPath.includes('/forges/') && fromPath.endsWith('.yaml')
  const isArsenalDraftFormat = fromPath.includes('/arsenals/') && fromPath.includes('/draft/')

  if (!isForgeFormat && !isArsenalDraftFormat) {
    throw new Error(`Asset is not in draft state: ${fromPath}`)
  }

  if (!existsSync(fromPath)) {
    throw new Error(`Draft file not found: ${fromPath}`)
  }

  const asset = loadStandardByPath(fromPath)
  if (!asset) {
    return null
  }

  let newPath: string

  if (isForgeFormat) {
    newPath = fromPath.replace('/forges/', '/arsenals/')
  } else {
    newPath = fromPath.replace('/draft/', '/')
  }

  const assetDir = dirname(newPath)
  if (!existsSync(assetDir)) {
    mkdirSync(assetDir, { recursive: true })
  }

  renameSync(fromPath, newPath)

  return {
    ...asset,
    state: 'canonical',
    path: newPath
  }
}

export function loadStandardByName(scope: Scope, projectBoundary: string | undefined, name: string, type: AssetType): StandardAsset | null {
  const boundary = scope === 'global' ? resolveBoundary(scope) : (projectBoundary ? projectBoundary : resolveBoundary('project'))

  if (type === 'parts' || type === 'probes') {
    const flatPath = join(boundary, 'arsenals', type, `${name}.yaml`)
    if (existsSync(flatPath)) {
      const content = readFileSync(flatPath, 'utf-8')
      return { name, type, state: 'canonical' as const, path: flatPath, content }
    }
  } else {
    const canonicalPath = join(boundary, 'arsenals', type, name, 'canonical.yaml')
    if (existsSync(canonicalPath)) {
      const content = readFileSync(canonicalPath, 'utf-8')
      return { name, type, state: 'canonical' as const, path: canonicalPath, content }
    }
  }

  const forgeDraftPath = join(boundary, 'forges', type, name, 'draft.yaml')
  if (existsSync(forgeDraftPath)) {
    const content = readFileSync(forgeDraftPath, 'utf-8')
    return { name, type, state: 'draft' as const, path: forgeDraftPath, content }
  }

  return null
}

export function resolveAssetPath(scope: Scope, projectBoundary: string | undefined, name: string, type: AssetType, state: AssetState): string | null {
  const boundary = scope === 'global' ? resolveBoundary(scope) : (projectBoundary ? projectBoundary : resolveBoundary('project'))

  if (type === 'parts' || type === 'probes') {
    const flatPath = join(boundary, 'arsenals', type, `${name}.yaml`)
    if (existsSync(flatPath)) return flatPath
  } else {
    const assetPath = join(boundary, 'arsenals', type, name, state === 'draft' ? 'draft.yaml' : 'canonical.yaml')
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

  for (const [name, def] of Object.entries(BUILTIN_PROBES)) {
    probes.set(`oxn/${name}`, def as Record<string, unknown>)
  }

  for (const [name, def] of Object.entries(BUILTIN_PARTS)) {
    parts.set(`oxn/${name}`, def as Record<string, unknown>)
  }

  const projectProbes = loadArsenalsByTypeAndState('fallback', projectBoundary, 'probes', 'canonical')
  for (const asset of projectProbes) {
    try {
      const content = parseYaml(asset.content) as Record<string, unknown>
      const ref = asset.path.includes('/.openxenon/') ? `project/${asset.name}` : asset.name
      probes.set(ref, content)
      probes.set(`./${asset.name}`, content)
    } catch {
      // skip invalid YAML
    }
  }

  const projectParts = loadArsenalsByTypeAndState('fallback', projectBoundary, 'parts', 'canonical')
  for (const asset of projectParts) {
    try {
      const content = parseYaml(asset.content) as Record<string, unknown>
      const ref = asset.path.includes('/.openxenon/') ? `project/${asset.name}` : asset.name
      parts.set(ref, content)
      parts.set(`./${asset.name}`, content)
    } catch {
      // skip invalid YAML
    }
  }

  return { parts, probes }
}

export function listStandards(scope: Scope, projectBoundary: string | undefined, state?: AssetState): StandardAsset[] {
  if (state) {
    return loadArsenalsByState(scope, projectBoundary, state)
  }

  const draft = loadArsenalsByState(scope, projectBoundary, 'draft')
  const canonical = loadArsenalsByState(scope, projectBoundary, 'canonical')
  return [...draft, ...canonical]
}