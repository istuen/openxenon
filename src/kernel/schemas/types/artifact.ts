import type { ArtifactType } from '../../enums'

export interface Artifact {
  path: string
  type: ArtifactType
  hash: string
}
