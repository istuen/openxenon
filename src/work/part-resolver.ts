import type { PartDefinition } from '../kernel/schemas/validators/part-asset'
import type { PartPort } from '../kernel/contracts/part-port'
import { createArsenalPartPort } from '../arsenals/part-port'

export interface PartResolution {
  found: boolean
  part?: PartDefinition
  namespace: 'oxn' | 'scope' | 'project'
  scopeName?: string
  originalPath?: string
  rawRef: string
}

export function resolveBuiltinPart(name: string): PartDefinition | null {
  const { BUILTIN_PARTS } = require('../arsenals/builtin')
  const def = BUILTIN_PARTS[name]
  if (!def) return null
  return {
    id: def.id || name,
    name: def.name || name,
    _version: def._version ?? 1,
    description: def.description || '',
    props: def.props,
    target: def.target,
    spec: def.spec,
    action: def.action,
    probes: def.probes as PartDefinition['probes'],
    deps: def.deps,
  }
}

export function createWorkPartPort(): PartPort {
  return createArsenalPartPort()
}
