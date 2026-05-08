import { mkdirSync, existsSync } from 'fs'
import {
  ARSENALS_PROBES_DRAFT,
  ARSENALS_PROBES_CANONICAL,
  ARSENALS_PROOFS_DRAFT,
  ARSENALS_PROOFS_CANONICAL,
  ARSENALS_STAGES_DRAFT,
  ARSENALS_STAGES_CANONICAL
} from './paths'

const ARSENALS_DIRECTORIES = [
  ARSENALS_PROBES_DRAFT,
  ARSENALS_PROBES_CANONICAL,
  ARSENALS_PROOFS_DRAFT,
  ARSENALS_PROOFS_CANONICAL,
  ARSENALS_STAGES_DRAFT,
  ARSENALS_STAGES_CANONICAL
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
