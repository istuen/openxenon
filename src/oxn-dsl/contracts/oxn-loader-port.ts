import type { OxnAssetType, OxnScope } from '../scope/oxn-scope'
import type { OxnLoadResult } from '../loader/oxn-loader'

export interface IOxnAssetLoader {
  load(type: OxnAssetType, scopes?: OxnScope[]): Promise<OxnLoadResult>
}
