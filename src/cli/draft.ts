import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { randomUUID } from 'crypto'
import * as yaml from 'yaml'
import { validateProbeDefinition, validatePartAsset } from '../kernel/schemas'
import { type AssetType, FORGES_ROOT, type Scope } from '../arsenals/paths'
import { ensureForgesDirectories } from '../arsenals/init'
import { getProjectBoundaryPath } from '../kernel'

export interface DraftAssetResult {
  success: boolean
  path?: string
  error?: string
}

function getTypeFromContent(content: string): AssetType | null {
  const trimmed = content.trim()
  try {
    const parsed = JSON.parse(content)
    if (parsed.type === 'fs_exists' || parsed.type === 'fs_match' || parsed.type === 'shell_exec') return 'probes'
    if (parsed.probes && Array.isArray(parsed.probes)) return 'parts'
    if (parsed.stages && Array.isArray(parsed.stages)) return 'blueprints'
    if (parsed.target || parsed.spec) return 'parts'
  } catch {
    if (trimmed.startsWith('name:') && trimmed.includes('stages:')) return 'blueprints'
    if (content.includes('type:') && (content.includes('fs_exists') || content.includes('fs_match') || content.includes('shell_exec'))) return 'probes'
    if (content.includes('probes:') || content.includes('target:')) return 'parts'
  }
  return null
}

function getForgePath(type: AssetType, name: string, scope: Scope): string {
  if (scope === 'global') {
    if (type === 'parts' || type === 'probes') {
      return join(FORGES_ROOT, type, `${name}.yaml`)
    }
    return join(FORGES_ROOT, type, name, 'draft.yaml')
  }
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  if (type === 'parts' || type === 'probes') {
    return join(projectBoundary, 'forges', type, `${name}.yaml`)
  }
  return join(projectBoundary, 'forges', type, name, 'draft.yaml')
}

function saveDraftAsset(type: AssetType, name: string | undefined, content: string, scope: Scope = 'project'): DraftAssetResult {
  ensureForgesDirectories(scope)

  const assetName = name || 'draft_' + randomUUID().slice(0, 8)
  const filePath = getForgePath(type, assetName, scope)

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

export function createDraftPart(content: string, name?: string, scope: Scope = 'project'): DraftAssetResult {
  try {
    const parsed = JSON.parse(content)
    validatePartAsset(parsed)
  } catch {
    return { success: false, error: 'Invalid part structure' }
  }

  return saveDraftAsset('parts', name, content, scope)
}

export function createDraftFromYaml(yamlContent: string, name?: string, scope: Scope = 'project'): DraftAssetResult {
  const type = getTypeFromContent(yamlContent)

  if (!type) {
    return { success: false, error: 'Cannot determine asset type from content' }
  }

  switch (type) {
    case 'probes':
      return createDraftProbe(yamlContent, name, scope)
    case 'parts':
      return createDraftPart(yamlContent, name, scope)
    case 'blueprints':
      return saveDraftAsset('blueprints', name, yamlContent, scope)
    default:
      return { success: false, error: 'Unknown asset type' }
  }
}
