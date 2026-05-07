import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'fs'
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
  const tmpPath = manifestPath + '.tmp'
  const content = JSON.stringify(manifest, null, 2)

  try {
    writeFileSync(tmpPath, content, 'utf-8')
    if (process.platform === 'win32' && existsSync(manifestPath)) {
      unlinkSync(manifestPath)
    }
    renameSync(tmpPath, manifestPath)
  } catch (error) {
    if (existsSync(tmpPath)) {
      try { unlinkSync(tmpPath) } catch { /* ignore cleanup error */ }
    }
    throw error
  }
}

export function createEmptyStepManifest(taskId: string): StepManifest {
  return {
    taskId,
    stepId: '',
    status: 'PENDING',
    artifacts: []
  }
}
