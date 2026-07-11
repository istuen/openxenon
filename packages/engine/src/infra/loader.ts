import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from './filesystem'
import { join } from 'path'
import { z } from 'zod'
import type { AssetState, AssetType } from '@openxenon/engine/infra/paths'
import { GLOBAL_ARSENAL_ROOT } from '@openxenon/engine/infra/paths'
import { resolveBoundary } from '@openxenon/engine/infra/paths'
import type { Scope as InfraScope } from '@openxenon/engine/infra/paths'

export type { ProbeNamespace, ParsedProbeRef } from '@openxenon/engine/oxl/validators/probe-namespace'

export const ProbeTypeSchema = z.enum([
  'fs_exists',
  'fs_not_exists',
  'fs_match',
  'fs_parseable',
  'test_pass',
  'deps_resolved',
  'ts_compiles',
  'lint_check',
  'http_responds',
  'file_exports',
  'shell_exec',
])

export type Scope = InfraScope | 'fallback' | 'builtin'

export interface StandardAsset {
  name: string
  type: AssetType
  state: AssetState
  path: string
  content: string
}

/**
 * 尝试读取文件，优先 .md，fallback .oxn
 */
function tryReadAssetFile(dir: string, name: string, subPath?: string): { content: string; path: string } | null {
  const base = subPath ? join(dir, subPath) : dir
  const mdPath = join(base, `${name}.md`)
  if (existsSync(mdPath)) {
    return { content: readFileSync(mdPath, 'utf-8'), path: mdPath }
  }
  const oxnPath = join(base, `${name}.oxn`)
  if (existsSync(oxnPath)) {
    return { content: readFileSync(oxnPath, 'utf-8'), path: oxnPath }
  }
  return null
}

export function scanArsenalStructure(
  boundary: string,
  type: AssetType,
  stateFilter?: 'draft' | 'canonical' | 'both',
): StandardAsset[] {
  const typePath = join(boundary, type)

  if (!existsSync(typePath)) {
    return []
  }

  const assets: StandardAsset[] = []
  const entries = readdirSync(typePath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const assetName = entry.name

      if (assetName === 'drafts') {
        const draftsPath = join(typePath, 'drafts')
        if (existsSync(draftsPath) && (stateFilter === 'draft' || stateFilter === 'both' || !stateFilter)) {
          const draftEntries = readdirSync(draftsPath, { withFileTypes: true })
          for (const draftEntry of draftEntries) {
            if (draftEntry.isDirectory()) {
              // Try draft.md first, fallback draft.oxn
              const result = tryReadAssetFile(draftsPath, 'draft', draftEntry.name)
              if (result) {
                assets.push({
                  name: draftEntry.name,
                  type,
                  state: 'draft',
                  path: result.path,
                  content: result.content,
                })
              }
            } else if (draftEntry.name.endsWith('.md') || draftEntry.name.endsWith('.oxn')) {
              const name = draftEntry.name.replace(/\.(md|oxn)$/, '')
              const filePath = join(draftsPath, draftEntry.name)
              const content = readFileSync(filePath, 'utf-8')
              assets.push({
                name,
                type,
                state: 'draft',
                path: filePath,
                content,
              })
            }
          }
        }
      } else if (stateFilter === 'canonical' || stateFilter === 'both' || !stateFilter) {
        // Try canonical.md first, fallback canonical.oxn
        const result = tryReadAssetFile(typePath, 'canonical', assetName)
        if (result) {
          assets.push({
            name: assetName,
            type,
            state: 'canonical',
            path: result.path,
            content: result.content,
          })
        }
      }
    } else if (
      entry.name.endsWith('.yaml') ||
      entry.name.endsWith('.yml') ||
      entry.name.endsWith('.json') ||
      entry.name.endsWith('.md') ||
      entry.name.endsWith('.oxn')
    ) {
      const name = entry.name.replace(/\.(yaml|yml|json|md|oxn)$/, '')
      const filePath = join(typePath, entry.name)
      const content = readFileSync(filePath, 'utf-8')
      assets.push({
        name,
        type,
        state: 'canonical',
        path: filePath,
        content,
      })
    }
  }

  return assets
}

function getTypeFromPath(assetPath: string): AssetType | null {
  if (assetPath.includes('/probes/') || assetPath.includes('/probe/')) {
    return 'probes'
  }
  if (assetPath.includes('/blueprints/') || assetPath.includes('/blueprint/')) {
    return 'blueprints'
  }
  if (assetPath.includes('/parts/') || assetPath.includes('/part/')) {
    return 'parts'
  }
  return null
}

function scanArsenalsDirectory(
  scope: Scope,
  projectBoundary: string | undefined,
  type: AssetType,
  stateFilter?: 'draft' | 'canonical' | 'both',
): StandardAsset[] {
  function scanProjectBoundary(type: AssetType): StandardAsset[] {
    if (!projectBoundary) return []
    return scanArsenalStructure(join(projectBoundary, 'arsenal'), type, stateFilter)
  }

  function scanGlobal(type: AssetType): StandardAsset[] {
    return scanArsenalStructure(GLOBAL_ARSENAL_ROOT, type, stateFilter) // TODO(v1.1-path): 重复定义于 oxn-workspace-manager.ts
  }

  let projectAssets: StandardAsset[] = []
  let globalAssets: StandardAsset[] = []

  if (scope === 'project' || scope === 'fallback') {
    projectAssets = scanProjectBoundary(type)
  }
  if (scope === 'global' || (scope === 'fallback' && projectAssets.length === 0)) {
    globalAssets = scanGlobal(type)
  }

  const allAssets = [...projectAssets, ...globalAssets]
  const seen = new Set<string>()
  return allAssets.filter((asset) => {
    if (seen.has(asset.path)) return false
    seen.add(asset.path)
    return true
  })
}

export function loadArsenalsByState(
  scope: Scope,
  projectBoundary: string | undefined,
  state: AssetState,
): StandardAsset[] {
  return scanArsenalsDirectory(scope, projectBoundary, 'probes', state)
    .concat(scanArsenalsDirectory(scope, projectBoundary, 'blueprints', state))
    .concat(scanArsenalsDirectory(scope, projectBoundary, 'parts', state))
}

export function loadArsenalsByTypeAndState(
  scope: Scope,
  projectBoundary: string | undefined,
  type: AssetType,
  state: AssetState,
): StandardAsset[] {
  return scanArsenalsDirectory(scope, projectBoundary, type, state)
}

export function loadStandardByPath(assetPath: string): StandardAsset | null {
  if (!existsSync(assetPath)) {
    return null
  }

  const content = readFileSync(assetPath, 'utf-8')
  const type = getTypeFromPath(assetPath)
  if (!type) {
    return null
  }

  const pathParts = assetPath.split('/')
  if (!pathParts.includes('arsenal')) {
    return null
  }

  const typeIndex = pathParts.indexOf('arsenal')
  const nameIndex = typeIndex + 2
  if (nameIndex >= pathParts.length) return null

  const name = pathParts[nameIndex]
  if (!name || name === 'probes' || name === 'blueprints' || name === 'parts' || name === 'drafts') {
    return null
  }

  const isDraft = pathParts.includes('drafts')
  const state: AssetState = isDraft ? 'draft' : 'canonical'

  return {
    name,
    type,
    state,
    path: assetPath,
    content,
  }
}

export function generateCompiledArtifact(assetPath: string, boundary: string): string | null {
  if (!existsSync(assetPath)) return null

  const content = readFileSync(assetPath, 'utf-8')
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12)
  const type = getTypeFromPath(assetPath)
  if (!type) return null

  const parsed = JSON.parse(content) as Record<string, unknown>
  const compiled = {
    ...parsed,
    _compiled_hash: hash,
    _compiled_at: new Date().toISOString(),
    _source_path: assetPath,
  }

  const cacheDir = join(boundary, 'cache', 'compiled', type)
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true })
  }

  const name =
    assetPath
      .split('/')
      .pop()
      ?.replace(/\.(yaml|oxn|md)$/, '') || 'unknown'
  const compiledPath = join(cacheDir, `${name}.compiled.json`)
  writeFileSync(compiledPath, JSON.stringify(compiled, null, 2), 'utf-8')

  updateCacheManifest(boundary, type, name, hash)

  return compiledPath
}

export function updateCacheManifest(boundary: string, type: string, name: string, hash: string): void {
  const manifestPath = join(boundary, 'cache', 'manifest.json')
  let manifest: Record<string, Record<string, string>> = {}
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch {
      /* use empty */
    }
  }
  if (!manifest[type]) manifest[type] = {}
  manifest[type][name] = hash
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

export interface LoadStandardOptions {
  state?: 'canonical' | 'draft' | 'both'
}

export function loadStandardByName(
  scope: Scope,
  projectBoundary: string | undefined,
  name: string,
  type: AssetType,
  options?: LoadStandardOptions,
): StandardAsset | null {
  const stateFilter = options?.state || 'canonical'
  const boundary =
    scope === 'global' ? resolveBoundary(scope) : projectBoundary ? projectBoundary : resolveBoundary('project')

  if (type === 'blueprints') {
    if (stateFilter === 'canonical' || stateFilter === 'both') {
      // Try canonical.md first, fallback canonical.oxn
      const result = tryReadAssetFile(join(boundary, 'arsenal', type, name), 'canonical')
      if (result) {
        return { name, type, state: 'canonical' as const, path: result.path, content: result.content }
      }
    }
    if (stateFilter === 'draft' || stateFilter === 'both') {
      // Try draft.md first, fallback draft.oxn
      const result = tryReadAssetFile(join(boundary, 'arsenal', type, 'drafts', name), 'draft')
      if (result) {
        return { name, type, state: 'draft' as const, path: result.path, content: result.content }
      }
    }
  } else {
    if (stateFilter === 'canonical' || stateFilter === 'both') {
      // Try <name>.md first, fallback <name>.oxn
      const result = tryReadAssetFile(join(boundary, 'arsenal', type), name)
      if (result) {
        return { name, type, state: 'canonical' as const, path: result.path, content: result.content }
      }
    }
    if (stateFilter === 'draft' || stateFilter === 'both') {
      // Try drafts/<name>.md first, fallback drafts/<name>.oxn
      const result = tryReadAssetFile(join(boundary, 'arsenal', type, 'drafts'), name)
      if (result) {
        return { name, type, state: 'draft' as const, path: result.path, content: result.content }
      }
    }
  }

  return null
}

export function resolveAssetPath(
  scope: Scope,
  projectBoundary: string | undefined,
  name: string,
  type: AssetType,
  state: AssetState,
): string | null {
  const boundary =
    scope === 'global' ? resolveBoundary(scope) : projectBoundary ? projectBoundary : resolveBoundary('project')

  if (type === 'blueprints') {
    const baseDir = join(boundary, 'arsenal', type, name)
    const fileName = state === 'draft' ? 'draft' : 'canonical'
    // Try .md first, fallback .oxn
    const mdPath = join(baseDir, `${fileName}.md`)
    if (existsSync(mdPath)) return mdPath
    const oxnPath = join(baseDir, `${fileName}.oxn`)
    if (existsSync(oxnPath)) return oxnPath
  } else {
    if (state === 'draft') {
      // Try drafts/<name>.md first, fallback drafts/<name>.oxn
      const draftsDir = join(boundary, 'arsenal', type, 'drafts')
      const subDirPath = join(draftsDir, name, 'draft.md')
      if (existsSync(subDirPath)) return subDirPath
      const subDirOxnPath = join(draftsDir, name, 'draft.oxn')
      if (existsSync(subDirOxnPath)) return subDirOxnPath
      const flatPath = join(draftsDir, `${name}.md`)
      if (existsSync(flatPath)) return flatPath
      const flatOxnPath = join(draftsDir, `${name}.oxn`)
      if (existsSync(flatOxnPath)) return flatOxnPath
    } else {
      // Try <name>.md first, fallback <name>.oxn
      const assetDir = join(boundary, 'arsenal', type)
      const mdPath = join(assetDir, `${name}.md`)
      if (existsSync(mdPath)) return mdPath
      const oxnPath = join(assetDir, `${name}.oxn`)
      if (existsSync(oxnPath)) return oxnPath
    }
  }

  return null
}

export function listStandards(scope: Scope, projectBoundary: string | undefined, state?: AssetState): StandardAsset[] {
  if (state) {
    return loadArsenalsByState(scope, projectBoundary, state)
  }

  const draft = loadArsenalsByState(scope, projectBoundary, 'draft')
  const canonical = loadArsenalsByState(scope, projectBoundary, 'canonical')
  return [...draft, ...canonical]
}

export interface CompileDependencies {
  parts: Map<string, Record<string, unknown>>
  probes: Map<string, Record<string, unknown>>
}

export function preloadCompileDependencies(
  projectBoundary: string,
  builtinParts: Record<string, unknown>,
  builtinProbes: Record<string, unknown>,
): CompileDependencies {
  const parts = new Map<string, Record<string, unknown>>()
  const probes = new Map<string, Record<string, unknown>>()

  for (const [name, def] of Object.entries(builtinProbes)) {
    probes.set(`oxn/${name}`, def as Record<string, unknown>)
  }

  for (const [name, def] of Object.entries(builtinParts)) {
    parts.set(`oxn/${name}`, def as Record<string, unknown>)
  }

  const projectProbes = loadArsenalsByTypeAndState('fallback', projectBoundary, 'probes', 'canonical')
  for (const asset of projectProbes) {
    try {
      const compiledPath = join(projectBoundary, 'cache', 'compiled', 'probes', `${asset.name}.compiled.json`)
      const content = existsSync(compiledPath)
        ? (JSON.parse(readFileSync(compiledPath, 'utf-8')) as Record<string, unknown>)
        : null
      if (!content) continue
      const ref = asset.path.includes('/.openxenon/') ? `project/${asset.name}` : asset.name
      probes.set(ref, content)
      probes.set(`./${asset.name}`, content)
    } catch {
      // skip invalid asset
    }
  }

  const projectParts = loadArsenalsByTypeAndState('fallback', projectBoundary, 'parts', 'canonical')
  for (const asset of projectParts) {
    try {
      const compiledPath = join(projectBoundary, 'cache', 'compiled', 'parts', `${asset.name}.compiled.json`)
      const content = existsSync(compiledPath)
        ? (JSON.parse(readFileSync(compiledPath, 'utf-8')) as Record<string, unknown>)
        : null
      if (!content) continue
      const ref = asset.path.includes('/.openxenon/') ? `project/${asset.name}` : asset.name
      parts.set(ref, content)
      parts.set(`./${asset.name}`, content)
    } catch {
      // skip invalid asset
    }
  }

  return { parts, probes }
}
