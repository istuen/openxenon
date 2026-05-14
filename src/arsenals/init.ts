import { mkdirSync, existsSync } from 'fs'
import { ARSENALS_PROBES, ARSENALS_STAGES, ARSENALS_BLUEPRINTS } from './paths'

const ARSENALS_DIRECTORIES = [
  ARSENALS_PROBES,
  ARSENALS_STAGES,
  ARSENALS_BLUEPRINTS
]

export function ensureArsenalsDirectories(): void {
  for (const dir of ARSENALS_DIRECTORIES) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function isArsenalsDirectoryReady(): boolean {
  return ARSENALS_DIRECTORIES.every(dir => existsSync(dir))
}
