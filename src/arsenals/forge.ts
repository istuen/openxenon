import { randomUUID } from 'crypto'
import { dirname, join } from 'path'
import { ensureForgesDirectories } from './init'
import { type AssetType, GLOBAL_FORGES_ROOT, type Scope } from './paths'
import { getProjectBoundaryPath } from '../kernel'
import { fs, ensureDirectory } from '../infra/filesystem'

export interface ForgeAssetOptions {
  type: AssetType
  name?: string
  content: string
  scope?: Scope
  ext?: string
  templateVars?: Record<string, string>
}

export interface ForgeAssetResult {
  success: boolean
  path?: string
  error?: string
}

export function applyTemplateVars(content: string, vars: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

function getForgePath(type: AssetType, name: string, scope: Scope, ext: string = 'oxn'): string {
  if (scope === 'global') {
    if (type === 'parts' || type === 'probes') {
      return join(GLOBAL_FORGES_ROOT, type, `${name}.${ext}`)
    }
    return join(GLOBAL_FORGES_ROOT, type, name, `draft.${ext}`)
  }
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  if (type === 'parts' || type === 'probes') {
    return join(projectBoundary, 'forges', type, `${name}.${ext}`)
  }
  return join(projectBoundary, 'forges', type, name, `draft.${ext}`)
}

export function forgeAsset(options: ForgeAssetOptions): ForgeAssetResult {
  const { type, name, content, scope = 'project', ext = 'oxn', templateVars = {} } = options

  ensureForgesDirectories(scope)

  const assetName = name || `draft_${randomUUID().slice(0, 8)}`
  const targetPath = getForgePath(type, assetName, scope, ext)

  const finalContent =
    templateVars && Object.keys(templateVars).length > 0 ? applyTemplateVars(content, templateVars) : content

  try {
    if (fs.exists(targetPath)) {
      return { success: false, error: `Draft asset already exists: ${targetPath}` }
    }

    const dir = dirname(targetPath)
    if (!fs.exists(dir)) {
      ensureDirectory(dir)
    }

    fs.atomicWrite(targetPath, finalContent)

    return { success: true, path: targetPath }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function createDraftProbe(
  content: string,
  name?: string,
  scope: Scope = 'project',
  ext: string = 'oxn',
): ForgeAssetResult {
  return forgeAsset({ type: 'probes', name, content, scope, ext })
}

export function createDraftPart(
  content: string,
  name?: string,
  scope: Scope = 'project',
  ext: string = 'oxn',
): ForgeAssetResult {
  return forgeAsset({ type: 'parts', name, content, scope, ext })
}

export function createDraftBlueprint(
  content: string,
  name?: string,
  scope: Scope = 'project',
  ext: string = 'oxn',
): ForgeAssetResult {
  return forgeAsset({ type: 'blueprints', name, content, scope, ext })
}

export function createDraftFromContent(
  content: string,
  name?: string,
  scope: Scope = 'project',
  ext: string = 'oxn',
): ForgeAssetResult {
  const type = getTypeFromContent(content)
  if (!type) {
    return { success: false, error: 'Cannot determine asset type from content' }
  }

  return forgeAsset({ type, name, content, scope, ext })
}

function getTypeFromContent(content: string): AssetType | null {
  if (content.includes('probe "') || content.startsWith('probe ')) return 'probes'
  if (content.includes('blueprint "') || content.startsWith('blueprint ')) return 'blueprints'
  if (content.includes('part "') || content.startsWith('part ')) return 'parts'
  if (content.includes('task "') || content.startsWith('task ')) return 'blueprints'
  return null
}
