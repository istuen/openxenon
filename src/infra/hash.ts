import { createHash } from 'crypto'
import type { HashPort } from '../kernel/contracts/hash-port'

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export const hashPort: HashPort = {
  computeHash: computeContentHash,
}
