import { mkdirSync, existsSync } from 'fs'
import { ARSENALS_PROBES, ARSENALS_STAGES, ARSENALS_BLUEPRINTS, FORGES_PROBES, FORGES_STAGES, FORGES_BLUEPRINTS } from './paths'

const ARSENALS_DIRECTORIES = [
  ARSENALS_PROBES,
  ARSENALS_STAGES,
  ARSENALS_BLUEPRINTS
]

const FORGES_DIRECTORIES = [
  FORGES_PROBES,
  FORGES_STAGES,
  FORGES_BLUEPRINTS
]

export function ensureArsenalsDirectories(): void {
  for (const dir of ARSENALS_DIRECTORIES) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function ensureForgesDirectories(): void {
  for (const dir of FORGES_DIRECTORIES) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function isArsenalsDirectoryReady(): boolean {
  return ARSENALS_DIRECTORIES.every(dir => existsSync(dir))
}
