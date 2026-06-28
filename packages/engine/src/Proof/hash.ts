/**
 * Proof module — hash utility (v0.6 PR-5c续)
 */
import { readFileSync } from '@openxenon/engine/infra/filesystem'
import { createHash } from 'crypto'
import type { FileHashResult } from './types'

export function computeFileHash(filePath: string): FileHashResult {
  const content = readFileSync(filePath)
  const hash = createHash('sha256').update(content).digest('hex')
  return { hash, filePath }
}
