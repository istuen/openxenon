import { existsSync, readFileSync } from 'fs'
import type { BlueprintPayload, StagePayload } from '../types/daemon-payload'
import { getTaskDirectory, type TaskDirectory } from './task-dir'

export interface ParsedBlueprint {
  id: string
  name: string
  stages: StagePayload[]
}

export function readBlueprint(taskDir: TaskDirectory): ParsedBlueprint | null {
  if (!existsSync(taskDir.blueprintPath)) {
    return null
  }

  const content = readFileSync(taskDir.blueprintPath, 'utf-8')
  return parseBlueprintYaml(content)
}

export function parseBlueprintYaml(yaml: string): ParsedBlueprint {
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
      stages[stageIndex] = {
        id: stageId,
        name: '',
        deps: [],
        proof: { target: { description: '' }, spec: { description: '' }, probes: [] }
      }
      continue
    }

    if (trimmed.startsWith('name:') && currentSection === 'stage' && stageIndex >= 0) {
      stages[stageIndex].name = trimmed.slice(5).trim()
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
      stages[stageIndex].deps.push(dep)
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

    if (trimmed.startsWith('- type:') && currentSection === 'probes' && stageIndex >= 0) {
      probeIndex++
      const probeType = trimmed.slice(7).trim()
      stages[stageIndex].proof.probes[probeIndex] = { type: probeType }
      continue
    }

    if (trimmed.startsWith('pattern:') && currentSection === 'probes' && stageIndex >= 0 && probeIndex >= 0) {
      let pattern = trimmed.slice(8).trim()
      if ((pattern.startsWith('"') && pattern.endsWith('"')) ||
          (pattern.startsWith("'") && pattern.endsWith("'"))) {
        pattern = pattern.slice(1, -1)
      }
      stages[stageIndex].proof.probes[probeIndex].pattern = pattern
      continue
    }

    if (trimmed.startsWith('command:') && currentSection === 'probes' && stageIndex >= 0 && probeIndex >= 0) {
      let command = trimmed.slice(8).trim()
      if ((command.startsWith('"') && command.endsWith('"')) ||
          (command.startsWith("'") && command.endsWith("'"))) {
        command = command.slice(1, -1)
      }
      stages[stageIndex].proof.probes[probeIndex].command = command
      continue
    }

    if (currentSection === 'target' && stageIndex >= 0) {
      if (trimmed.startsWith('description:')) {
        stages[stageIndex].proof.target.description = trimmed.slice(12).trim()
      }
      continue
    }

    if (currentSection === 'spec' && stageIndex >= 0) {
      if (trimmed.startsWith('description:')) {
        stages[stageIndex].proof.spec.description = trimmed.slice(12).trim()
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