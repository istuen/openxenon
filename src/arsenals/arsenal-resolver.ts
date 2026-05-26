import type { AssetType } from '../infra/paths'
import type { StandardAsset } from '../infra/loader'
import type { Arsenal } from './builtin-arsenal'

export class ArsenalResolver {
  constructor(private scopes: Arsenal[]) {}

  resolve(type: AssetType, name: string): StandardAsset | null {
    for (const scope of this.scopes) {
      const asset = scope.get(type, name)
      if (asset) return asset
    }
    return null
  }
}
