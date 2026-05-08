import { readdirSync, readFileSync, existsSync, renameSync, mkdirSync } from 'fs'
import { join, extname, dirname, basename } from 'path'
import { type AssetState, type AssetType } from './paths'
import { getProjectBoundaryPath } from '../kernel'
import { ARSENALS_ROOT } from './paths'

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

function scanNewStructure(type: AssetType, state: AssetState, scope: Scope = 'fallback'): StandardAsset[] {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const rootPath = scope === 'global' ? ARSENALS_ROOT : projectBoundary
  const typePath = join(rootPath, type)

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
    assets.push(...scanNewStructure(type, state, 'project'))
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
    assets.push(...scanNewStructure(type, state, 'global'))
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

  if (assetPath.endsWith('draft.yaml')) {
    state = 'draft'
  } else if (assetPath.endsWith('canonical.yaml')) {
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
  const isNewFormat = fromPath.endsWith('draft.yaml') || fromPath.endsWith('draft.yml')
  const isOldFormat = fromPath.includes('/draft/') && (fromPath.endsWith('.yaml') || fromPath.endsWith('.yml'))

  if (!isNewFormat && !isOldFormat) {
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

  if (isNewFormat) {
    newPath = fromPath.replace('/draft.yaml', '/canonical.yaml').replace('/draft.yml', '/canonical.yml')
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

export function loadStandardByName(name: string, type: AssetType): StandardAsset | null {
  const projectBoundary = getProjectBoundaryPath(process.cwd())

  const newCanonicalPath = join(projectBoundary, 'arsenals', type, name, 'canonical.yaml')
  if (existsSync(newCanonicalPath)) {
    const content = readFileSync(newCanonicalPath, 'utf-8')
    return { name, type, state: 'canonical', path: newCanonicalPath, content }
  }

  const oldCanonicalPath = join(projectBoundary, 'arsenals', type, 'canonical', `${name}.yaml`)
  if (existsSync(oldCanonicalPath)) {
    const content = readFileSync(oldCanonicalPath, 'utf-8')
    return { name, type, state: 'canonical', path: oldCanonicalPath, content }
  }

  const newDraftPath = join(projectBoundary, 'arsenals', type, name, 'draft.yaml')
  if (existsSync(newDraftPath)) {
    const content = readFileSync(newDraftPath, 'utf-8')
    return { name, type, state: 'draft', path: newDraftPath, content }
  }

  const oldDraftPath = join(projectBoundary, 'arsenals', type, 'draft', `${name}.yaml`)
  if (existsSync(oldDraftPath)) {
    const content = readFileSync(oldDraftPath, 'utf-8')
    return { name, type, state: 'draft', path: oldDraftPath, content }
  }

  return null
}

export function resolveAssetPath(name: string, type: AssetType, state: AssetState): string | null {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const newPath = join(projectBoundary, 'arsenals', type, name, state === 'draft' ? 'draft.yaml' : 'canonical.yaml')
  if (existsSync(newPath)) {
    return newPath
  }
  const oldPath = join(projectBoundary, 'arsenals', type, state, `${name}.yaml`)
  if (existsSync(oldPath)) {
    return oldPath
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
