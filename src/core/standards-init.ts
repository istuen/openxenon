import { mkdirSync, existsSync } from 'fs'
import {
  STANDARDS_PROBES_DRAFT,
  STANDARDS_PROBES_CANONICAL,
  STANDARDS_PROOFS_DRAFT,
  STANDARDS_PROOFS_CANONICAL,
  STANDARDS_STAGES_DRAFT,
  STANDARDS_STAGES_CANONICAL
} from './standards-paths'

const STANDARD_DIRECTORIES = [
  STANDARDS_PROBES_DRAFT,
  STANDARDS_PROBES_CANONICAL,
  STANDARDS_PROOFS_DRAFT,
  STANDARDS_PROOFS_CANONICAL,
  STANDARDS_STAGES_DRAFT,
  STANDARDS_STAGES_CANONICAL
]

export function ensureStandardsDirectories(): void {
  for (const dir of STANDARD_DIRECTORIES) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

export function isStandardsDirectoryReady(): boolean {
  return STANDARD_DIRECTORIES.every(dir => existsSync(dir))
}