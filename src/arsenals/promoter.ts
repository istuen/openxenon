import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { StandardAsset } from '../infra/loader'
import { loadStandardByPath } from '../infra/loader'

export function promoteToCanonical(fromPath: string): StandardAsset | null {
  const isForgeFormat = fromPath.includes('/forges/')
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

  const content = readFileSync(fromPath, 'utf-8')
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
  if (!existsSync(subDir)) {
    mkdirSync(subDir, { recursive: true })
  }

  const destPath = join(subDir, canonicalName)
  writeFileSync(destPath, content, 'utf-8')

  try {
    if (existsSync(fromPath)) {
      unlinkSync(fromPath)
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
