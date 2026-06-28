import type { PartDefinition } from '../schemas/validators/part-asset'

export interface PartPort {
  fetchPartDefinition(logicalRef: string): Promise<PartDefinition | null>
}
