import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { randomUUID } from 'crypto'
import * as yaml from 'yaml'
import { validateProbeDefinition, validateStageDefinition } from '../kernel/schemas'
import { type AssetType, ARSENALS_ROOT } from '../arsenals/paths'
import { ensureArsenalsDirectories } from '../arsenals/init'
import type { Scope } from '../arsenals/loader'
import { getProjectBoundaryPath } from '../kernel'

export interface DraftAssetResult {
  success: boolean
  path?: string
  error?: string
}

function getTypeFromContent(content: string): AssetType | null {
  try {
    const parsed = JSON.parse(content)
    if (parsed.type === 'fs_exists' || parsed.type === 'fs_match' || parsed.type === 'shell_exec') return 'probes'
    if (parsed.probes && Array.isArray(parsed.probes)) return 'stages'
    if (parsed.target || parsed.spec) return 'stages'
  } catch {
    if (content.includes('type:') && (content.includes('fs_exists') || content.includes('fs_match') || content.includes('shell_exec'))) return 'probes'
    if (content.includes('probes:') || content.includes('target:')) return 'stages'
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
  let parsed: unknown

  try {
    parsed = JSON.parse(content)
  } catch {
    try {
      parsed = yaml.parse(content)
    } catch {
      return { success: false, error: 'Invalid probe structure' }
    }
  }

  try {
    validateProbeDefinition(parsed)
  } catch {
    return { success: false, error: 'Invalid probe structure' }
  }

  return saveDraftAsset('probes', name, content, scope)
}

export function createDraftStage(content: string, name?: string, scope: Scope = 'project'): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validateStageDefinition(parsed)
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
    case 'stages':
      return createDraftStage(yamlContent, name, scope)
    default:
      return { success: false, error: 'Unknown asset type' }
  }
}
