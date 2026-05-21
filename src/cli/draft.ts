import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { randomUUID } from 'crypto'
import { type AssetType, FORGES_ROOT, type Scope } from '../arsenals/paths'
import { ensureForgesDirectories } from '../arsenals/init'
import { getProjectBoundaryPath } from '../kernel'

export interface DraftAssetResult {
  success: boolean
  path?: string
  error?: string
}

function getTypeFromContent(content: string): AssetType | null {
  if (content.includes('probe "') || content.startsWith('probe ')) return 'probes'
  if (content.includes('part "') || content.startsWith('part ')) return 'parts'
  if (content.includes('blueprint "') || content.startsWith('blueprint ')) return 'blueprints'
  if (content.includes('task "') || content.startsWith('task ')) return 'blueprints'
  return null
}

function getForgePath(type: AssetType, name: string, scope: Scope, ext: string = 'oxn'): string {
  if (scope === 'global') {
    if (type === 'parts' || type === 'probes') {
      return join(FORGES_ROOT, type, `${name}.${ext}`)
    }
    return join(FORGES_ROOT, type, name, `draft.${ext}`)
  }
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  if (type === 'parts' || type === 'probes') {
    return join(projectBoundary, 'forges', type, `${name}.${ext}`)
  }
  return join(projectBoundary, 'forges', type, name, `draft.${ext}`)
}

function saveDraftAsset(type: AssetType, name: string | undefined, content: string, scope: Scope = 'project', ext: string = 'oxn'): DraftAssetResult {
  ensureForgesDirectories(scope)

  const assetName = name || 'draft_' + randomUUID().slice(0, 8)
  const filePath = getForgePath(type, assetName, scope, ext)

  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(filePath, content, 'utf-8')

    return {
      success: true,
      path: filePath
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export function createDraftProbe(content: string, name?: string, scope: Scope = 'project', ext: string = 'oxn'): DraftAssetResult {
  return saveDraftAsset('probes', name, content, scope, ext)
}

export function createDraftPart(content: string, name?: string, scope: Scope = 'project', ext: string = 'oxn'): DraftAssetResult {
  return saveDraftAsset('parts', name, content, scope, ext)
}

export function createDraftFromYaml(yamlContent: string, name?: string, scope: Scope = 'project', ext: string = 'oxn'): DraftAssetResult {
  const type = getTypeFromContent(yamlContent)

  if (!type) {
    return { success: false, error: 'Cannot determine asset type from content' }
  }

  switch (type) {
    case 'probes':
      return createDraftProbe(yamlContent, name, scope, ext)
    case 'parts':
      return createDraftPart(yamlContent, name, scope, ext)
    case 'blueprints':
      return saveDraftAsset('blueprints', name, yamlContent, scope, ext)
    default:
      return { success: false, error: 'Unknown asset type' }
  }
}
