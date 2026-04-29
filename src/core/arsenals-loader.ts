import { readdirSync, readFileSync, existsSync, renameSync } from 'fs'
import { join, extname, dirname, basename } from 'path'
import { type AssetState, type AssetType } from './arsenals-paths'
import { getProjectBoundaryPath } from './project'
import { ARSENALS_ROOT } from './arsenals-paths'

export type Scope = 'project' | 'global' | 'fallback'

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

function getProjectArsenalStatePath(type: AssetType, state: AssetState): string {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  return join(projectBoundary, 'arsenals', type, state)
}

function getTypeFromPath(assetPath: string): AssetType | null {
  if (assetPath.includes('/probes/') || assetPath.includes('/probe/')) {
    return 'probes'
  }
  if (assetPath.includes('/proofs/') || assetPath.includes('/proof/')) {
    return 'proofs'
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

function scanArsenalsDirectory(type: AssetType, state: AssetState, scope: Scope = 'fallback'): StandardAsset[] {
  const projectBoundary = getProjectBoundaryPath(process.cwd())

  const stateVariants = [state, state.toUpperCase() as AssetState]

  const typeToSingular: Record<AssetType, string> = {
    probes: 'probe',
    proofs: 'proof',
    stages: 'stage',
    blueprints: 'blueprint'
  }

  function scanProject(type: AssetType, state: AssetState): StandardAsset[] {
    const assets: StandardAsset[] = []
    for (const s of stateVariants) {
      const pluralPath = join(projectBoundary, 'arsenals', type, s)
      if (directoryExists(pluralPath)) assets.push(...scanDirectory(pluralPath, type, state))
      const singularPath = join(projectBoundary, 'arsenals', typeToSingular[type], s)
      if (directoryExists(singularPath)) assets.push(...scanDirectory(singularPath, type, state))
    }
    return assets
  }

  function scanGlobal(type: AssetType, state: AssetState): StandardAsset[] {
    const assets: StandardAsset[] = []
    for (const s of stateVariants) {
      const pluralPath = join(ARSENALS_ROOT, type, s)
      if (directoryExists(pluralPath)) assets.push(...scanDirectory(pluralPath, type, state))
      const singularPath = join(ARSENALS_ROOT, typeToSingular[type], s)
      if (directoryExists(singularPath)) assets.push(...scanDirectory(singularPath, type, state))
    }
    return assets
  }

  let projectAssets: StandardAsset[] = []
  let globalAssets: StandardAsset[] = []

  if (scope === 'project' || scope === 'fallback') {
    projectAssets = scanProject(type, state)
  }
  if (scope === 'global' || (scope === 'fallback' && projectAssets.length === 0)) {
    globalAssets = scanGlobal(type, state)
  }

  const allAssets = [...projectAssets, ...globalAssets]
  const seen = new Set<string>()
  return allAssets.filter(asset => {
    if (seen.has(asset.path)) return false
    seen.add(asset.path)
    return true
  })
}

export function loadArsenalsByState(state: AssetState, scope: Scope = 'fallback'): StandardAsset[] {
  const projectProbes = scanArsenalsDirectory('probes', state, scope)
  const projectProofs = scanArsenalsDirectory('proofs', state, scope)
  const projectStages = scanArsenalsDirectory('stages', state, scope)
  const projectBlueprints = scanArsenalsDirectory('blueprints', state, scope)

  return [...projectProbes, ...projectProofs, ...projectStages, ...projectBlueprints]
}

export function loadArsenalsByTypeAndState(type: AssetType, state: AssetState, scope: Scope = 'fallback'): StandardAsset[] {
  return scanArsenalsDirectory(type, state, scope)
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

  if (assetPath.includes('/draft/')) {
    state = 'draft'
  } else if (assetPath.includes('/canonical/')) {
    state = 'canonical'
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
  if (!existsSync(fromPath)) {
    return null
  }

  const asset = loadStandardByPath(fromPath)
  if (!asset) {
    return null
  }

  if (asset.state !== 'draft') {
    throw new Error(`Asset is not in draft state: ${fromPath}`)
  }

  const newState: AssetState = 'canonical'
  const newPath = fromPath.replace('/draft/', '/canonical/')

  renameSync(fromPath, newPath)

  return {
    ...asset,
    state: newState,
    path: newPath
  }
}

export function loadStandardByName(name: string, type: AssetType): StandardAsset | null {
  const projectPath = join(getProjectBoundaryPath(process.cwd()), 'arsenals', type, 'canonical')
  const projectAsset = loadStandardFromDirectory(projectPath, name)
  if (projectAsset) return projectAsset

  const globalPath = join(ARSENALS_ROOT, type, 'canonical')
  const globalAsset = loadStandardFromDirectory(globalPath, name)
  if (globalAsset) return globalAsset

  return null
}

function loadStandardFromDirectory(dirPath: string, name: string): StandardAsset | null {
  if (!directoryExists(dirPath)) return null

  const files = readdirSync(dirPath)
  for (const file of files) {
    const filePath = join(dirPath, file)
    const ext = extname(file)
    const baseName = file.replace(ext, '')
    if (baseName === name) {
      const content = readFileSync(filePath, 'utf-8')
      const state: AssetState = dirPath.includes('/draft/') ? 'draft' : 'canonical'
      const typeFromPath = getTypeFromPath(filePath)
      return {
        name: baseName,
        type: typeFromPath || 'stages',
        state,
        path: filePath,
        content
      }
    }
  }
  return null
}

export function listStandards(state?: AssetState, scope: Scope = 'fallback'): StandardAsset[] {
  if (state) {
    return loadArsenalsByState(state, scope)
  }

  const draft = loadArsenalsByState('draft', scope)
  const canonical = loadArsenalsByState('canonical', scope)
  return [...draft, ...canonical]
}
