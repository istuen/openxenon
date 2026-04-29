import { readdirSync, readFileSync, existsSync, renameSync } from 'fs'
import { join, extname } from 'path'
import { type AssetState, type AssetType } from './arsenals-paths'
import { getProjectBoundaryPath } from './project'

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
  return null
}

function scanArsenalsDirectory(type: AssetType, state: AssetState): StandardAsset[] {
  const projectBoundary = getProjectBoundaryPath(process.cwd())

  const pluralPath = join(projectBoundary, 'arsenals', type, state)
  const pluralAssets = existsSync(pluralPath) ? scanDirectory(pluralPath, type, state) : []

  const typeToSingular: Record<AssetType, string> = {
    probes: 'probe',
    proofs: 'proof',
    stages: 'stage'
  }
  const singularPath = join(projectBoundary, 'arsenals', typeToSingular[type], state)
  const singularAssets = existsSync(singularPath) ? scanDirectory(singularPath, type, state) : []

  return [...pluralAssets, ...singularAssets]
}

export function loadArsenalsByState(state: AssetState): StandardAsset[] {
  const projectProbes = scanArsenalsDirectory('probes', state)
  const projectProofs = scanArsenalsDirectory('proofs', state)
  const projectStages = scanArsenalsDirectory('stages', state)

  return [...projectProbes, ...projectProofs, ...projectStages]
}

export function loadArsenalsByTypeAndState(type: AssetType, state: AssetState): StandardAsset[] {
  return scanArsenalsDirectory(type, state)
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

export function listStandards(state?: AssetState): StandardAsset[] {
  if (state) {
    return loadArsenalsByState(state)
  }

  const draft = loadArsenalsByState('draft')
  const canonical = loadArsenalsByState('canonical')
  return [...draft, ...canonical]
}
