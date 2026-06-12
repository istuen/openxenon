import { parseProbeNamespace } from '../validators/probe-namespace'

export function getNamespaceFromRef(ref: string): 'oxn' | 'scope' | 'project' | null {
  const parsed = parseProbeNamespace(ref)
  return parsed ? parsed.namespace : null
}

export function getScopeNameFromRef(ref: string): string | null {
  const parsed = parseProbeNamespace(ref)
  return parsed?.scopeName ?? null
}

export function getPartNameFromRef(ref: string): string | null {
  const parsed = parseProbeNamespace(ref)
  return parsed?.probeName ?? null
}
