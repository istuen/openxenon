import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { validateProbe, validateProof, validateStage } from '../types/standards'
import { getStandardsStatePath, type AssetType } from '../core/standards-paths'
import { ensureStandardsDirectories } from '../core/standards-init'
import { randomUUID } from 'crypto'

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

function saveDraftAsset(type: AssetType, name: string, content: string): DraftAssetResult {
  ensureStandardsDirectories()

  const draftPath = getStandardsStatePath(type, 'DRAFT')
  const fileName = `${name || 'draft_' + randomUUID().slice(0, 8)}.yaml`
  const filePath = join(draftPath, fileName)

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

export function createDraftProbe(content: string, name?: string): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validateProbe(parsed)
  } catch {
    return { success: false, error: 'Invalid probe structure' }
  }

  return saveDraftAsset('probes', name, content)
}

export function createDraftProof(content: string, name?: string): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validateProof(parsed)
  } catch {
    return { success: false, error: 'Invalid proof structure' }
  }

  return saveDraftAsset('proofs', name, content)
}

export function createDraftStage(content: string, name?: string): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validateStage(parsed)
  } catch {
    return { success: false, error: 'Invalid stage structure' }
  }

  return saveDraftAsset('stages', name, content)
}

export function createDraftFromYaml(yamlContent: string, name?: string): DraftAssetResult {
  const type = getTypeFromContent(yamlContent)

  if (!type) {
    return { success: false, error: 'Cannot determine asset type from content' }
  }

  switch (type) {
    case 'probes':
      return createDraftProbe(yamlContent, name)
    case 'proofs':
      return createDraftProof(yamlContent, name)
    case 'stages':
      return createDraftStage(yamlContent, name)
  }
}