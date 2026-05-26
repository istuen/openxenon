import { BUILTIN_PARTS, BUILTIN_PROBES } from './builtin'
import type { AssetState, AssetType } from '../infra/paths'
import type { StandardAsset } from '../infra/loader'

export interface Arsenal {
  get(type: AssetType, name: string): StandardAsset | null
  list(type: AssetType): StandardAsset[]
  create(name: string, content: string): void
  update(name: string, content: string): void
  delete(name: string): void
  rename(oldName: string, newName: string): void
}

export class BuiltinArsenal implements Arsenal {
  get(type: AssetType, name: string): StandardAsset | null {
    if (type === 'parts') {
      const def = (BUILTIN_PARTS as Record<string, unknown>)[name]
      if (!def) return null
      return {
        name,
        type: 'parts' as AssetType,
        state: 'canonical' as AssetState,
        path: `builtin:${name}`,
        content: JSON.stringify(def),
      }
    }
    if (type === 'probes') {
      const def = (BUILTIN_PROBES as Record<string, unknown>)[name]
      if (!def) return null
      return {
        name,
        type: 'probes' as AssetType,
        state: 'canonical' as AssetState,
        path: `builtin:${name}`,
        content: JSON.stringify(def),
      }
    }
    return null
  }

  list(type: AssetType): StandardAsset[] {
    const assets: StandardAsset[] = []
    if (type === 'parts') {
      for (const [name, def] of Object.entries(BUILTIN_PARTS)) {
        assets.push({
          name,
          type: 'parts' as AssetType,
          state: 'canonical' as AssetState,
          path: `builtin:${name}`,
          content: JSON.stringify(def),
        })
      }
    }
    if (type === 'probes') {
      for (const [name, def] of Object.entries(BUILTIN_PROBES)) {
        assets.push({
          name,
          type: 'probes' as AssetType,
          state: 'canonical' as AssetState,
          path: `builtin:${name}`,
          content: JSON.stringify(def),
        })
      }
    }
    return assets
  }

  create(): void {
    throw new Error('Builtin arsenal is read-only')
  }

  update(): void {
    throw new Error('Builtin arsenal is read-only')
  }

  delete(): void {
    throw new Error('Builtin arsenal is read-only')
  }

  rename(): void {
    throw new Error('Builtin arsenal is read-only')
  }
}
