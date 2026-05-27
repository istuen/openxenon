import { createHash } from 'crypto'

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}
