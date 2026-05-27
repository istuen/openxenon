import { dirname, join } from 'path'
import type { StandardAsset } from '../infra/loader'
import { loadStandardByPath } from '../infra/loader'
import { fs, ensureDirectory, deleteFile } from '../infra/filesystem'

export function promoteToCanonical(fromPath: string): StandardAsset | null {
  const isForgeFormat = fromPath.includes('/forges/')
  const isArsenalDraftFormat = fromPath.includes('/arsenals/') && fromPath.includes('/draft/')

  if (!isForgeFormat && !isArsenalDraftFormat) {
    throw new Error(`Asset is not in draft state: ${fromPath}`)
  }

  if (!fs.exists(fromPath)) {
    throw new Error(`Draft file not found: ${fromPath}`)
  }

  const asset = loadStandardByPath(fromPath)
  if (!asset) {
    return null
  }

  const content = fs.read(fromPath)
  if (content === null) {
    throw new Error(`Failed to read draft file: ${fromPath}`)
  }

  const ext = fromPath.endsWith('.oxn') ? '.oxn' : '.oxn'
  const canonicalName = `canonical${ext}`

  let newDir: string
  if (isForgeFormat) {
    newDir = fromPath.replace('/forges/', '/arsenals/')
  } else {
    newDir = fromPath.replace('/draft/', '/')
  }

  const parentDir = dirname(newDir)
  const assetName = asset.name || newDir.replace(/\/$/, '').split('/').pop() || 'unknown'

  const subDir = join(parentDir, assetName)
  if (!fs.exists(subDir)) {
    ensureDirectory(subDir)
  }

  const destPath = join(subDir, canonicalName)
  fs.atomicWrite(destPath, content)

  try {
    if (fs.exists(fromPath)) {
      deleteFile(fromPath)
    }
  } catch {
    // best-effort cleanup
  }

  return {
    ...asset,
    state: 'canonical',
    path: destPath,
  }
}
