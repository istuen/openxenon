import type { BlueprintPayload, StagePayload } from '../../daemon/types/daemon-payload'

export interface ParsedBlueprint {
  id: string
  name: string
  stages: StagePayload[]
}

export function parseBlueprintYaml(yaml: string): ParsedBlueprint {
  const trimmed = yaml.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      return {
        id: parsed.id || '',
        name: parsed.name || '',
        stages: (parsed.stages || []).map((s: any) => ({
          id: s.id || '',
          name: s.name || '',
          deps: s.deps || [],
          proof: {
            target: { description: s.proof?.target?.description || '' },
            spec: { description: s.proof?.spec?.description || '' },
            probes: (s.proof?.probes || []).map((p: any) => ({
              type: p.type || '',
              ...(p.params?.path ? { pattern: p.params.path } : {}),
              ...(p.params?.command ? { command: p.params.command } : {})
            }))
          }
        }))
      }
    } catch {
      // Fall through to YAML parser
    }
  }

  const lines = yaml.split('\n')
  let id = ''
  let name = ''
  const stages: StagePayload[] = []

  let currentSection: 'root' | 'stage' | 'proof' | 'probes' | 'target' | 'spec' | 'probe' = 'root'
  let stageIndex = -1
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

    if (trimmed === 'stages:') {
      currentSection = 'stage'
      continue
    }

    if (trimmed.startsWith('- id:') && currentSection === 'stage') {
      stageIndex++
      probeIndex = -1
      const stageId = trimmed.slice(5).trim()
      if (stageIndex >= stages.length) {
        stages.push({
          id: stageId,
          name: '',
          deps: [],
          proof: { target: { description: '' }, spec: { description: '' }, probes: [] }
        })
      } else {
        stages[stageIndex]!.id = stageId
        stages[stageIndex]!.name = ''
        stages[stageIndex]!.deps = []
        stages[stageIndex]!.proof.probes = []
      }
      continue
    }

    if (trimmed.startsWith('- id:') && currentSection === 'probes' && stageIndex >= 0) {
      stageIndex++
      probeIndex = -1
      currentSection = 'stage'
      const stageId = trimmed.slice(5).trim()
      if (stageIndex >= stages.length) {
        stages.push({
          id: stageId,
          name: '',
          deps: [],
          proof: { target: { description: '' }, spec: { description: '' }, probes: [] }
        })
      } else {
        stages[stageIndex]!.id = stageId
        stages[stageIndex]!.name = ''
        stages[stageIndex]!.deps = []
        stages[stageIndex]!.proof.probes = []
      }
      continue
    }

    if (trimmed.startsWith('name:') && currentSection === 'stage' && stageIndex >= 0) {
      const stage = stages[stageIndex]
      if (stage) stage.name = trimmed.slice(5).trim()
      continue
    }

    if (trimmed.startsWith('deps:') && currentSection === 'stage' && stageIndex >= 0) {
      continue
    }

    if (trimmed === 'proof:' && stageIndex >= 0) {
      currentSection = 'proof'
      continue
    }

    if (trimmed.startsWith('- ') && currentSection === 'stage' && stageIndex >= 0) {
      const dep = trimmed.slice(2).trim()
      const stage = stages[stageIndex]
      if (stage) stage.deps.push(dep)
      continue
    }

    if (trimmed === 'proof:') {
      currentSection = 'proof'
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

    if (trimmed.startsWith('deps:') && currentSection === 'probes' && stageIndex >= 0) {
      currentSection = 'stage'
      continue
    }

    if (trimmed.startsWith('- type:') && currentSection === 'probes' && stageIndex >= 0) {
      probeIndex++
      const probeType = trimmed.slice(7).trim()
      const stage = stages[stageIndex]
      if (!stage) continue
      const probes = stage.proof.probes
      if (probeIndex >= probes.length) {
        probes.push({ type: probeType })
      } else {
        probes[probeIndex]!.type = probeType
      }
      continue
    }

    if (trimmed.startsWith('pattern:') && currentSection === 'probes' && stageIndex >= 0 && probeIndex >= 0) {
      let pattern = trimmed.slice(8).trim()
      if ((pattern.startsWith('"') && pattern.endsWith('"')) ||
          (pattern.startsWith("'") && pattern.endsWith("'"))) {
        pattern = pattern.slice(1, -1)
      }
      const stage = stages[stageIndex]
      const probe = stage?.proof.probes[probeIndex]
      if (probe) probe.pattern = pattern
      continue
    }

    if (trimmed.startsWith('command:') && currentSection === 'probes' && stageIndex >= 0 && probeIndex >= 0) {
      let command = trimmed.slice(8).trim()
      if ((command.startsWith('"') && command.endsWith('"')) ||
          (command.startsWith("'") && command.endsWith("'"))) {
        command = command.slice(1, -1)
      }
      const stage = stages[stageIndex]
      const probe = stage?.proof.probes[probeIndex]
      if (probe) probe.command = command
      continue
    }

    if (currentSection === 'target' && stageIndex >= 0) {
      if (trimmed.startsWith('description:')) {
        const stage = stages[stageIndex]
        if (stage) stage.proof.target.description = trimmed.slice(12).trim()
      }
      continue
    }

    if (currentSection === 'spec' && stageIndex >= 0) {
      if (trimmed.startsWith('description:')) {
        const stage = stages[stageIndex]
        if (stage) stage.proof.spec.description = trimmed.slice(12).trim()
      }
      continue
    }
  }

  return { id, name, stages }
}

export function blueprintToPayload(parsed: ParsedBlueprint): BlueprintPayload {
  return {
    id: parsed.id,
    name: parsed.name,
    stages: parsed.stages
  }
}