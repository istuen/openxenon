import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { validateProbe, validateProof, validateStage } from '../arsenals/standards'
import { type AssetType, ARSENALS_ROOT } from '../arsenals/paths'
import { ensureArsenalsDirectories } from '../arsenals/init'
import type { Scope } from '../arsenals/loader'

export interface DraftAssetResult {
  success: boolean
  path?: string
  error?: string
}

function getTypeFromContent(content: string): AssetType | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed.type === 'probe' || parsed.probe) return 'probes'
    if (parsed.proofs || parsed.probeRefs) return 'proofs'
    if (parsed.proof || parsed.deps) return 'stages'
  } catch {
    if (content.includes('type:') && content.includes('fs_exists')) return 'probes'
    if (content.includes('proofRefs:') || content.includes('proofs:')) return 'proofs'
    if (content.includes('proof:') || content.includes('deps:')) return 'stages'
  }
  return null
}

function getNewStructurePath(type: AssetType, name: string, state: string, scope: Scope = 'project'): string {
  if (scope === 'global') {
    return join(ARSENALS_ROOT, type, name, state === 'draft' ? 'draft.yaml' : 'canonical.yaml')
  }
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  return join(projectBoundary, 'arsenals', type, name, state === 'draft' ? 'draft.yaml' : 'canonical.yaml')
}

function saveDraftAsset(type: AssetType, name: string | undefined, content: string, scope: Scope = 'project'): DraftAssetResult {
  ensureArsenalsDirectories()

  const assetName = name || 'draft_' + randomUUID().slice(0, 8)
  const filePath = getNewStructurePath(type, assetName, 'draft', scope)

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

export function createDraftProbe(content: string, name?: string, scope: Scope = 'project'): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validateProbe(parsed)
  } catch {
    return { success: false, error: 'Invalid probe structure' }
  }

  return saveDraftAsset('probes', name, content, scope)
}

export function createDraftProof(content: string, name?: string, scope: Scope = 'project'): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validateProof(parsed)
  } catch {
    return { success: false, error: 'Invalid proof structure' }
  }

  return saveDraftAsset('proofs', name, content, scope)
}

export function createDraftStage(content: string, name?: string, scope: Scope = 'project'): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validateStage(parsed)
  } catch {
    return { success: false, error: 'Invalid stage structure' }
  }

  return saveDraftAsset('stages', name, content, scope)
}

export function createDraftFromYaml(yamlContent: string, name?: string, scope: Scope = 'project'): DraftAssetResult {
  const type = getTypeFromContent(yamlContent)

  if (!type) {
    return { success: false, error: 'Cannot determine asset type from content' }
  }

  switch (type) {
    case 'probes':
      return createDraftProbe(yamlContent, name, scope)
    case 'proofs':
      return createDraftProof(yamlContent, name, scope)
    case 'stages':
      return createDraftStage(yamlContent, name, scope)
    default:
      return { success: false, error: 'Unknown asset type' }
  }
}
