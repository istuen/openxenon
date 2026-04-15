import type { ArtifactType } from './core'

export interface Artifact {
  path: string
  type: ArtifactType
  hash: string
}
