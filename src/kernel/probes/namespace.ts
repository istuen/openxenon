export type ProbeNamespace = 'oxn' | 'scope' | 'project'

export interface ParsedProbeRef {
  namespace: ProbeNamespace
  scopeName?: string
  probeName: string
  raw: string
}

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
