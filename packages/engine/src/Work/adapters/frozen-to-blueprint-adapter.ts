import type { Blueprint, Part, FrozenBlueprint, FrozenPart, FrozenProbe } from '@openxenon/engine/kernel'

export function adaptFrozenToBlueprint(frozen: FrozenBlueprint): Blueprint {
  const parts: Part[] = frozen.parts.map(adaptFrozenPart)

  return {
    id: frozen.id,
    name: frozen.name,
    _version: (frozen as any)._version,
    status: 'CANONICAL',
    parts,
  }
}

export function adaptFrozenPart(frozenPart: FrozenPart): Part {
  const probes = (frozenPart.probes || []).map(adaptFrozenProbe)

  return {
    id: frozenPart.id,
    name: frozenPart.name,
    _version: (frozenPart as any)._version,
    deps: frozenPart.deps || [],
    params: frozenPart.params,
    target: frozenPart.target,
    spec: frozenPart.spec,
    probes,
  }
}

export function adaptFrozenProbe(frozenProbe: FrozenProbe): NonNullable<Part['probes']>[number] {
  const probeParams = frozenProbe.params || {}

  return {
    type: frozenProbe.type || '',
    command: typeof probeParams.command === 'string' ? probeParams.command : undefined,
    pattern: typeof probeParams.pattern === 'string' ? probeParams.pattern : undefined,
    cwd: typeof probeParams.cwd === 'string' ? probeParams.cwd : undefined,
    params: frozenProbe.params,
  } as NonNullable<Part['probes']>[number]
}
