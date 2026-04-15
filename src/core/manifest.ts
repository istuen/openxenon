import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { StepManifest } from '../types'

export function readStepManifest(manifestPath: string): StepManifest | null {
  if (!existsSync(manifestPath)) {
    return null
  }
  
  try {
    const content = readFileSync(manifestPath, 'utf-8')
    return JSON.parse(content) as StepManifest
  } catch {
    return null
  }
}

export function writeStepManifest(manifestPath: string, manifest: StepManifest): void {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

export function createEmptyStepManifest(taskId: string): StepManifest {
  return {
    taskId,
    stepId: '',
    status: 'pending',
    artifacts: [],
    timestamp: Date.now()
  }
}
