import { createDraftFromContent } from '../arsenals/forge'
import type { Scope } from '../arsenals/paths'

export interface DraftAssetResult {
  success: boolean
  path?: string
  error?: string
}

export function createDraftProbe(
  content: string,
  name?: string,
  scope: Scope = 'project',
  ext: string = 'oxn',
): DraftAssetResult {
  return createDraftFromContent(content, name, scope, ext)
}

export function createDraftPart(
  content: string,
  name?: string,
  scope: Scope = 'project',
  ext: string = 'oxn',
): DraftAssetResult {
  return createDraftFromContent(content, name, scope, ext)
}

export function createDraftFromYaml(
  yamlContent: string,
  name?: string,
  scope: Scope = 'project',
  ext: string = 'oxn',
): DraftAssetResult {
  return createDraftFromContent(yamlContent, name, scope, ext)
}
