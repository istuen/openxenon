import { existsSync, readdirSync, readFileSync, renameSync, mkdirSync } from 'fs'
import { join, extname, dirname, basename } from 'path'
import { z } from 'zod'
import { type AssetState, type AssetType } from '../arsenals/paths'
import { BUILTIN_PROBES } from '../arsenals/builtin'
import { GLOBAL_ARSENALS_ROOT, resolveArsenalRoot, resolveBoundary, type Scope as InfraScope } from '../infra/paths'

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

function scanDirectory(dirPath: string, type: AssetType, state: AssetState): StandardAsset[] {
  if (!existsSync(dirPath)) {
    return []
  }

  const files = readdirSync(dirPath)
  const assets: StandardAsset[] = []

  for (const file of files) {
    const filePath = join(dirPath, file)
    const ext = extname(file)

    if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
      const content = readFileSync(filePath, 'utf-8')
      assets.push({
        name: file.replace(ext, ''),
        type,
        state,
        path: filePath,
        content
      })
    }
  }

  return assets
}

function scanNewStructure(boundary: string, type: AssetType, state: AssetState): StandardAsset[] {
  const typePath = join(boundary, type)

  if (!existsSync(typePath)) {
    return []
  }

  const assets: StandardAsset[] = []
  const entries = readdirSync(typePath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const assetName = entry.name
    const yamlFile = state === 'draft' ? 'draft.yaml' : 'canonical.yaml'
    const filePath = join(typePath, assetName, yamlFile)

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      assets.push({
        name: assetName,
        type,
        state,
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
  if (assetPath.includes('/stages/') || assetPath.includes('/stage/')) {
    return 'stages'
  }
  if (assetPath.includes('/blueprints/') || assetPath.includes('/blueprint/')) {
    return 'blueprints'
  }
  return null
}

function directoryExists(dirPath: string): boolean {
  const parent = dirname(dirPath)
  const name = basename(dirPath)
  if (!existsSync(parent)) return false
  return readdirSync(parent).includes(name)
}

function scanArsenalsDirectory(scope: Scope, projectBoundary: string | undefined, type: AssetType, state: AssetState): StandardAsset[] {
  const stateVariants = [state, state.toUpperCase() as AssetState]

  const typeToSingular: Record<AssetType, string> = {
    probes: 'probe',
    stages: 'stage',
    blueprints: 'blueprint'
  }

  function scanProjectBoundary(type: AssetType, state: AssetState): StandardAsset[] {
    if (!projectBoundary) return []
    const assets: StandardAsset[] = []
    for (const s of stateVariants) {
      const pluralPath = join(projectBoundary, 'arsenals', type, s)
      if (directoryExists(pluralPath)) assets.push(...scanDirectory(pluralPath, type, state))
      const singularPath = join(projectBoundary, 'arsenals', typeToSingular[type], s)
      if (directoryExists(singularPath)) assets.push(...scanDirectory(singularPath, type, state))
    }
    assets.push(...scanNewStructure(join(projectBoundary, 'arsenals'), type, state))
    return assets
  }

  function scanGlobal(type: AssetType, state: AssetState): StandardAsset[] {
    const assets: StandardAsset[] = []
    for (const s of stateVariants) {
      const pluralPath = join(GLOBAL_ARSENALS_ROOT, type, s)
      if (directoryExists(pluralPath)) assets.push(...scanDirectory(pluralPath, type, state))
      const singularPath = join(GLOBAL_ARSENALS_ROOT, typeToSingular[type], s)
      if (directoryExists(singularPath)) assets.push(...scanDirectory(singularPath, type, state))
    }
    assets.push(...scanNewStructure(GLOBAL_ARSENALS_ROOT, type, state))
    return assets
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

    return assets
  }

  let projectAssets: StandardAsset[] = []
  let globalAssets: StandardAsset[] = []
  let builtinAssets: StandardAsset[] = []

  if (scope === 'project' || scope === 'fallback') {
    projectAssets = scanProjectBoundary(type, state)
  }
  if (scope === 'global' || (scope === 'fallback' && projectAssets.length === 0)) {
    globalAssets = scanGlobal(type, state)
  }
  if (scope === 'builtin' || (scope === 'fallback' && globalAssets.length === 0)) {
    builtinAssets = scanBuiltin(type, state)
  }

  const allAssets = [...projectAssets, ...globalAssets, ...builtinAssets]
  const seen = new Set<string>()
  return allAssets.filter(asset => {
    if (seen.has(asset.path)) return false
    seen.add(asset.path)
    return true
  })
}

export function loadArsenalsByState(scope: Scope, projectBoundary: string | undefined, state: AssetState): StandardAsset[] {
  const projectProbes = scanArsenalsDirectory(scope, projectBoundary, 'probes', state)
  const projectStages = scanArsenalsDirectory(scope, projectBoundary, 'stages', state)
  const projectBlueprints = scanArsenalsDirectory(scope, projectBoundary, 'blueprints', state)

  return [...projectProbes, ...projectStages, ...projectBlueprints]
}

export function loadArsenalsByTypeAndState(scope: Scope, projectBoundary: string | undefined, type: AssetType, state: AssetState): StandardAsset[] {
  return scanArsenalsDirectory(scope, projectBoundary, type, state)
}

export function loadStandardByPath(assetPath: string): StandardAsset | null {
  if (!existsSync(assetPath)) {
    return null
  }

  const content = readFileSync(assetPath, 'utf-8')
  const fileName = assetPath.split('/').pop() || ''
  const ext = extname(fileName)
  const name = fileName.replace(ext, '')

  const type = getTypeFromPath(assetPath)
  let state: AssetState | null = null

  if (assetPath.endsWith('draft.yaml')) {
    state = 'draft'
    if (assetPath.includes('/forges/') || assetPath.includes('/arsenals/')) {
      const parts = assetPath.split('/')
      const draftIndex = parts.indexOf('draft.yaml')
      if (draftIndex > 0) {
        const possibleName = parts[draftIndex - 1]
        if (possibleName && possibleName !== 'forges' && possibleName !== 'arsenals' && possibleName !== 'probes' && possibleName !== 'stages' && possibleName !== 'blueprints') {
          return {
            name: possibleName,
            type: type!,
            state: 'draft',
            path: assetPath,
            content
          }
        }
      }
    }
  } else if (assetPath.endsWith('canonical.yaml')) {
    state = 'canonical'
    if (assetPath.includes('/arsenals/')) {
      const parts = assetPath.split('/')
      const canonicalIndex = parts.indexOf('canonical.yaml')
      if (canonicalIndex > 0) {
        const possibleName = parts[canonicalIndex - 1]
        if (possibleName && possibleName !== 'arsenals' && possibleName !== 'probes' && possibleName !== 'stages' && possibleName !== 'blueprints') {
          return {
            name: possibleName,
            type: type!,
            state: 'canonical',
            path: assetPath,
            content
          }
        }
      }
    }
  }

  if (!type || !state) {
    return null
  }

  return {
    name,
    type,
    state,
    path: assetPath,
    content
  }
}

export function promoteStandard(fromPath: string): StandardAsset | null {
  const isForgeFormat = fromPath.includes('/forges/') && fromPath.endsWith('/draft.yaml')
  const isArsenalNewFormat = fromPath.includes('/arsenals/') && fromPath.endsWith('/draft.yaml')
  const isOldFormat = fromPath.includes('/draft/') && (fromPath.endsWith('.yaml') || fromPath.endsWith('.yml'))

  if (!isForgeFormat && !isArsenalNewFormat && !isOldFormat) {
    throw new Error(`Asset is not in draft state: ${fromPath}`)
  }

  if (!existsSync(fromPath)) {
    throw new Error(`draft.yaml not found: ${fromPath}`)
  }

  const asset = loadStandardByPath(fromPath)
  if (!asset) {
    return null
  }

  let newPath: string

  if (isForgeFormat) {
    newPath = fromPath
      .replace('/forges/', '/arsenals/')
      .replace('/draft.yaml', '/canonical.yaml')
  } else if (isArsenalNewFormat) {
    newPath = fromPath.replace('/draft.yaml', '/canonical.yaml')
  } else {
    newPath = fromPath.replace('/draft/', '/canonical/')
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

  const newCanonicalPath = join(boundary, 'arsenals', type, name, 'canonical.yaml')
  if (existsSync(newCanonicalPath)) {
    const content = readFileSync(newCanonicalPath, 'utf-8')
    return { name, type, state: 'canonical', path: newCanonicalPath, content }
  }

  const oldCanonicalPath = join(boundary, 'arsenals', type, 'canonical', `${name}.yaml`)
  if (existsSync(oldCanonicalPath)) {
    const content = readFileSync(oldCanonicalPath, 'utf-8')
    return { name, type, state: 'canonical', path: oldCanonicalPath, content }
  }

  const forgeDraftPath = join(boundary, 'forges', type, name, 'draft.yaml')
  if (existsSync(forgeDraftPath)) {
    const content = readFileSync(forgeDraftPath, 'utf-8')
    return { name, type, state: 'draft', path: forgeDraftPath, content }
  }

  const newDraftPath = join(boundary, 'arsenals', type, name, 'draft.yaml')
  if (existsSync(newDraftPath)) {
    const content = readFileSync(newDraftPath, 'utf-8')
    return { name, type, state: 'draft', path: newDraftPath, content }
  }

  const oldDraftPath = join(boundary, 'arsenals', type, 'draft', `${name}.yaml`)
  if (existsSync(oldDraftPath)) {
    const content = readFileSync(oldDraftPath, 'utf-8')
    return { name, type, state: 'draft', path: oldDraftPath, content }
  }

  return null
}

export function resolveAssetPath(scope: Scope, projectBoundary: string | undefined, name: string, type: AssetType, state: AssetState): string | null {
  const boundary = scope === 'global' ? resolveBoundary(scope) : (projectBoundary ? projectBoundary : resolveBoundary('project'))
  const newPath = join(boundary, 'arsenals', type, name, state === 'draft' ? 'draft.yaml' : 'canonical.yaml')
  if (existsSync(newPath)) {
    return newPath
  }
  const oldPath = join(boundary, 'arsenals', type, state, `${name}.yaml`)
  if (existsSync(oldPath)) {
    return oldPath
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