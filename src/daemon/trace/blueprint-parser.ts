import type { BlueprintPayload, PartPayload } from '../types/daemon-payload'

export interface ParsedBlueprint {
  id: string
  name: string
  parts: PartPayload[]
}

export function parseBlueprintYaml(yaml: string): ParsedBlueprint {
  const trimmed = yaml.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      return {
        id: parsed.id || '',
        name: parsed.name || '',
        parts: (parsed.parts || []).map((s: any) => ({
          id: s.id || '',
          name: s.name || '',
          deps: s.deps || [],
          target: { description: s.target?.description || '' },
          spec: { description: s.spec?.description || '' },
          probes: (s.probes || []).map((p: any) => ({
            type: p.type || '',
            ...(p.params?.path ? { pattern: p.params.path } : {}),
            ...(p.params?.command ? { command: p.params.command } : {}),
          })),
        })),
      }
    } catch {
      // Fall through to YAML parser
    }
  }

  const lines = yaml.split('\n')
  let id = ''
  let name = ''
  const parts: PartPayload[] = []

  let currentSection: 'root' | 'part' | 'probes' | 'target' | 'spec' | 'probe' = 'root'
  let partIndex = -1
  let probeIndex = -1

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed === 'id:' && currentSection === 'root') {
      continue
    }
    if (trimmed.startsWith('id:') && currentSection === 'root') {
      id = trimmed.slice(3).trim()
      continue
    }

    if (trimmed === 'name:' && currentSection === 'root') {
      continue
    }
    if (trimmed.startsWith('name:') && currentSection === 'root') {
      name = trimmed.slice(5).trim()
      continue
    }

    if (trimmed === 'parts:') {
      currentSection = 'part'
      continue
    }

    if (trimmed.startsWith('- id:') && currentSection === 'part') {
      partIndex++
      probeIndex = -1
      const partId = trimmed.slice(5).trim()
      if (partIndex >= parts.length) {
        parts.push({
          id: partId,
          name: '',
          deps: [],
          target: { description: '' },
          spec: { description: '' },
          probes: [],
        })
      } else {
        parts[partIndex]!.id = partId
        parts[partIndex]!.name = ''
        parts[partIndex]!.deps = []
        parts[partIndex]!.probes = []
      }
      continue
    }

    if (trimmed.startsWith('- id:') && currentSection === 'probes' && partIndex >= 0) {
      partIndex++
      probeIndex = -1
      currentSection = 'part'
      const partId = trimmed.slice(5).trim()
      if (partIndex >= parts.length) {
        parts.push({
          id: partId,
          name: '',
          deps: [],
          target: { description: '' },
          spec: { description: '' },
          probes: [],
        })
      } else {
        parts[partIndex]!.id = partId
        parts[partIndex]!.name = ''
        parts[partIndex]!.deps = []
        parts[partIndex]!.probes = []
      }
      continue
    }

    if (trimmed.startsWith('name:') && currentSection === 'part' && partIndex >= 0) {
      const part = parts[partIndex]
      if (part) part.name = trimmed.slice(5).trim()
      continue
    }

    if (trimmed.startsWith('deps:') && currentSection === 'part' && partIndex >= 0) {
      continue
    }

    if (trimmed.startsWith('- ') && currentSection === 'part' && partIndex >= 0) {
      const dep = trimmed.slice(2).trim()
      const part = parts[partIndex]
      if (part) part.deps.push(dep)
      continue
    }

    if (trimmed === 'target:') {
      currentSection = 'target'
      continue
    }

    if (trimmed === 'spec:') {
      currentSection = 'spec'
      continue
    }

    if (trimmed === 'probes:') {
      currentSection = 'probes'
      probeIndex = -1
      continue
    }

    if (trimmed.startsWith('deps:') && currentSection === 'probes' && partIndex >= 0) {
      currentSection = 'part'
      continue
    }

    if (trimmed.startsWith('- type:') && currentSection === 'probes' && partIndex >= 0) {
      probeIndex++
      const probeType = trimmed.slice(7).trim()
      const part = parts[partIndex]
      if (!part) continue
      const probes = part.probes
      if (probeIndex >= probes.length) {
        probes.push({ type: probeType })
      } else {
        probes[probeIndex]!.type = probeType
      }
      continue
    }

    if (trimmed.startsWith('pattern:') && currentSection === 'probes' && partIndex >= 0 && probeIndex >= 0) {
      let pattern = trimmed.slice(8).trim()
      if ((pattern.startsWith('"') && pattern.endsWith('"')) || (pattern.startsWith("'") && pattern.endsWith("'"))) {
        pattern = pattern.slice(1, -1)
      }
      const part = parts[partIndex]
      const probe = part?.probes[probeIndex]
      if (probe) probe.pattern = pattern
      continue
    }

    if (trimmed.startsWith('command:') && currentSection === 'probes' && partIndex >= 0 && probeIndex >= 0) {
      let command = trimmed.slice(8).trim()
      if ((command.startsWith('"') && command.endsWith('"')) || (command.startsWith("'") && command.endsWith("'"))) {
        command = command.slice(1, -1)
      }
      const part = parts[partIndex]
      const probe = part?.probes[probeIndex]
      if (probe) probe.command = command
      continue
    }

    if (currentSection === 'target' && partIndex >= 0) {
      if (trimmed.startsWith('description:')) {
        const part = parts[partIndex]
        if (part) {
          if (!part.target) part.target = { description: '' }
          part.target.description = trimmed.slice(12).trim()
        }
      }
      continue
    }

    if (currentSection === 'spec' && partIndex >= 0) {
      if (trimmed.startsWith('description:')) {
        const part = parts[partIndex]
        if (part) {
          if (!part.spec) part.spec = { description: '' }
          part.spec.description = trimmed.slice(12).trim()
        }
      }
    }
  }

  return { id, name, parts }
}

export function blueprintToPayload(parsed: ParsedBlueprint): BlueprintPayload {
  return {
    id: parsed.id,
    name: parsed.name,
    parts: parsed.parts,
  }
}
