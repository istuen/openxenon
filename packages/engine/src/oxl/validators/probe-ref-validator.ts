import type { ProbeNamespace, ParsedProbeRef } from './probe-namespace'

export type { ProbeNamespace, ParsedProbeRef }

export function parseProbeNamespace(ref: string): ParsedProbeRef | null {
  if (ref.startsWith('oxn/')) {
    return { namespace: 'oxn', probeName: ref.slice(3), raw: ref }
  }
  if (ref.startsWith('@')) {
    const slashIndex = ref.indexOf('/')
    if (slashIndex === -1) return null
    return { namespace: 'scope', scopeName: ref.slice(1, slashIndex), probeName: ref.slice(slashIndex + 1), raw: ref }
  }
  if (ref.startsWith('./') || ref.startsWith('project/')) {
    const probeName = ref.startsWith('./') ? ref.slice(2) : ref.slice(8)
    return { namespace: 'project', probeName, raw: ref }
  }
  return null
}

export function isValidProbeRef(ref: string): boolean {
  return parseProbeNamespace(ref) !== null
}

export function isBareProbeRef(ref: string): boolean {
  return parseProbeNamespace(ref) === null
}

export function validateProbeRef(ref: string): void {
  if (isBareProbeRef(ref)) {
    throw new Error(`Probe ref "${ref}" missing namespace prefix. Must use oxn/, @scope/, or ./ prefix.`)
  }
  if (!isValidProbeRef(ref)) {
    throw new Error(`Probe ref "${ref}" has invalid format`)
  }
}
