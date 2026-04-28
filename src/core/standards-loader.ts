import { readdirSync, readFileSync, existsSync, renameSync } from 'fs'
import { join, extname } from 'path'
import { getStandardsStatePath, type AssetState, type AssetType } from './standards-paths'
import { ensureStandardsDirectories } from './standards-init'

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

export function loadStandardsByState(state: AssetState): StandardAsset[] {
  ensureStandardsDirectories()

  const probes = scanDirectory(getStandardsStatePath('probes', state), 'probes', state)
  const proofs = scanDirectory(getStandardsStatePath('proofs', state), 'proofs', state)
  const stages = scanDirectory(getStandardsStatePath('stages', state), 'stages', state)

  return [...probes, ...proofs, ...stages]
}

export function loadStandardsByTypeAndState(type: AssetType, state: AssetState): StandardAsset[] {
  ensureStandardsDirectories()
  return scanDirectory(getStandardsStatePath(type, state), type, state)
}

export function loadStandardByPath(assetPath: string): StandardAsset | null {
  if (!existsSync(assetPath)) {
    return null
  }

  const content = readFileSync(assetPath, 'utf-8')
  const fileName = assetPath.split('/').pop() || ''
  const ext = extname(fileName)
  const name = fileName.replace(ext, '')

  let type: AssetType | null = null
  let state: AssetState | null = null

  if (assetPath.includes('/probes/')) {
    type = 'probes'
  } else if (assetPath.includes('/proofs/')) {
    type = 'proofs'
  } else if (assetPath.includes('/stages/')) {
    type = 'stages'
  }

  if (assetPath.includes('/DRAFT/')) {
    state = 'DRAFT'
  } else if (assetPath.includes('/CANONICAL/')) {
    state = 'CANONICAL'
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

  if (asset.state !== 'DRAFT') {
    throw new Error(`Asset is not in DRAFT state: ${fromPath}`)
  }

  const newState: AssetState = 'CANONICAL'
  const newPath = fromPath.replace('/DRAFT/', '/CANONICAL/')

  renameSync(fromPath, newPath)

  return {
    ...asset,
    state: newState,
    path: newPath
  }
}

export function listStandards(state?: AssetState): StandardAsset[] {
  if (state) {
    return loadStandardsByState(state)
  }

  const draft = loadStandardsByState('DRAFT')
  const canonical = loadStandardsByState('CANONICAL')
  return [...draft, ...canonical]
}